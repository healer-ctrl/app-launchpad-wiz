
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,
  description text,
  founded text,
  headquarters text,
  ceo text,
  employees text,
  industry text,
  founding_story text,
  milestones jsonb DEFAULT '[]'::jsonb,
  key_products jsonb DEFAULT '[]'::jsonb,
  competitors jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view company_profiles"
  ON public.company_profiles FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on company_profiles"
  ON public.company_profiles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS company_profiles_company_id_idx ON public.company_profiles(company_id);
