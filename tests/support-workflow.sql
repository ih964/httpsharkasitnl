-- Run as the database administrator. All fixtures and events roll back; no mail is sent.
BEGIN;
DO $$
DECLARE c uuid; t uuid; u uuid:=gen_random_uuid(); n int;
BEGIN
 SELECT id INTO c FROM public.customers LIMIT 1;
 IF c IS NULL THEN RAISE EXCEPTION 'Test needs an existing customer reference'; END IF;
 INSERT INTO public.support_tickets(customer_id,created_by,requester_email,subject,description,category)
 VALUES(c,u,'support-test@example.invalid','Technische rollbacktest','Uitsluitend verificatie zonder verzending','security') RETURNING id INTO t;
 PERFORM set_config('harkas.test_ticket',t::text,true);
 INSERT INTO public.support_portal_access(customer_id,customer_label,email) VALUES(c,'Rollback test','support-test@example.invalid');
 IF (SELECT treatment_group FROM public.support_tickets WHERE id=t)<>'security' THEN RAISE EXCEPTION 'routing failed'; END IF;
 IF (SELECT count(*) FROM public.support_email_events WHERE ticket_id=t)<>2 THEN RAISE EXCEPTION 'creation pair failed'; END IF;
 INSERT INTO public.support_ticket_messages(ticket_id,author_id,sender_type,body,is_internal) VALUES(t,u,'medewerker','Intern geheim: nooit naar klant',true);
 IF (SELECT count(*) FROM public.support_email_events WHERE ticket_id=t)<>2 THEN RAISE EXCEPTION 'internal leak'; END IF;
 UPDATE public.support_tickets SET status='wacht_op_klant',due_at=now()+interval '1 day',treatment_group='cloud',sla_label='Test afspraak' WHERE id=t;
 IF (SELECT count(*) FROM public.support_email_events WHERE ticket_id=t)<>10 THEN RAISE EXCEPTION 'field notification coverage failed'; END IF;
 INSERT INTO public.support_ticket_messages(ticket_id,author_id,sender_type,body,is_internal) VALUES(t,u,'klant','Klant heeft gereageerd',false);
 IF (SELECT status FROM public.support_tickets WHERE id=t)<>'in_behandeling' THEN RAISE EXCEPTION 'reopen failed'; END IF;
 IF (SELECT count(*) FROM public.support_email_events WHERE ticket_id=t)<>14 THEN RAISE EXCEPTION 'reply or status mail missing'; END IF;
 IF (SELECT count(*) FROM public.support_ticket_history WHERE ticket_id=t)<>7 THEN RAISE EXCEPTION 'history cardinality failed'; END IF;
 UPDATE public.support_tickets SET status=status WHERE id=t;
 IF (SELECT count(*) FROM public.support_email_events WHERE ticket_id=t)<>14 THEN RAISE EXCEPTION 'no-op mail'; END IF;
 INSERT INTO public.support_knowledge(title,body,published) VALUES ('Rollback article','Publiek testartikel voor portaal',true),('Intern testartikel','Deze inhoud blijft alleen intern',false);
 IF has_table_privilege('anon','public.support_knowledge','select') OR has_table_privilege('authenticated','public.support_email_events','select') THEN RAISE EXCEPTION 'unexpected privilege'; END IF;
END $$;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'email','support-test@example.invalid','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.support_tickets WHERE id=current_setting('harkas.test_ticket')::uuid)<>1 THEN RAISE EXCEPTION 'customer ticket access failed'; END IF;
 IF (SELECT count(*) FROM public.support_ticket_history WHERE ticket_id=current_setting('harkas.test_ticket')::uuid)<>7 THEN RAISE EXCEPTION 'customer history failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.support_ticket_messages WHERE ticket_id=current_setting('harkas.test_ticket')::uuid AND is_internal) THEN RAISE EXCEPTION 'private note leaked'; END IF;
 IF EXISTS(SELECT 1 FROM public.support_knowledge WHERE title='Intern testartikel') THEN RAISE EXCEPTION 'private knowledge leaked'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.support_knowledge WHERE title='Rollback article') THEN RAISE EXCEPTION 'published knowledge missing'; END IF;
 BEGIN
  PERFORM * FROM public.support_mail_status(current_setting('harkas.test_ticket')::uuid);
  RAISE EXCEPTION 'mail diagnostics should be forbidden';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'email','outsider@example.invalid','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.support_ticket_history WHERE ticket_id=current_setting('harkas.test_ticket')::uuid) THEN RAISE EXCEPTION 'cross tenant history leak'; END IF;
 IF EXISTS(SELECT 1 FROM public.support_knowledge WHERE title='Rollback article') THEN RAISE EXCEPTION 'unlinked account knowledge leak'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: notification coverage, no-op, routing, reopening, customer isolation, private notes/knowledge, mail diagnostics authorization' AS verification;
