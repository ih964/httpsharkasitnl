CREATE TABLE IF NOT EXISTS public.support_login_attempts (
 email text PRIMARY KEY,
 requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_login_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_login_attempts TO service_role;
CREATE OR REPLACE FUNCTION public.claim_support_login(p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE claimed text;
BEGIN
 INSERT INTO public.support_login_attempts(email, requested_at) VALUES(p_email, now())
 ON CONFLICT(email) DO UPDATE SET requested_at=now()
 WHERE public.support_login_attempts.requested_at < now() - interval '60 seconds'
 RETURNING email INTO claimed;
 RETURN claimed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.claim_support_login(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_support_login(text) TO service_role;
