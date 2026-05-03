import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardRegion = "all" | "india" | "us";

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
  profit: string;
  quarter: string;
}

export interface QuarterGroup {
  quarter: string;
  entries: LeaderboardEntry[];
}

function parseGrowth(g: string | null): number {
  if (!g) return 0;
  const n = parseFloat(g.replace(/[^-\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

// Normalize quarter labels like "Q4 FY26" / "Q4 FY2026" → "Q4 FY26"
function normalizeQuarter(q: string | null): string {
  if (!q) return "Unknown";
  return q
    .replace(/FY20(\d{2})/i, "FY$1")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
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

export function useLeaderboard(region: LeaderboardRegion = "all") {
  return useQuery({
    queryKey: ["leaderboard", region],
    queryFn: async (): Promise<QuarterGroup[]> => {
      const { data, error } = await supabase
        .from("report_summaries")
        .select(`
          id, company_id, headline, growth, revenue, profit, quarter, beat_or_miss,
          companies ( id, name, ticker, domain, exchange )
        `)
        .eq("beat_or_miss", "Beat")
        .order("processed_at", { ascending: false })
        .limit(500);

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
          growthValue: parseGrowth(row.growth),
          revenue: row.revenue || "",
          profit: row.profit || "",
          quarter,
        };
        if (!buckets.has(quarter)) buckets.set(quarter, []);
        buckets.get(quarter)!.push(entry);
      }

      // Dedupe per company per quarter (keep highest growth)
      const groups: QuarterGroup[] = [];
      for (const [quarter, entries] of buckets) {
        const byCompany = new Map<string, LeaderboardEntry>();
        for (const e of entries) {
          const prev = byCompany.get(e.companyId);
          if (!prev || e.growthValue > prev.growthValue) byCompany.set(e.companyId, e);
        }
        const top = Array.from(byCompany.values())
          .sort((a, b) => b.growthValue - a.growthValue)
          .slice(0, 5);
        if (top.length) groups.push({ quarter, entries: top });
      }

      groups.sort((a, b) => quarterSortKey(b.quarter) - quarterSortKey(a.quarter));
      return groups;
    },
    staleTime: 5 * 60 * 1000,
  });
}
