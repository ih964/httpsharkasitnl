CREATE TABLE IF NOT EXISTS public.keep_alive (
  id INT PRIMARY KEY,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.keep_alive (id, pinged_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access keep_alive"
ON public.keep_alive
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;