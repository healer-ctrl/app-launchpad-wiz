
CREATE TABLE public.nse_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  last_price text,
  change_pct text,
  market_cap text,
  week52_high text,
  week52_low text,
  pe_ratio text,
  pb_ratio text,
  div_yield text,
  face_value text,
  eps text,
  sector_pe text,
  source text NOT NULL DEFAULT 'nse_api',
  raw jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);
GRANT SELECT ON public.nse_financials TO anon, authenticated;
GRANT ALL ON public.nse_financials TO service_role;
ALTER TABLE public.nse_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view nse_financials" ON public.nse_financials FOR SELECT USING (true);
CREATE POLICY "Service role full access on nse_financials" ON public.nse_financials FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_nse_financials_touch BEFORE UPDATE ON public.nse_financials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.nse_corporate_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  action_type text NOT NULL,
  purpose text,
  ex_date date,
  record_date date,
  details text,
  source text NOT NULL DEFAULT 'nse_api',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nse_corporate_actions TO anon, authenticated;
GRANT ALL ON public.nse_corporate_actions TO service_role;
ALTER TABLE public.nse_corporate_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view nse_corporate_actions" ON public.nse_corporate_actions FOR SELECT USING (true);
CREATE POLICY "Service role full access on nse_corporate_actions" ON public.nse_corporate_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_nse_ca_company ON public.nse_corporate_actions(company_id, ex_date DESC);
