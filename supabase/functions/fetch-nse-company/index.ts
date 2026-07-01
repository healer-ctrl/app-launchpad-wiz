// Hybrid NSE data fetcher: tries NSE JSON APIs (cookie warm-up), falls back to Firecrawl.
// Caches results for 24h in nse_financials and nse_corporate_actions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CACHE_MS = 24 * 60 * 60 * 1000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function nseWarmup(): Promise<string | null> {
  try {
    const r = await fetch("https://www.nseindia.com/get-quotes/equity?symbol=RELIANCE", {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const setCookie = r.headers.get("set-cookie");
    return setCookie;
  } catch {
    return null;
  }
}

function extractCookies(setCookie: string | null): string {
  if (!setCookie) return "";
  // Deno concatenates multiple Set-Cookie headers with comma; parse conservatively.
  return setCookie
    .split(/,(?=\s*\w+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function nseJson(path: string, cookies: string): Promise<any | null> {
  try {
    const r = await fetch(`https://www.nseindia.com${path}`, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/get-quotes/equity",
        "Cookie": cookies,
      },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function firecrawlScrape(symbol: string): Promise<{ financials: any; ca: any[] } | null> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return null;
  const url = `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`;
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        onlyMainContent: false,
        waitFor: 3000,
        formats: [
          {
            type: "json",
            prompt:
              "Extract stock financial info and corporate actions for this NSE company. Return { financials: { lastPrice, changePct, marketCap, week52High, week52Low, peRatio, pbRatio, divYield, faceValue, eps, sectorPe }, corporateActions: [{ type, purpose, exDate (YYYY-MM-DD or null), recordDate (YYYY-MM-DD or null), details }] }. Include up to 20 most recent corporate actions.",
          },
        ],
      }),
    });
    const data = await r.json();
    const payload = data?.data?.json ?? data?.json ?? null;
    if (!payload) return null;
    return {
      financials: payload.financials ?? {},
      ca: Array.isArray(payload.corporateActions) ? payload.corporateActions : [],
    };
  } catch (e) {
    console.error("firecrawl failed", e);
    return null;
  }
}

function normalizePrice(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "number") return v.toLocaleString("en-IN");
  return String(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { company_id, force } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: company } = await supabase
      .from("companies")
      .select("id, ticker")
      .eq("id", company_id)
      .maybeSingle();
    if (!company) {
      return new Response(JSON.stringify({ error: "company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache
    if (!force) {
      const { data: cached } = await supabase
        .from("nse_financials")
        .select("*, fetched_at")
        .eq("company_id", company_id)
        .maybeSingle();
      if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_MS) {
        const { data: ca } = await supabase
          .from("nse_corporate_actions")
          .select("*")
          .eq("company_id", company_id)
          .order("ex_date", { ascending: false, nullsFirst: false })
          .limit(20);
        return new Response(
          JSON.stringify({ cached: true, financials: cached, corporateActions: ca ?? [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const symbol = company.ticker.toUpperCase();
    let source = "nse_api";
    let financials: any = null;
    let corporateActions: any[] = [];

    // 1) Try NSE JSON APIs
    const warm = await nseWarmup();
    const cookies = extractCookies(warm);
    if (cookies) {
      const quote = await nseJson(`/api/quote-equity?symbol=${encodeURIComponent(symbol)}`, cookies);
      const trade = await nseJson(
        `/api/quote-equity?symbol=${encodeURIComponent(symbol)}&section=trade_info`,
        cookies,
      );
      if (quote?.priceInfo) {
        financials = {
          lastPrice: normalizePrice(quote.priceInfo.lastPrice),
          changePct: quote.priceInfo.pChange != null ? `${quote.priceInfo.pChange.toFixed(2)}%` : null,
          week52High: normalizePrice(quote.priceInfo.weekHighLow?.max),
          week52Low: normalizePrice(quote.priceInfo.weekHighLow?.min),
          faceValue: normalizePrice(quote.securityInfo?.faceValue),
          marketCap: trade?.marketDeptOrderBook?.tradeInfo?.totalMarketCap
            ? `₹${(Number(trade.marketDeptOrderBook.tradeInfo.totalMarketCap) / 100).toFixed(2)} Cr`
            : null,
          peRatio: quote.metadata?.pdSectorPe ?? null,
          pbRatio: null,
          divYield: null,
          eps: null,
          sectorPe: quote.metadata?.pdSectorPe ?? null,
        };
      }
      const ca = await nseJson(
        `/api/corporates-corporateActions?index=equities&symbol=${encodeURIComponent(symbol)}`,
        cookies,
      );
      if (Array.isArray(ca)) {
        corporateActions = ca.slice(0, 20).map((row: any) => ({
          type: row.subject?.split(/\s|-/)[0] ?? "Action",
          purpose: row.subject ?? null,
          exDate: row.exDate ? parseNseDate(row.exDate) : null,
          recordDate: row.recDate ? parseNseDate(row.recDate) : null,
          details: row.subject ?? null,
          raw: row,
        }));
      }
    }

    // 2) Fallback: Firecrawl
    if (!financials || corporateActions.length === 0) {
      const fc = await firecrawlScrape(symbol);
      if (fc) {
        source = financials ? "nse_api+firecrawl" : "firecrawl";
        financials = financials ?? fc.financials;
        if (corporateActions.length === 0) {
          corporateActions = fc.ca.map((row: any) => ({
            type: row.type ?? "Action",
            purpose: row.purpose ?? null,
            exDate: row.exDate ?? null,
            recordDate: row.recordDate ?? null,
            details: row.details ?? null,
            raw: row,
          }));
        }
      }
    }

    if (!financials) {
      return new Response(
        JSON.stringify({ error: "Unable to fetch NSE data", symbol }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert financials
    const finRow = {
      company_id,
      symbol,
      last_price: financials.lastPrice,
      change_pct: financials.changePct,
      market_cap: financials.marketCap,
      week52_high: financials.week52High,
      week52_low: financials.week52Low,
      pe_ratio: financials.peRatio,
      pb_ratio: financials.pbRatio,
      div_yield: financials.divYield,
      face_value: financials.faceValue,
      eps: financials.eps,
      sector_pe: financials.sectorPe,
      source,
      raw: financials,
      fetched_at: new Date().toISOString(),
    };
    await supabase.from("nse_financials").upsert(finRow, { onConflict: "company_id" });

    // Replace CA rows
    await supabase.from("nse_corporate_actions").delete().eq("company_id", company_id);
    if (corporateActions.length > 0) {
      await supabase.from("nse_corporate_actions").insert(
        corporateActions.map((c) => ({
          company_id,
          symbol,
          action_type: c.type,
          purpose: c.purpose,
          ex_date: c.exDate,
          record_date: c.recordDate,
          details: c.details,
          source,
          raw: c.raw ?? c,
        })),
      );
    }

    return new Response(
      JSON.stringify({ cached: false, source, financials: finRow, corporateActions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("fetch-nse-company error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseNseDate(s: string): string | null {
  // NSE format: "12-Sep-2024"
  const m = s.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const mm = months[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}
