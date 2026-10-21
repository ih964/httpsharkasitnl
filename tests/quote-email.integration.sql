-- Source-database regression: verify the standby role/epoch first. All test writes roll back.
BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='20s';
SELECT role,epoch FROM public.harkas_resilience_state WHERE singleton=true FOR UPDATE;
SELECT writer,epoch FROM public.harkas_failover_control WHERE resource='harkas-admin-db' FOR UPDATE;
UPDATE public.harkas_resilience_lease l SET expires_at=now()+interval '10 minutes',renewed_at=now() WHERE singleton=true AND node='supabase' AND EXISTS(SELECT 1 FROM public.harkas_resilience_state r JOIN public.harkas_failover_control c ON c.resource='harkas-admin-db' WHERE r.singleton=true AND r.role='primary' AND c.writer='supabase' AND c.epoch=r.epoch AND l.epoch=r.epoch);
DO $test$
DECLARE uid uuid; cid uuid; qid uuid:=gen_random_uuid(); did uuid:=gen_random_uuid(); draft jsonb; saved jsonb; blocked boolean:=false;
BEGIN
  SELECT user_id INTO uid FROM public.user_roles WHERE role='admin' LIMIT 1;
  SELECT id INTO cid FROM public.customers ORDER BY created_at LIMIT 1;
  IF uid IS NULL OR cid IS NULL THEN RAISE EXCEPTION 'No authorized test context'; END IF;
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  draft:=jsonb_build_object('id',qid,'version',0,'customer_id',cid,'title','ROLLBACK ONLY - quote email regression','quote_date','2099-01-01','valid_until','2099-12-31','discount_percentage',33,'items',jsonb_build_array(jsonb_build_object('description','Test','quantity',1,'price',1.50,'vat_percentage',21)));
  saved:=public.save_quote(draft);
  IF (saved->>'subtotal')::numeric<>1.01 THEN RAISE EXCEPTION 'Quote rounding regression'; END IF;
  INSERT INTO public.quote_email_deliveries(id,quote_id,quote_version,recipient_email,payload,created_by) VALUES(did,qid,1,'test@example.invalid','{}'::jsonb,uid);
  BEGIN
    PERFORM public.save_quote(draft||jsonb_build_object('version',1,'title','Must stay frozen'));
  EXCEPTION WHEN serialization_failure THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Pending email did not freeze quote'; END IF;
  blocked:=false;
  BEGIN
    INSERT INTO public.quote_email_deliveries(id,quote_id,quote_version,recipient_email,payload,created_by) VALUES(gen_random_uuid(),qid,1,'other@example.invalid','{}'::jsonb,uid);
  EXCEPTION WHEN unique_violation THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate pending email was allowed'; END IF;
  UPDATE public.quote_email_deliveries SET state='failed' WHERE id=did;
  saved:=public.save_quote(draft||jsonb_build_object('version',1,'title','Released after definite rejection'));
  IF (saved->>'version')::integer<>2 THEN RAISE EXCEPTION 'Definite rejection did not release quote'; END IF;
  IF has_table_privilege('authenticated','public.quote_email_deliveries','SELECT') OR has_table_privilege('authenticated','public.quote_email_deliveries','INSERT') THEN RAISE EXCEPTION 'Email ledger exposed to browser'; END IF;
END $test$;
ROLLBACK;
SELECT 'quote email transactional checks passed; all test writes rolled back' AS result,(SELECT count(*) FROM public.quotes) AS quotes,(SELECT count(*) FROM public.invoices) AS invoices,(SELECT count(*) FROM public.invoice_items) AS invoice_items,(SELECT count(*) FROM public.quote_email_deliveries) AS email_deliveries;
