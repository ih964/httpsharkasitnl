-- Add per-module access roles for shared Harkas IT tools.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'factuur_maker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tankprijzen';

-- Keep a small admin-only directory of accounts created for the portal.
CREATE TABLE IF NOT EXISTS public.managed_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_users ENABLE ROW LEVEL SECURITY;

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

-- Seed existing admins so the current owner also appears in the user manager.
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
