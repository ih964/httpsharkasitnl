-- Vercel Hobby permits one daily cron only. Use the existing Supabase scheduler
-- for the five-minute retry; retain Vercel's daily job as a fallback.
-- Secret generated, encrypted and consumed server-side; never returned to clients.
CREATE SCHEMA IF NOT EXISTS harkas_support_private;
REVOKE ALL ON SCHEMA harkas_support_private FROM PUBLIC,anon,authenticated;
CREATE TABLE harkas_support_private.worker_auth (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 secret_id uuid NOT NULL,
 token_hash text NOT NULL CHECK(length(token_hash)=64)
);
ALTER TABLE harkas_support_private.worker_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON harkas_support_private.worker_auth FROM PUBLIC,anon,authenticated;
DO $$
DECLARE token text; secret_uuid uuid;
BEGIN
 token:=encode(extensions.gen_random_bytes(32),'hex');
 SELECT vault.create_secret(token,'harkas_support_worker','Internal ticket mail worker authentication') INTO secret_uuid;
 INSERT INTO harkas_support_private.worker_auth(singleton,secret_id,token_hash)
 VALUES(true,secret_uuid,encode(extensions.digest(token,'sha256'),'hex'));
END $$;
SELECT cron.schedule('harkas-support-mail-retry','*/5 * * * *',$job$
 SELECT net.http_get(
  url:='https://www.harkasit.nl/api/support-notify',
  headers:=(SELECT jsonb_build_object('x-harkas-worker-token',s.decrypted_secret)
   FROM harkas_support_private.worker_auth w JOIN vault.decrypted_secrets s ON s.id=w.secret_id WHERE w.singleton),
  timeout_milliseconds:=30000
 );
$job$);
