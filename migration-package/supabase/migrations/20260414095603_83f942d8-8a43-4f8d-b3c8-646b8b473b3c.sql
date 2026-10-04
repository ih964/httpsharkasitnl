ALTER TABLE public.invoices
ADD COLUMN has_damage boolean NOT NULL DEFAULT false,
ADD COLUMN damage_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN damage_description text;