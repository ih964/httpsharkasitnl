-- Transactional notification queue for Harkas IT tickets.
-- Notifications are generated from database changes (never from untrusted email requests).
CREATE TABLE IF NOT EXISTS public.support_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id uuid,
  kind text NOT NULL CHECK (kind IN ('created','customer_reply','staff_reply','status_changed')),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 100),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_email_events_pending_idx
  ON public.support_email_events(state,next_attempt_at,created_at);
CREATE INDEX IF NOT EXISTS support_email_events_ticket_idx
  ON public.support_email_events(ticket_id,created_at);

ALTER TABLE public.support_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_email_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.support_queue_ticket_mail()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'support_tickets' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.support_email_events(ticket_id,actor_id,kind)
    VALUES (NEW.id,NEW.created_by,'created');
  ELSIF TG_TABLE_NAME = 'support_ticket_messages' AND TG_OP = 'INSERT' THEN
    IF NOT NEW.is_internal THEN
      INSERT INTO public.support_email_events(ticket_id,actor_id,kind)
      VALUES (NEW.ticket_id,NEW.author_id,CASE WHEN NEW.sender_type='klant' THEN 'customer_reply' ELSE 'staff_reply' END);
    END IF;
  ELSIF TG_TABLE_NAME = 'support_tickets' AND TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.support_email_events(ticket_id,actor_id,kind)
      VALUES (NEW.id,NULL,'status_changed');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.support_queue_ticket_mail() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS support_notify_ticket_created ON public.support_tickets;
CREATE TRIGGER support_notify_ticket_created AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_queue_ticket_mail();
DROP TRIGGER IF EXISTS support_notify_ticket_status ON public.support_tickets;
CREATE TRIGGER support_notify_ticket_status AFTER UPDATE OF status ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_queue_ticket_mail();
DROP TRIGGER IF EXISTS support_notify_reply ON public.support_ticket_messages;
CREATE TRIGGER support_notify_reply AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.support_queue_ticket_mail();

NOTIFY pgrst, 'reload schema';
