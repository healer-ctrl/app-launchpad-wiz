-- Device tokens for push notifications
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL UNIQUE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_tokens_enabled ON public.device_tokens (enabled) WHERE enabled = true;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- No auth in app yet — allow public upsert/delete keyed by install_id
CREATE POLICY "Anyone can register a device token"
  ON public.device_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their device token"
  ON public.device_tokens FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete their device token"
  ON public.device_tokens FOR DELETE
  USING (true);

CREATE POLICY "Service role full access on device_tokens"
  ON public.device_tokens FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable pg_net to invoke edge function from trigger
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger that fires send-push on new report_summaries
CREATE OR REPLACE FUNCTION public.notify_new_report_summary()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fn_url text;
BEGIN
  fn_url := 'https://pygsmujlhvyubrqnbwwq.supabase.co/functions/v1/send-push';
  PERFORM net.http_post(
    url := fn_url,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('summary_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_report_summary
  AFTER INSERT ON public.report_summaries
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_report_summary();