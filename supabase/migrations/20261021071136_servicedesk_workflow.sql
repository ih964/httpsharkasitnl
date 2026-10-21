-- Inspired by observed workflow patterns only. No ZGA customer/ticket data is copied.
ALTER TABLE public.support_tickets DROP CONSTRAINT support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check CHECK
 (status IN ('nieuw','toegewezen','in_behandeling','wacht_op_klant','wacht_op_leverancier','opgelost','gesloten'));
ALTER TABLE public.support_tickets
 ADD COLUMN treatment_group text NOT NULL DEFAULT 'servicedesk' CHECK (treatment_group IN ('servicedesk','cloud','werkplek','security','web','administratie')),
 ADD COLUMN due_at timestamptz,
 ADD COLUMN sla_label text CHECK (char_length(sla_label) BETWEEN 1 AND 160);
CREATE INDEX support_workqueue_idx ON public.support_tickets(treatment_group,due_at) WHERE status NOT IN ('opgelost','gesloten');

CREATE TABLE public.support_ticket_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
 kind text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_history_ticket_idx ON public.support_ticket_history(ticket_id,created_at);
ALTER TABLE public.support_ticket_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_ticket_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.support_ticket_history TO authenticated;
CREATE POLICY support_history_read ON public.support_ticket_history FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id));

-- Routes are operational defaults, never automatic promises about response/resolve times.
CREATE FUNCTION public.support_route_ticket() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 NEW.treatment_group := CASE NEW.category WHEN 'microsoft_365' THEN 'cloud' WHEN 'werkplek' THEN 'werkplek'
 WHEN 'security' THEN 'security' WHEN 'website' THEN 'web' WHEN 'facturatie' THEN 'administratie' ELSE 'servicedesk' END;
 NEW.due_at := NULL; NEW.sla_label := NULL;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.support_route_ticket() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER support_route_ticket BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.support_route_ticket();

CREATE TABLE public.support_knowledge (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
 category text NOT NULL DEFAULT 'overig' CHECK (category IN ('it_beheer','microsoft_365','werkplek','security','website','facturatie','overig')),
 body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 20000),
 published boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_knowledge ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_knowledge FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.support_knowledge TO authenticated;
CREATE POLICY support_knowledge_staff ON public.support_knowledge FOR ALL TO authenticated
 USING(public.has_module((SELECT auth.uid()),'tickets'))
 WITH CHECK(public.has_module((SELECT auth.uid()),'tickets'));
CREATE POLICY support_knowledge_customer ON public.support_knowledge FOR SELECT TO authenticated
 USING(published AND EXISTS(SELECT 1 FROM public.support_portal_access a WHERE lower(a.email)=lower((SELECT auth.jwt()->>'email'))));
CREATE TRIGGER support_knowledge_updated BEFORE UPDATE ON public.support_knowledge FOR EACH ROW EXECUTE FUNCTION public.support_ticket_updated();

-- No payloads, contact addresses or internal note content are exposed by this RPC.
CREATE FUNCTION public.support_mail_status(p_ticket_id uuid)
RETURNS TABLE(state text,total bigint) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT coalesce(public.has_module(auth.uid(),'tickets'),false) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT e.state,count(*) FROM public.support_email_events e WHERE e.ticket_id=p_ticket_id GROUP BY e.state;
END; $$;
REVOKE ALL ON FUNCTION public.support_mail_status(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.support_mail_status(uuid) TO authenticated;

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
  INSERT INTO public.support_ticket_history(ticket_id,kind,details)
  VALUES(p_ticket_id,p_kind,coalesce(p_details,'{}'::jsonb));
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
    IF OLD.treatment_group IS DISTINCT FROM NEW.treatment_group THEN
      PERFORM public.support_enqueue_notification_pair(NEW.id,v_actor,'details_changed',
        pg_catalog.jsonb_build_object('field','behandelgroep','old',OLD.treatment_group,'new',NEW.treatment_group));
    END IF;
    IF OLD.due_at IS DISTINCT FROM NEW.due_at THEN
      PERFORM public.support_enqueue_notification_pair(NEW.id,v_actor,'details_changed',
        pg_catalog.jsonb_build_object('field','streefdatum','old',OLD.due_at,'new',coalesce(NEW.due_at::text,'Niet ingesteld')));
    END IF;
    IF OLD.sla_label IS DISTINCT FROM NEW.sla_label THEN
      PERFORM public.support_enqueue_notification_pair(NEW.id,v_actor,'details_changed',
        pg_catalog.jsonb_build_object('field','serviceafspraak','old',OLD.sla_label,'new',coalesce(NEW.sla_label,'Geen serviceafspraak')));
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


DROP TRIGGER support_notify_ticket_status ON public.support_tickets;
CREATE TRIGGER support_notify_ticket_status AFTER UPDATE OF status,priority,assigned_to,subject,description,category,treatment_group,due_at,sla_label
 ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.support_queue_ticket_mail();

-- Customer replies revive tickets waiting for customer input or confirmation.
CREATE OR REPLACE FUNCTION public.support_touch_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='support_ticket_messages' AND NOT NEW.is_internal THEN
   UPDATE public.support_tickets SET last_activity_at=now(),updated_at=now(),
    status=CASE WHEN NEW.sender_type='klant' AND status IN ('wacht_op_klant','opgelost') THEN 'in_behandeling' ELSE status END
   WHERE id=NEW.ticket_id;
 ELSE
   UPDATE public.support_tickets SET last_activity_at=now(),updated_at=now() WHERE id=NEW.ticket_id;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.support_touch_ticket() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
