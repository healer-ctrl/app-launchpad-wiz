
-- Create app_config key-value table for settings like nse_last_polled
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app_config" ON public.app_config
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role full access on app_config" ON public.app_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert default nse_last_polled
INSERT INTO public.app_config (key, value) VALUES ('nse_last_polled', 'never')
ON CONFLICT (key) DO NOTHING;

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
