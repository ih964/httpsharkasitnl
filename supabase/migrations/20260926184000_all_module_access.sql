-- Harkas IT: granular module access for shared users.
-- Safe to run whether or not the earlier 20260926182000 migration was already applied.

CREATE TABLE IF NOT EXISTS public.managed_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access managed_users" ON public.managed_users;
CREATE POLICY "Admin access managed_users"
ON public.managed_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_managed_users_updated_at ON public.managed_users;
CREATE TRIGGER update_managed_users_updated_at
BEFORE UPDATE ON public.managed_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_module_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL CHECK (module_key IN (
    'dashboard',
    'invoices',
    'factuur_maker',
    'customers',
    'domains',
    'time_entries',
    'passwords',
    'tankprijzen',
    'btw_overzicht',
    'settings'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_key)
);

ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access user_module_access" ON public.user_module_access;
CREATE POLICY "Admin access user_module_access"
ON public.user_module_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can read own module access" ON public.user_module_access;
CREATE POLICY "Users can read own module access"
ON public.user_module_access
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_module(_user_id UUID, _module_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_module_access
      WHERE user_id = _user_id
        AND module_key = _module_key
    )
$$;

-- Seed existing admins into the management overview.
INSERT INTO public.managed_users (user_id, email, display_name)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'display_name', ''), split_part(COALESCE(u.email, ''), '@', 1))
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id
WHERE r.role = 'admin'
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  display_name = COALESCE(public.managed_users.display_name, EXCLUDED.display_name);

-- Dashboard: read-only overview across the tables it uses.
DROP POLICY IF EXISTS "Module dashboard read customers" ON public.customers;
CREATE POLICY "Module dashboard read customers"
ON public.customers FOR SELECT TO authenticated
USING (public.has_module(auth.uid(), 'dashboard'));

DROP POLICY IF EXISTS "Module dashboard read invoices" ON public.invoices;
CREATE POLICY "Module dashboard read invoices"
ON public.invoices FOR SELECT TO authenticated
USING (public.has_module(auth.uid(), 'dashboard'));

DROP POLICY IF EXISTS "Module dashboard read domains" ON public.domains;
CREATE POLICY "Module dashboard read domains"
ON public.domains FOR SELECT TO authenticated
USING (public.has_module(auth.uid(), 'dashboard'));

-- Customers module: full customer management.
DROP POLICY IF EXISTS "Module customers manage customers" ON public.customers;
CREATE POLICY "Module customers manage customers"
ON public.customers FOR ALL TO authenticated
USING (public.has_module(auth.uid(), 'customers'))
WITH CHECK (public.has_module(auth.uid(), 'customers'));

-- Other modules that need customer lookup.
DROP POLICY IF EXISTS "Module customer lookup" ON public.customers;
CREATE POLICY "Module customer lookup"
ON public.customers FOR SELECT TO authenticated
USING (
  public.has_module(auth.uid(), 'invoices')
  OR public.has_module(auth.uid(), 'domains')
  OR public.has_module(auth.uid(), 'time_entries')
);

-- Invoices module: full invoice management.
DROP POLICY IF EXISTS "Module invoices manage invoices" ON public.invoices;
CREATE POLICY "Module invoices manage invoices"
ON public.invoices FOR ALL TO authenticated
USING (public.has_module(auth.uid(), 'invoices'))
WITH CHECK (public.has_module(auth.uid(), 'invoices'));

DROP POLICY IF EXISTS "Module invoices manage invoice_items" ON public.invoice_items;
CREATE POLICY "Module invoices manage invoice_items"
ON public.invoice_items FOR ALL TO authenticated
USING (public.has_module(auth.uid(), 'invoices'))
WITH CHECK (public.has_module(auth.uid(), 'invoices'));

DROP POLICY IF EXISTS "Module invoices manage invoice_counters" ON public.invoice_counters;
CREATE POLICY "Module invoices manage invoice_counters"
ON public.invoice_counters FOR ALL TO authenticated
USING (public.has_module(auth.uid(), 'invoices'))
WITH CHECK (public.has_module(auth.uid(), 'invoices'));

-- Domains and hours can create invoices from their own workflows.
DROP POLICY IF EXISTS "Module workflow read invoices" ON public.invoices;
CREATE POLICY "Module workflow read invoices"
ON public.invoices FOR SELECT TO authenticated
USING (
  public.has_module(auth.uid(), 'domains')
  OR public.has_module(auth.uid(), 'time_entries')
  OR public.has_module(auth.uid(), 'btw_overzicht')
);

DROP POLICY IF EXISTS "Module workflow insert invoices" ON public.invoices;
CREATE POLICY "Module workflow insert invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  public.has_module(auth.uid(), 'domains')
  OR public.has_module(auth.uid(), 'time_entries')
);

