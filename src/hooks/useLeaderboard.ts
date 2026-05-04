import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardRegion = "all" | "india" | "us";
export type LeaderboardMode = "beat" | "yoy" | "revenue" | "profit" | "eps";

export interface LeaderboardEntry {
  id: string;
  companyId: string;
  name: string;
  ticker: string;
  domain: string;
  exchange: string;
  headline: string;
  growth: string;
  growthValue: number;
  revenue: string;
  revenueValue: number;
  profit: string;
  profitValue: number;
  eps: string;
  epsValue: number;
  quarter: string;
  beatOrMiss: string;
}

export interface QuarterGroup {
  quarter: string;
  entries: LeaderboardEntry[];
}

function parseNum(s: string | null): number {
  if (!s) return 0;
  const str = String(s);
  // Pull first numeric (with optional sign / decimal) substring
  const m = str.match(/-?\d+(?:\.\d+)?/);
  if (!m) return 0;
  let n = parseFloat(m[0]);
  if (isNaN(n)) return 0;
  const lower = str.toLowerCase();
  if (/\bcr\b|crore/.test(lower)) n *= 1e7;
  else if (/\blakh|lac\b/.test(lower)) n *= 1e5;
  else if (/\bb\b|billion/.test(lower)) n *= 1e9;
  else if (/\bm\b|million/.test(lower)) n *= 1e6;
  return n;
}

function normalizeQuarter(q: string | null): string {
  if (!q) return "Unknown";
  return q.replace(/FY20(\d{2})/i, "FY$1").replace(/\s+/g, " ").trim().toUpperCase();
}

function quarterSortKey(q: string): number {
  const m = q.match(/Q([1-4]).*?FY(\d{2,4})/i);
  if (!m) return 0;
  const qn = parseInt(m[1], 10);
  let yr = parseInt(m[2], 10);
  if (yr < 100) yr += 2000;
  return yr * 10 + qn;
}

function matchesRegion(exchange: string | null, region: LeaderboardRegion): boolean {
  if (region === "all") return true;
  const ex = (exchange || "").toUpperCase();
  if (region === "india") return ex === "NSE" || ex === "BSE";
  if (region === "us") return ex === "NASDAQ" || ex === "NYSE";
  return true;
}

function rankValue(e: LeaderboardEntry, mode: LeaderboardMode): number {
  switch (mode) {
    case "yoy": return e.growthValue;
    case "revenue": return e.revenueValue;
    case "profit": return e.profitValue;
    case "eps": return e.epsValue;
    case "beat":
    default: return e.growthValue;
  }
}

export function useLeaderboard(region: LeaderboardRegion = "all", mode: LeaderboardMode = "beat") {
  return useQuery({
    queryKey: ["leaderboard", region, mode],
    queryFn: async (): Promise<QuarterGroup[]> => {
      let query = supabase
        .from("report_summaries")
        .select(`
          id, company_id, headline, growth, revenue, profit, eps, quarter, beat_or_miss,
          companies ( id, name, ticker, domain, exchange )
        `)
        .order("processed_at", { ascending: false })
        .limit(500);

      if (mode === "beat") query = query.eq("beat_or_miss", "Beat");

      const { data, error } = await query;
      if (error) throw error;

      const buckets = new Map<string, LeaderboardEntry[]>();
      for (const row of data || []) {
        const c: any = row.companies;
        if (!c) continue;
        if (!matchesRegion(c.exchange, region)) continue;
        const quarter = normalizeQuarter(row.quarter);
        const entry: LeaderboardEntry = {
          id: row.id,
          companyId: c.id,
          name: c.name,
          ticker: c.ticker,
          domain: c.domain || "",
          exchange: c.exchange || "",
          headline: row.headline || "",
          growth: row.growth || "",
          growthValue: parseNum(row.growth),
          revenue: row.revenue || "",
          revenueValue: parseNum(row.revenue),
          profit: row.profit || "",
          profitValue: parseNum(row.profit),
          eps: row.eps || "",
          epsValue: parseNum(row.eps),
          quarter,
          beatOrMiss: row.beat_or_miss || "",
        };
        if (!buckets.has(quarter)) buckets.set(quarter, []);
        buckets.get(quarter)!.push(entry);
      }

      const groups: QuarterGroup[] = [];
      for (const [quarter, entries] of buckets) {
        const byCompany = new Map<string, LeaderboardEntry>();
        for (const e of entries) {
          const prev = byCompany.get(e.companyId);
          if (!prev || rankValue(e, mode) > rankValue(prev, mode)) byCompany.set(e.companyId, e);
        }
        const top = Array.from(byCompany.values())
          .sort((a, b) => rankValue(b, mode) - rankValue(a, mode))
          .slice(0, 5);
        if (top.length) groups.push({ quarter, entries: top });
      }

      groups.sort((a, b) => quarterSortKey(b.quarter) - quarterSortKey(a.quarter));
      return groups;
    },
    staleTime: 5 * 60 * 1000,
  });
}
