CREATE TABLE public.password_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  website_url text,
  username text,
  encrypted_password text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access password_vault"
ON public.password_vault
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_password_vault_updated_at
BEFORE UPDATE ON public.password_vault
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_password_vault_category ON public.password_vault(category);
CREATE INDEX idx_password_vault_title ON public.password_vault(title);