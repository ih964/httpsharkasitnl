-- Harkas IT support desk: isolated customer portal (email-verified, allowlisted).
-- Applies to the active Harkas Admin Supabase project. Never expose customer records through /api/ha-db.
ALTER TABLE public.user_module_access
  DROP CONSTRAINT IF EXISTS user_module_access_module_key_check;
ALTER TABLE public.user_module_access
  ADD CONSTRAINT user_module_access_module_key_check
  CHECK (module_key IN (
    'dashboard','invoices','factuur_maker','customers','domains','time_entries',
    'passwords','tankprijzen','parkeren','btw_overzicht','settings','tickets'
  ));

CREATE TABLE IF NOT EXISTS public.support_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_label text NOT NULL CHECK (char_length(customer_label) BETWEEN 1 AND 150),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254 AND email = btrim(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS support_access_customer_email_uidx
  ON public.support_portal_access (customer_id, lower(email));
CREATE INDEX IF NOT EXISTS support_access_email_idx ON public.support_portal_access (lower(email));

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL,
  requester_email text NOT NULL CHECK (char_length(requester_email) BETWEEN 5 AND 254),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 10000),
  category text NOT NULL DEFAULT 'overig' CHECK (category IN ('it_beheer','microsoft_365','werkplek','security','website','facturatie','overig')),
  priority text NOT NULL DEFAULT 'normaal' CHECK (priority IN ('laag','normaal','hoog','spoed')),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw','in_behandeling','wacht_op_klant','opgelost','gesloten')),
  assigned_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_customer_activity_idx
  ON public.support_tickets(customer_id,last_activity_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_activity_idx
  ON public.support_tickets(status,last_activity_at DESC);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('klant','medewerker')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx
  ON public.support_ticket_messages(ticket_id,created_at);

CREATE TABLE IF NOT EXISTS public.support_ticket_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL UNIQUE CHECK (char_length(storage_path) BETWEEN 60 AND 220),
  original_name text NOT NULL CHECK (char_length(original_name) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp','application/pdf','text/plain')),
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_files_ticket_idx ON public.support_ticket_files(ticket_id,created_at);

CREATE OR REPLACE FUNCTION public.support_touch_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_activity_at = now(), updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.support_touch_ticket() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS support_message_touch ON public.support_ticket_messages;
CREATE TRIGGER support_message_touch
AFTER INSERT ON public.support_ticket_messages FOR EACH ROW
EXECUTE FUNCTION public.support_touch_ticket();
DROP TRIGGER IF EXISTS support_file_touch ON public.support_ticket_files;
CREATE TRIGGER support_file_touch
AFTER INSERT ON public.support_ticket_files FOR EACH ROW
EXECUTE FUNCTION public.support_touch_ticket();

CREATE OR REPLACE FUNCTION public.support_ticket_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.support_ticket_updated() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS support_ticket_updated_at ON public.support_tickets;
CREATE TRIGGER support_ticket_updated_at
BEFORE UPDATE ON public.support_tickets FOR EACH ROW
EXECUTE FUNCTION public.support_ticket_updated();

ALTER TABLE public.support_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_files ENABLE ROW LEVEL SECURITY;

-- The support module is not the rest of Admin. Existing staff authorization stays untouched.
CREATE POLICY support_access_staff ON public.support_portal_access
  FOR ALL TO authenticated
  USING (public.has_module((SELECT auth.uid()), 'tickets'))
  WITH CHECK (public.has_module((SELECT auth.uid()), 'tickets'));
CREATE POLICY support_access_self ON public.support_portal_access
  FOR SELECT TO authenticated
  USING (lower(email) = lower((SELECT auth.jwt()->>'email')));

CREATE POLICY support_tickets_read ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    public.has_module((SELECT auth.uid()), 'tickets')
    OR EXISTS (
      SELECT 1 FROM public.support_portal_access a
      WHERE a.customer_id = support_tickets.customer_id
        AND lower(a.email) = lower((SELECT auth.jwt()->>'email'))
    )
  );
CREATE POLICY support_tickets_insert ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_module((SELECT auth.uid()), 'tickets')
    OR (
      created_by = (SELECT auth.uid())
      AND lower(requester_email) = lower((SELECT auth.jwt()->>'email'))
      AND status = 'nieuw'
      AND assigned_to IS NULL
      AND EXISTS (
        SELECT 1 FROM public.support_portal_access a
        WHERE a.customer_id = support_tickets.customer_id
          AND lower(a.email) = lower((SELECT auth.jwt()->>'email'))
      )
    )
  );
CREATE POLICY support_tickets_staff_update ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_module((SELECT auth.uid()), 'tickets'))
  WITH CHECK (public.has_module((SELECT auth.uid()), 'tickets'));

CREATE POLICY support_messages_read ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    public.has_module((SELECT auth.uid()), 'tickets')
    OR (
      NOT is_internal
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = support_ticket_messages.ticket_id
      )
    )
  );
CREATE POLICY support_messages_insert ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      public.has_module((SELECT auth.uid()), 'tickets')
      OR (
        sender_type = 'klant' AND NOT is_internal
        AND EXISTS (
          SELECT 1 FROM public.support_tickets t
          WHERE t.id = support_ticket_messages.ticket_id AND t.status <> 'gesloten'
            AND EXISTS (
              SELECT 1 FROM public.support_portal_access a
              WHERE a.customer_id = t.customer_id
                AND lower(a.email) = lower((SELECT auth.jwt()->>'email'))
            )
        )
      )
    )
  );

CREATE POLICY support_files_read ON public.support_ticket_files
  FOR SELECT TO authenticated
  USING (
    public.has_module((SELECT auth.uid()), 'tickets')
    OR (
      NOT is_internal AND EXISTS (
        SELECT 1 FROM public.support_tickets t WHERE t.id = support_ticket_files.ticket_id
      )
    )
  );
CREATE POLICY support_files_insert ON public.support_ticket_files
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND storage_path LIKE ticket_id::text || '/' || uploaded_by::text || '/%'
    AND (
      public.has_module((SELECT auth.uid()), 'tickets')
      OR (
        NOT is_internal AND EXISTS (
          SELECT 1 FROM public.support_tickets t
          WHERE t.id = support_ticket_files.ticket_id AND t.status <> 'gesloten'
            AND EXISTS (
              SELECT 1 FROM public.support_portal_access a
              WHERE a.customer_id = t.customer_id
                AND lower(a.email) = lower((SELECT auth.jwt()->>'email'))
            )
        )
      )
    )
  );

REVOKE ALL ON public.support_portal_access, public.support_tickets,
  public.support_ticket_messages, public.support_ticket_files FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.support_portal_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages, public.support_ticket_files TO authenticated;

-- A private storage bucket with no public file URLs; only ticket parties may read.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('support-attachments', 'support-attachments', false, 10485760,
  ARRAY['image/png','image/jpeg','image/webp','application/pdf','text/plain'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY support_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND split_part(name,'/',2) = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id::text = split_part(name,'/',1)
        AND (public.has_module((SELECT auth.uid()),'tickets')
          OR (t.status <> 'gesloten' AND EXISTS (
            SELECT 1 FROM public.support_portal_access a
            WHERE a.customer_id = t.customer_id
              AND lower(a.email) = lower((SELECT auth.jwt()->>'email'))
          )))
    )
  );
CREATE POLICY support_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND EXISTS (
      SELECT 1 FROM public.support_ticket_files f WHERE f.storage_path = name
    )
  );
CREATE POLICY support_storage_remove_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND split_part(name,'/',2) = (SELECT auth.uid())::text
  );

NOTIFY pgrst, 'reload schema';
