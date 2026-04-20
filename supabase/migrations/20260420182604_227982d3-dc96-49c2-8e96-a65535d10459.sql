-- Enums for domain status and action status
DO $$ BEGIN
  CREATE TYPE public.domain_status AS ENUM ('active', 'expiring', 'urgent', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.domain_action_status AS ENUM ('none', 'pending', 'extended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  expiry_date DATE NOT NULL,
  registrar TEXT,
  notes TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  status public.domain_status NOT NULL DEFAULT 'active',
  reminder_1_month_sent_at TIMESTAMPTZ,
  reminder_1_week_sent_at TIMESTAMPTZ,
  action_required BOOLEAN NOT NULL DEFAULT false,
  action_status public.domain_action_status NOT NULL DEFAULT 'none',
  renewal_price NUMERIC NOT NULL DEFAULT 0,
  last_invoiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domains_expiry_date ON public.domains(expiry_date);
CREATE INDEX IF NOT EXISTS idx_domains_customer_id ON public.domains(customer_id);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access domains"
  ON public.domains
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();