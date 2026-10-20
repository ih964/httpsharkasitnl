-- Quote storage is prepared on the standby. Do not promote or alter the DR baseline here.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['quotes','quote_counters'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=('public.'||t)::regclass AND tgname='harkas_dr_capture') THEN
      EXECUTE format('CREATE TRIGGER harkas_dr_capture AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.harkas_dr_capture()',t);
    END IF;
  END LOOP;
END $$;
