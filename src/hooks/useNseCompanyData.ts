import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NseFinancials {
  last_price: string | null;
  change_pct: string | null;
  market_cap: string | null;
  week52_high: string | null;
  week52_low: string | null;
  pe_ratio: string | null;
  pb_ratio: string | null;
  div_yield: string | null;
  face_value: string | null;
  eps: string | null;
  sector_pe: string | null;
  fetched_at: string;
  source: string;
}

export interface NseCorporateAction {
  id: string;
  action_type: string;
  purpose: string | null;
  ex_date: string | null;
  record_date: string | null;
  details: string | null;
}

export interface NseCompanyData {
  financials: NseFinancials | null;
  corporateActions: NseCorporateAction[];
}

const STALE_MS = 24 * 60 * 60 * 1000;

export function useNseCompanyData(companyId: string | undefined, enabled: boolean) {
  return useQuery<NseCompanyData>({
    queryKey: ["nse-company", companyId],
    enabled: !!companyId && enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!companyId) return { financials: null, corporateActions: [] };

      // Read cache first
      const [{ data: fin }, { data: ca }] = await Promise.all([
        supabase.from("nse_financials").select("*").eq("company_id", companyId).maybeSingle(),
        supabase
          .from("nse_corporate_actions")
          .select("id, action_type, purpose, ex_date, record_date, details")
          .eq("company_id", companyId)
          .order("ex_date", { ascending: false, nullsFirst: false })
          .limit(20),
      ]);

      const fresh = fin && Date.now() - new Date(fin.fetched_at).getTime() < STALE_MS;
      if (fresh) {
        return { financials: fin as NseFinancials, corporateActions: (ca ?? []) as NseCorporateAction[] };
      }

      // Trigger fetch
      const { data, error } = await supabase.functions.invoke("fetch-nse-company", {
        body: { company_id: companyId },
      });
      if (error) {
        console.error("fetch-nse-company failed", error);
        // Fall back to whatever cache we have
        return { financials: (fin as any) ?? null, corporateActions: (ca ?? []) as NseCorporateAction[] };
      }
      return {
        financials: data?.financials ?? null,
        corporateActions: data?.corporateActions ?? [],
      };
    },
  });
}
