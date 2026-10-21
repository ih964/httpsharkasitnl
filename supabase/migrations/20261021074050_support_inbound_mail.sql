-- Mailbox credentials stay encrypted in Vault; raw messages/files are server-only.
CREATE TABLE harkas_support_private.mailbox (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), secret_id uuid NOT NULL,
 uid_validity text NOT NULL, last_uid bigint NOT NULL, configured_at timestamptz NOT NULL DEFAULT now(),
 last_checked_at timestamptz,last_error text
);
CREATE TABLE harkas_support_private.mail_refs (
 reference text PRIMARY KEY, event_id uuid NOT NULL REFERENCES public.support_email_events(id) ON DELETE CASCADE,
 ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE
);
CREATE TABLE harkas_support_private.inbound (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_key text NOT NULL UNIQUE,
 sender text NOT NULL, subject text NOT NULL, body text NOT NULL,
 status text NOT NULL DEFAULT 'review' CHECK(status IN ('review','imported','ignored')),
 reason text NOT NULL, ticket_id uuid REFERENCES public.support_tickets(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE harkas_support_private.inbound_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inbound_id uuid NOT NULL REFERENCES harkas_support_private.inbound(id) ON DELETE CASCADE,
 filename text NOT NULL,mime_type text NOT NULL,size_bytes integer NOT NULL,data bytea NOT NULL
);
CREATE INDEX support_inbound_files_idx ON harkas_support_private.inbound_files(inbound_id);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['mailbox','mail_refs','inbound','inbound_files'] LOOP
 EXECUTE format('ALTER TABLE harkas_support_private.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON harkas_support_private.%I FROM PUBLIC,anon,authenticated',t);
END LOOP; END $$;
-- The same authenticated worker now checks incoming mail each minute.
SELECT cron.alter_job(jobid,schedule:='* * * * *') FROM cron.job WHERE jobname='harkas-support-mail-retry';
