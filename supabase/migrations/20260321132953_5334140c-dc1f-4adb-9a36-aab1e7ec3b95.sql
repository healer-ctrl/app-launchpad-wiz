
-- 1. Add unique constraint on companies.ticker (column exists, constraint missing)
ALTER TABLE public.companies ADD CONSTRAINT companies_ticker_unique UNIQUE (ticker);

-- 2. Add uid column to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS uid text UNIQUE;

-- 3. Add quarter and sector columns to report_summaries
ALTER TABLE public.report_summaries ADD COLUMN IF NOT EXISTS quarter text;
ALTER TABLE public.report_summaries ADD COLUMN IF NOT EXISTS sector text;

-- 4. Create seen_announcements table
CREATE TABLE IF NOT EXISTS public.seen_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid text UNIQUE NOT NULL,
  symbol text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seen_announcements ENABLE ROW LEVEL SECURITY;

-- Public read on seen_announcements (optional, but consistent)
CREATE POLICY "Anyone can view seen_announcements" ON public.seen_announcements
  FOR SELECT TO public USING (true);

-- 5. Service role full access policies on all tables
CREATE POLICY "Service role full access on companies" ON public.companies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on reports" ON public.reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on report_summaries" ON public.report_summaries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on seen_announcements" ON public.seen_announcements
  FOR ALL TO service_role USING (true) WITH CHECK (true);