DROP POLICY IF EXISTS "Module workflow update invoices" ON public.invoices;
CREATE POLICY "Module workflow update invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (
  public.has_module(auth.uid(), 'domains')
  OR public.has_module(auth.uid(), 'time_entries')
)
WITH CHECK (
  public.has_module(auth.uid(), 'domains')
  OR public.has_module(auth.uid(), 'time_entries')
);

DROP POLICY IF EXISTS "Module workflow insert invoice_items" ON public.invoice_items;
CREATE POLICY "Module workflow insert invoice_items"
ON public.invoice_items FOR INSERT TO authenticated
WITH CHECK (
  public.has_module(auth.uid(), 'domains')
  OR public.has_module(auth.uid(), 'time_entries')
);

-- Domains module.
DROP POLICY IF EXISTS "Module domains manage domains" ON public.domains;
CREATE POLICY "Module domains manage domains"
ON public.domains FOR ALL TO authenticated
USING (public.has_module(auth.uid(), 'domains'))
WITH CHECK (public.has_module(auth.uid(), 'domains'));

-- Time entries module.
DROP POLICY IF EXISTS "Module time_entries manage time_entries" ON public.time_entries;
CREATE POLICY "Module time_entries manage time_entries"
ON public.time_entries FOR ALL TO authenticated
USING (public.has_module(auth.uid(), 'time_entries'))
WITH CHECK (public.has_module(auth.uid(), 'time_entries'));

-- Password vault module.
DROP POLICY IF EXISTS "Module passwords manage password_vault" ON public.password_vault;
CREATE POLICY "Module passwords manage password_vault"
ON public.password_vault FOR ALL TO authenticated
USING (public.has_module(auth.uid(), 'passwords'))
WITH CHECK (public.has_module(auth.uid(), 'passwords'));

-- Settings module.
DROP POLICY IF EXISTS "Module settings manage settings" ON public.settings;
CREATE POLICY "Module settings manage settings"
ON public.settings FOR ALL TO authenticated
USING (public.has_module(auth.uid(), 'settings'))
WITH CHECK (public.has_module(auth.uid(), 'settings'));

DROP POLICY IF EXISTS "Module time_entries read settings" ON public.settings;
CREATE POLICY "Module time_entries read settings"
ON public.settings FOR SELECT TO authenticated
USING (public.has_module(auth.uid(), 'time_entries'));

-- Activity logging from workflows.
DROP POLICY IF EXISTS "Module workflows insert activity_logs" ON public.activity_logs;
CREATE POLICY "Module workflows insert activity_logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (
  public.has_module(auth.uid(), 'invoices')
  OR public.has_module(auth.uid(), 'domains')
  OR public.has_module(auth.uid(), 'time_entries')
);

-- Storage for invoices.
DROP POLICY IF EXISTS "Module invoices upload invoice files" ON storage.objects;
CREATE POLICY "Module invoices upload invoice files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices' AND public.has_module(auth.uid(), 'invoices'));

DROP POLICY IF EXISTS "Module invoices read invoice files" ON storage.objects;
CREATE POLICY "Module invoices read invoice files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'invoices' AND public.has_module(auth.uid(), 'invoices'));

DROP POLICY IF EXISTS "Module invoices update invoice files" ON storage.objects;
CREATE POLICY "Module invoices update invoice files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'invoices' AND public.has_module(auth.uid(), 'invoices'))
WITH CHECK (bucket_id = 'invoices' AND public.has_module(auth.uid(), 'invoices'));

DROP POLICY IF EXISTS "Module invoices delete invoice files" ON storage.objects;
CREATE POLICY "Module invoices delete invoice files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'invoices' AND public.has_module(auth.uid(), 'invoices'));

-- Branding management.
DROP POLICY IF EXISTS "Module settings upload branding" ON storage.objects;
CREATE POLICY "Module settings upload branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.has_module(auth.uid(), 'settings'));

DROP POLICY IF EXISTS "Module settings update branding" ON storage.objects;
CREATE POLICY "Module settings update branding"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND public.has_module(auth.uid(), 'settings'))
WITH CHECK (bucket_id = 'branding' AND public.has_module(auth.uid(), 'settings'));

DROP POLICY IF EXISTS "Module settings delete branding" ON storage.objects;
CREATE POLICY "Module settings delete branding"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding' AND public.has_module(auth.uid(), 'settings'));

-- Restrict invoice-number generation now that non-admin authenticated users exist.
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_year INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INT;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_module(auth.uid(), 'invoices')
    OR public.has_module(auth.uid(), 'domains')
    OR public.has_module(auth.uid(), 'time_entries')
  ) THEN
    RAISE EXCEPTION 'Geen toegang om factuurnummers te genereren'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO invoice_counters (invoice_year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (invoice_year)
  DO UPDATE SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO next_num;

  RETURN p_year || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;
