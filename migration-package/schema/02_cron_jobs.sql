-- Cron jobs (source definitions with keys redacted). Replace placeholders before running.
-- <TARGET_REF> = uqkrxzlkvjdmebsbdrmb ; <TARGET_ANON_KEY> = target project's publishable/anon key.

select cron.schedule('send-domain-reminders-daily', '0 8 * * *', $$
  select net.http_post(
    url := 'https://<TARGET_REF>.supabase.co/functions/v1/send-domain-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <TARGET_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

select cron.schedule('keep-alive-daily', '0 9 * * *', $$
  select net.http_post(
    url := 'https://<TARGET_REF>.supabase.co/functions/v1/keep-alive',
    headers := '{"Content-Type":"application/json","apikey":"<TARGET_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

-- keep_alive seed row
insert into public.keep_alive (id, pinged_at) values (1, now()) on conflict (id) do nothing;
