
-- 1. Remove public SELECT policy on report-pdfs storage objects
DROP POLICY IF EXISTS "Report PDFs are publicly readable" ON storage.objects;

-- 2. Remove unscoped public write policies on device_tokens.
--    All writes now go through the device-token edge function (service role).
DROP POLICY IF EXISTS "Anyone can register a device token" ON public.device_tokens;
DROP POLICY IF EXISTS "Anyone can update their device token" ON public.device_tokens;
DROP POLICY IF EXISTS "Anyone can delete their device token" ON public.device_tokens;

-- 3. Harden SECURITY DEFINER / trigger functions: pin search_path and
--    revoke EXECUTE from anon + authenticated. They are only meant to be
--    invoked as triggers or by service_role.
CREATE OR REPLACE FUNCTION public.notify_new_report_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

REVOKE ALL ON FUNCTION public.notify_new_report_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
