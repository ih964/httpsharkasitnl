
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin');

-- User roles table (must be created BEFORE has_role function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role security definer function (now user_roles exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles (uses has_role which now works)
CREATE POLICY "Admin access user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can check own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Invoice counters table
CREATE TABLE public.invoice_counters (
  invoice_year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access invoice_counters" ON public.invoice_counters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Generate invoice number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_year INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INT;
BEGIN
  INSERT INTO invoice_counters (invoice_year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (invoice_year)
  DO UPDATE SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO next_num;
  RETURN p_year || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  vat_number TEXT,
  kvk_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access customers" ON public.customers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'verzonden', 'betaald', 'vervallen')),
  source_type TEXT NOT NULL DEFAULT 'generated' CHECK (source_type IN ('generated', 'uploaded')),
  invoice_year INT NOT NULL,
  invoice_month INT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  pdf_storage_path TEXT,
  original_filename TEXT,
  uploaded_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Invoice items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_percentage NUMERIC(5,2) NOT NULL DEFAULT 21,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Settings table
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'Harkas IT',
  kvk TEXT,
  vat_number TEXT,
  iban TEXT,
  address TEXT,
  email TEXT,
  logo_url TEXT,
  default_vat NUMERIC(5,2) DEFAULT 21,
  payment_terms INT DEFAULT 30,
  invoice_footer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.settings (company_name, default_vat, payment_terms) VALUES ('Harkas IT', 21, 30);

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access activity_logs" ON public.activity_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);
CREATE POLICY "Admin can upload invoices" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can read invoices" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update invoices" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete invoices" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));
