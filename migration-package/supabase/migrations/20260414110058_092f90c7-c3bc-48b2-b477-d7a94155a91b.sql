ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS emailed_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS emailed_to text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS emailed_cc text;