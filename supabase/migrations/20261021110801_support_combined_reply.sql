-- Linked files are committed with their reply, under the caller's existing RLS.
ALTER TABLE public.support_ticket_files ADD COLUMN message_id uuid REFERENCES public.support_ticket_messages(id);
CREATE INDEX support_files_message_idx ON public.support_ticket_files(message_id) WHERE message_id IS NOT NULL;
CREATE FUNCTION public.support_validate_file_message() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.message_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.support_ticket_messages m WHERE m.id=NEW.message_id
   AND m.ticket_id=NEW.ticket_id AND m.author_id=NEW.uploaded_by
   AND m.is_internal=NEW.is_internal AND m.created_at=transaction_timestamp()
 ) THEN RAISE EXCEPTION 'Bijlage hoort niet bij deze nieuwe reactie'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.support_validate_file_message() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER support_validate_file_message BEFORE INSERT OR UPDATE ON public.support_ticket_files FOR EACH ROW EXECUTE FUNCTION public.support_validate_file_message();
-- Keep the existing notification function, changing only the linked-file branch.
DO $$ DECLARE definition text; BEGIN
 definition := pg_get_functiondef('public.support_queue_ticket_mail()'::regprocedure);
 IF position(E'ELSIF TG_TABLE_NAME = ''support_ticket_files'' AND TG_OP = ''INSERT'' THEN\n    IF NOT NEW.is_internal THEN' IN definition)=0 THEN
  RAISE EXCEPTION 'Notification function differs; review before applying';
 END IF;
 definition := replace(definition,E'ELSIF TG_TABLE_NAME = ''support_ticket_files'' AND TG_OP = ''INSERT'' THEN\n    IF NOT NEW.is_internal THEN',E'ELSIF TG_TABLE_NAME = ''support_ticket_files'' AND TG_OP = ''INSERT'' THEN\n    IF NOT NEW.is_internal AND NEW.message_id IS NULL THEN');
 EXECUTE definition;
END $$;
CREATE FUNCTION public.support_submit_reply(p_ticket_id uuid,p_message_id uuid,p_body text,p_internal boolean,p_files jsonb DEFAULT '[]') RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE staff boolean; f jsonb; body text; names text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet aangemeld'; END IF;
 staff := public.has_module(auth.uid(),'tickets');
 IF p_internal AND NOT staff THEN RAISE EXCEPTION 'Geen toegang tot interne notities'; END IF;
 IF EXISTS(SELECT 1 FROM public.support_ticket_messages WHERE id=p_message_id AND ticket_id=p_ticket_id AND author_id=auth.uid()) THEN RETURN p_message_id; END IF;
 IF jsonb_typeof(p_files)<>'array' OR jsonb_array_length(p_files)>5 THEN RAISE EXCEPTION 'Maximaal 5 bijlagen'; END IF;
 IF length(coalesce(p_body,''))>8000 OR (length(trim(coalesce(p_body,'')))=0 AND jsonb_array_length(p_files)=0) THEN RAISE EXCEPTION 'Vul een reactie in of voeg een bijlage toe'; END IF;
 SELECT string_agg(left(value->>'original_name',255),E'\n') INTO names FROM jsonb_array_elements(p_files);
 body := trim(coalesce(p_body,''));
 IF names IS NOT NULL THEN body := concat_ws(E'\n\n',nullif(body,''),'Bijlagen (open het ticket om te bekijken):' || E'\n' || names); END IF;
 INSERT INTO public.support_ticket_messages(id,ticket_id,author_id,sender_type,body,is_internal)
 VALUES(p_message_id,p_ticket_id,auth.uid(),CASE WHEN staff THEN 'medewerker' ELSE 'klant' END,body,p_internal);
 FOR f IN SELECT value FROM jsonb_array_elements(p_files) LOOP
  INSERT INTO public.support_ticket_files(ticket_id,uploaded_by,storage_path,original_name,mime_type,size_bytes,is_internal,message_id)
  VALUES(p_ticket_id,auth.uid(),f->>'storage_path',f->>'original_name',f->>'mime_type',(f->>'size_bytes')::bigint,p_internal,p_message_id);
 END LOOP;
 RETURN p_message_id;
END $$;
REVOKE ALL ON FUNCTION public.support_submit_reply(uuid,uuid,text,boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.support_submit_reply(uuid,uuid,text,boolean,jsonb) TO authenticated;
