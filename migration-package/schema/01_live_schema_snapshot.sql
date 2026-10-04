-- Live schema snapshot of the source backend (exported read-only, 2026-10-04).
-- Run on the target AFTER a fresh project exists. Idempotent where practical.
-- NOTE: user_module_access / managed_users (referenced by the 2026-09-26 migrations
-- and app code) do NOT exist in the live source DB. They are created at the end.

-- ===== Extensions =====
create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ===== Enums =====
do $$ begin create type public.app_role as enum ('admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.domain_status as enum ('active','expiring','urgent','expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.domain_action_status as enum ('none','pending','extended','cancelled'); exception when duplicate_object then null; end $$;

-- ===== Tables =====
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, company_name text, email text, phone text, address text,
  postal_code text, city text, vat_number text, kvk_number text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.invoice_counters (
  invoice_year integer primary key,
  last_number integer not null default 0
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid references public.customers(id),
  invoice_date date not null default current_date,
  due_date date,
  status text not null default 'concept',
  source_type text not null default 'generated',
  invoice_year integer not null, invoice_month integer not null,
  subtotal numeric not null default 0, vat_total numeric not null default 0, total numeric not null default 0,
  notes text, pdf_storage_path text, original_filename text,
  uploaded_at timestamptz, sent_at timestamptz, paid_at timestamptz, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  has_damage boolean not null default false, damage_amount numeric not null default 0, damage_description text,
  emailed_at timestamptz, emailed_to text, emailed_cc text
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1, price numeric not null default 0,
  vat_percentage numeric not null default 21, subtotal numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  company_name text default 'Harkas IT', kvk text, vat_number text, iban text, address text, email text,
  logo_url text, default_vat numeric default 21, payment_terms integer default 30, invoice_footer_text text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null, reference_id uuid, description text,
  created_at timestamptz not null default now()
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  domain_name text not null,
  customer_id uuid references public.customers(id),
  customer_name text, customer_email text,
  expiry_date date not null, registrar text, notes text,
  auto_renew boolean not null default false,
  status public.domain_status not null default 'active',
  reminder_1_month_sent_at timestamptz, reminder_1_week_sent_at timestamptz,
  action_required boolean not null default false,
  action_status public.domain_action_status not null default 'none',
  renewal_price numeric not null default 0, last_invoiced_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id), customer_name text,
  work_date date not null default current_date, description text not null,
  hours numeric not null default 0, hourly_rate numeric not null default 0,
  status text not null default 'concept',
  invoice_id uuid references public.invoices(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  start_time time, end_time time, break_minutes numeric not null default 0
);

create table if not exists public.password_vault (
  id uuid primary key default gen_random_uuid(),
  title text not null, category text, website_url text, username text,
  encrypted_password text not null, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.keep_alive (
  id integer primary key,
  pinged_at timestamptz not null default now()
);

-- ===== Grants (required for the Data API) =====
grant select, insert, update, delete on
  public.user_roles, public.customers, public.invoice_counters, public.invoices, public.invoice_items,
  public.settings, public.activity_logs, public.domains, public.time_entries, public.password_vault, public.keep_alive
  to authenticated;
grant all on
  public.user_roles, public.customers, public.invoice_counters, public.invoices, public.invoice_items,
  public.settings, public.activity_logs, public.domains, public.time_entries, public.password_vault, public.keep_alive
  to service_role;

-- ===== Functions (exact source definitions) =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_year integer)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE next_num INT;
BEGIN
  INSERT INTO invoice_counters (invoice_year, last_number) VALUES (p_year, 1)
  ON CONFLICT (invoice_year) DO UPDATE SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO next_num;
  RETURN p_year || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- ===== Triggers =====
drop trigger if exists update_customers_updated_at on public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
drop trigger if exists update_invoices_updated_at on public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
drop trigger if exists update_settings_updated_at on public.settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
drop trigger if exists update_domains_updated_at on public.domains;
CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON public.domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
drop trigger if exists update_time_entries_updated_at on public.time_entries;
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
drop trigger if exists update_password_vault_updated_at on public.password_vault;
CREATE TRIGGER update_password_vault_updated_at BEFORE UPDATE ON public.password_vault FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== RLS =====
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.settings enable row level security;
alter table public.activity_logs enable row level security;
alter table public.domains enable row level security;
alter table public.time_entries enable row level security;
alter table public.password_vault enable row level security;
alter table public.keep_alive enable row level security;

CREATE POLICY "Admin access user_roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can check own role" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admin access invoice_counters" ON public.invoice_counters AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access customers" ON public.customers AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access invoices" ON public.invoices AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access invoice_items" ON public.invoice_items AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access settings" ON public.settings AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access activity_logs" ON public.activity_logs AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access domains" ON public.domains AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access time_entries" ON public.time_entries AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access password_vault" ON public.password_vault AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin access keep_alive" ON public.keep_alive AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== Storage buckets (no size limit, no MIME restriction in source) =====
insert into storage.buckets (id, name, public) values ('invoices','invoices', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('branding','branding', true) on conflict (id) do nothing;

CREATE POLICY "Admin can upload invoices" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'invoices'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admin can read invoices" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'invoices'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admin can update invoices" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'invoices'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admin can delete invoices" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'invoices'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Branding files are publicly accessible" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'branding'::text));
CREATE POLICY "Admins can upload branding files" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'branding'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can update branding files" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'branding'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can delete branding files" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'branding'::text) AND has_role(auth.uid(), 'admin'::app_role)));

-- ===== Missing-in-source objects the app code expects =====
-- Apply supabase/migrations/20260926182000_module_user_access.sql and
-- 20260926184000_all_module_access.sql from this package after this file.
