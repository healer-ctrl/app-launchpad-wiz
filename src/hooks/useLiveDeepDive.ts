import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiveCompanyProfile {
  id: string;
  company_id: string;
  description: string | null;
  founded: string | null;
  headquarters: string | null;
  ceo: string | null;
  employees: string | null;
  industry: string | null;
  founding_story: string | null;
  milestones: string[];
  key_products: string[];
  competitors: string[];
}

export interface LiveQuarterlyPoint {
  quarter: string;
  revenue: number;
  netProfit: number;
  eps: number;
}

export interface LiveDeepDive {
  profile: LiveCompanyProfile | null;
  timeline: LiveQuarterlyPoint[];
  latestSummary: any | null;
}

/** Convert formatted strings like "$124.3B", "₹2.7L Cr", "₹19,878 Cr" to a comparable number. */
function parseNumeric(value: string | null | undefined): number {
  if (!value) return 0;
  const s = value.replace(/[₹$,]/g, "").trim();
  // Detect Indian "Lakh Crore" and "Crore" suffixes
  const lcMatch = s.match(/([\d.]+)\s*(L\s*Cr|Lakh\s*Cr|Cr|Crore|B|Bn|M|Mn|K)?/i);
  if (!lcMatch) return parseFloat(s) || 0;
  const num = parseFloat(lcMatch[1]) || 0;
  const unit = (lcMatch[2] || "").toLowerCase().replace(/\s+/g, "");
  if (unit.startsWith("lcr") || unit.startsWith("lakhcr")) return num * 100000; // ₹ Cr
  if (unit === "cr" || unit === "crore") return num;
  if (unit === "b" || unit === "bn") return num * 1000; // $B → represent in $M-ish unit, but we just need relative scale
  if (unit === "m" || unit === "mn") return num;
  if (unit === "k") return num / 1000;
  return num;
}

async function ensureProfile(companyId: string): Promise<LiveCompanyProfile | null> {
  const { data: existing } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (existing) return existing as any;

  // Lazy-trigger generation
  const { data, error } = await supabase.functions.invoke("generate-company-profile", {
    body: { company_id: companyId },
  });
  if (error) {
    console.error("Profile generation failed:", error);
    return null;
  }
  return (data?.profile as LiveCompanyProfile) ?? null;
}

async function fetchTimeline(companyId: string): Promise<LiveQuarterlyPoint[]> {
  const { data, error } = await supabase
    .from("report_summaries")
    .select("quarter, revenue, profit, eps, processed_at")
    .eq("company_id", companyId)
    .order("processed_at", { ascending: false })
    .limit(4);
  if (error || !data) return [];
  return data
    .slice()
    .reverse()
    .map((r: any) => ({
      quarter: r.quarter || "",
      revenue: parseNumeric(r.revenue),
      netProfit: parseNumeric(r.profit),
      eps: parseFloat((r.eps || "0").replace(/[^-\d.]/g, "")) || 0,
    }));
}

export function useLiveDeepDive(companyId: string | undefined, enabled: boolean) {
  return useQuery<LiveDeepDive>({
    queryKey: ["deep-dive-live", companyId],
    enabled: !!companyId && enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!companyId) return { profile: null, timeline: [], latestSummary: null };
      const [profile, timeline, latest] = await Promise.all([
        ensureProfile(companyId),
        fetchTimeline(companyId),
        supabase
          .from("report_summaries")
          .select("*")
          .eq("company_id", companyId)
          .order("processed_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then((r) => r.data),
      ]);
      return { profile, timeline, latestSummary: latest };
    },
  });
}
