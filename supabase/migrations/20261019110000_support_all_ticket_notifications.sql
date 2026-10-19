-- Harkas IT: TOPdesk-style mail on every customer-visible ticket event.
-- Events are immutable snapshots and are queued in the same transaction as the ticket change.
-- Internal staff notes and internal files NEVER produce customer mail.

ALTER TABLE public.support_email_events
  ADD COLUMN IF NOT EXISTS recipient_type text NOT NULL DEFAULT 'staff';
ALTER TABLE public.support_email_events
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.support_email_events
  DROP CONSTRAINT IF EXISTS support_email_events_kind_check;
ALTER TABLE public.support_email_events
  ADD CONSTRAINT support_email_events_kind_check CHECK (kind IN (
    'created','customer_reply','staff_reply','status_changed',
    'priority_changed','assignee_changed','details_changed','attachment_added'
  ));
ALTER TABLE public.support_email_events
  DROP CONSTRAINT IF EXISTS support_email_events_recipient_type_check;
ALTER TABLE public.support_email_events
  ADD CONSTRAINT support_email_events_recipient_type_check
  CHECK (recipient_type IN ('staff','customer'));

-- One event per recipient: a customer acknowledgement and a staff audit email.
-- The message and original ticket values are captured at change time so retries
-- never send somebody else's latest reply or silently mutate the email content.
CREATE OR REPLACE FUNCTION public.support_enqueue_notification_pair(
  p_ticket_id uuid,
  p_actor_id uuid,
  p_kind text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.support_email_events (
    ticket_id, actor_id, kind, recipient_type, payload
  )
  SELECT t.id, p_actor_id, p_kind, recipients.recipient_type,
         pg_catalog.jsonb_build_object(
           'subject',t.subject,
           'requester_email',t.requester_email,
           'status',t.status,
           'priority',t.priority,
           'category',t.category
         ) || coalesce(p_details, '{}'::jsonb)
  FROM public.support_tickets t
  CROSS JOIN (VALUES ('staff'::text), ('customer'::text)) AS recipients(recipient_type)
  WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Support ticket missing when queuing notifications';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.support_enqueue_notification_pair(uuid,uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.support_queue_ticket_mail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := auth.uid();

  IF TG_TABLE_NAME = 'support_tickets' AND TG_OP = 'INSERT' THEN
    PERFORM public.support_enqueue_notification_pair(
      NEW.id, coalesce(v_actor, NEW.created_by), 'created',
      pg_catalog.jsonb_build_object('description',NEW.description)
    );

  ELSIF TG_TABLE_NAME = 'support_ticket_messages' AND TG_OP = 'INSERT' THEN
    IF NOT NEW.is_internal THEN
      PERFORM public.support_enqueue_notification_pair(
        NEW.ticket_id, coalesce(v_actor, NEW.author_id),
        CASE WHEN NEW.sender_type = 'klant' THEN 'customer_reply' ELSE 'staff_reply' END,
        pg_catalog.jsonb_build_object('message',NEW.body)
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'support_ticket_files' AND TG_OP = 'INSERT' THEN
    IF NOT NEW.is_internal THEN
      PERFORM public.support_enqueue_notification_pair(
        NEW.ticket_id, coalesce(v_actor, NEW.uploaded_by),
        'attachment_added',
        pg_catalog.jsonb_build_object('filename',NEW.original_name)
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'support_tickets' AND TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.support_enqueue_notification_pair(
        NEW.id, v_actor, 'status_changed',
        pg_catalog.jsonb_build_object('old',OLD.status,'new',NEW.status)
      );
    END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      PERFORM public.support_enqueue_notification_pair(
        NEW.id, v_actor, 'priority_changed',
        pg_catalog.jsonb_build_object('old',OLD.priority,'new',NEW.priority)
      );
    END IF;
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      PERFORM public.support_enqueue_notification_pair(
        NEW.id, v_actor, 'assignee_changed',
        pg_catalog.jsonb_build_object('old',OLD.assigned_to,'new',NEW.assigned_to)
      );
    END IF;
    IF OLD.subject IS DISTINCT FROM NEW.subject THEN
      PERFORM public.support_enqueue_notification_pair(
        NEW.id, v_actor, 'details_changed',
        pg_catalog.jsonb_build_object('field','onderwerp','old',OLD.subject,'new',NEW.subject)
      );
    END IF;
    IF OLD.category IS DISTINCT FROM NEW.category THEN
      PERFORM public.support_enqueue_notification_pair(
        NEW.id, v_actor, 'details_changed',
        pg_catalog.jsonb_build_object('field','categorie','old',OLD.category,'new',NEW.category)
      );
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      PERFORM public.support_enqueue_notification_pair(
        NEW.id, v_actor, 'details_changed',
        pg_catalog.jsonb_build_object('field','omschrijving','new',NEW.description)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.support_queue_ticket_mail()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS support_notify_ticket_created ON public.support_tickets;
CREATE TRIGGER support_notify_ticket_created
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_queue_ticket_mail();

DROP TRIGGER IF EXISTS support_notify_ticket_status ON public.support_tickets;
CREATE TRIGGER support_notify_ticket_status
AFTER UPDATE OF status, priority, assigned_to, subject, description, category ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_queue_ticket_mail();

DROP TRIGGER IF EXISTS support_notify_reply ON public.support_ticket_messages;
CREATE TRIGGER support_notify_reply
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.support_queue_ticket_mail();

DROP TRIGGER IF EXISTS support_notify_attachment ON public.support_ticket_files;
CREATE TRIGGER support_notify_attachment
AFTER INSERT ON public.support_ticket_files
FOR EACH ROW EXECUTE FUNCTION public.support_queue_ticket_mail();

-- No client can inspect or edit queued email content, only the server-side worker.
ALTER TABLE public.support_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_email_events FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
