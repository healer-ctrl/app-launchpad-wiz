import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── STEP 1: Hit NSE homepage to grab session cookies ──
    console.log("Step 1: Fetching NSE homepage for cookies…");
    const homeResp = await fetch("https://www.nseindia.com", {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    // Consume body to prevent resource leak
    await homeResp.text();

    const cookies = homeResp.headers.get("set-cookie") || "";
    if (!cookies) {
      console.warn("No cookies returned from NSE homepage");
    }

    // ── STEP 2: Fetch announcements API ──
    console.log("Step 2: Fetching NSE announcements…");
    const apiResp = await fetch(
      "https://www.nseindia.com/api/corporate-announcements?index=equities",
      {
        headers: {
          "User-Agent": UA,
          Cookie: cookies,
          Referer: "https://www.nseindia.com",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!apiResp.ok) {
      const body = await apiResp.text();
      console.error("NSE API error:", apiResp.status, body);
      throw new Error(`NSE API returned ${apiResp.status}`);
    }

    const announcements: any[] = await apiResp.json();
    console.log(`Received ${announcements.length} announcements`);

    // ── STEP 3: Filter & deduplicate ──
    const results: any[] = [];
    let skippedSeen = 0;
    let skippedFilter = 0;
    let skippedNoPdf = 0;

    for (const ann of announcements) {
      const symbol = ann.symbol || "";
      const anDt = ann.an_dt || ann.dt || "";
      const uid = `${symbol}_${anDt}`;
      const desc = (ann.desc || "").toLowerCase();

      // Check seen_announcements — skip if already processed
      const { data: seen } = await supabase
        .from("seen_announcements")
        .select("id")
        .eq("uid", uid)
        .maybeSingle();

      if (seen) {
        skippedSeen++;
        continue;
      }

      // Only process financial results / board meeting outcomes
      const isFinancial =
        desc.includes("financial result") ||
        desc.includes("outcome of board meeting");
      const isClarification = desc.includes("clarification");

      if (!isFinancial || isClarification) {
        skippedFilter++;
        continue;
      }

      // Resolve PDF URL
      let pdfUrl: string | null = null;

      if (ann.attchmntFile) {
        pdfUrl = ann.attchmntFile;
      } else if (
        ann.attchmntText &&
        typeof ann.attchmntText === "string" &&
        ann.attchmntText.toLowerCase().endsWith(".pdf")
      ) {
        pdfUrl = `https://archives.nseindia.com/corporate/${ann.attchmntText}`;
      }

      if (!pdfUrl) {
        skippedNoPdf++;
        continue;
      }

      // Mark as seen
      await supabase.from("seen_announcements").insert({
        uid,
        symbol,
      });

      // Upsert company
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("ticker", symbol)
        .maybeSingle();

      let companyId: string;
      if (company) {
        companyId = company.id;
      } else {
        const { data: newCompany, error: companyErr } = await supabase
          .from("companies")
          .insert({
            name: ann.companyName || symbol,
            ticker: symbol,
            exchange: "NSE",
          })
          .select("id")
          .single();

        if (companyErr || !newCompany) {
          console.error(`Failed to insert company ${symbol}:`, companyErr);
          continue;
        }
        companyId = newCompany.id;
      }

      // Insert report
      const { data: report, error: reportErr } = await supabase
        .from("reports")
        .insert({
          company_id: companyId,
          quarter: ann.smIndustry || "Unknown",
          report_url: pdfUrl,
          uid,
          status: "pending",
        })
        .select("id")
        .single();

      if (reportErr || !report) {
        console.error(`Failed to insert report for ${symbol}:`, reportErr);
        continue;
      }

      results.push({
        symbol,
        uid,
        report_id: report.id,
        pdf_url: pdfUrl,
        company_id: companyId,
      });
    }

    console.log(
      `Done. Queued: ${results.length}, Skipped — seen: ${skippedSeen}, filter: ${skippedFilter}, noPdf: ${skippedNoPdf}`
    );

    // ── Trigger process-report for each new report ──
    for (const r of results) {
      try {
        const processResp = await fetch(
          `${supabaseUrl}/functions/v1/process-report`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ report_id: r.report_id }),
          }
        );
        const processBody = await processResp.text();
        console.log(
          `process-report ${r.symbol}: ${processResp.status} — ${processBody}`
        );
      } catch (err) {
        console.error(`process-report failed for ${r.symbol}:`, err);
      }
    }

    // ── Update nse_last_polled timestamp ──
    await supabase
      .from("app_config")
      .upsert({ key: "nse_last_polled", value: new Date().toISOString(), updated_at: new Date().toISOString() });

    return new Response(
      JSON.stringify({
        success: true,
        queued: results.length,
        skipped: { seen: skippedSeen, filter: skippedFilter, noPdf: skippedNoPdf },
        reports: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-nse-reports error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
