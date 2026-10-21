-- Use a short-lived, single-use signature in pg_net, never a reusable secret.
-- The managed extension's queue ACLs cannot be changed by the project role.
CREATE TABLE harkas_support_private.worker_invocations (
 nonce uuid PRIMARY KEY,
 issued_at timestamptz NOT NULL
);
ALTER TABLE harkas_support_private.worker_invocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON harkas_support_private.worker_invocations FROM PUBLIC,anon,authenticated;
-- Rotate the initial secret entirely within Vault. Nothing is returned to clients.
DO $$ DECLARE token text; secret_uuid uuid; BEGIN
 token:=encode(extensions.gen_random_bytes(32),'hex');
 SELECT secret_id INTO secret_uuid FROM harkas_support_private.worker_auth WHERE singleton;
 PERFORM vault.update_secret(secret_uuid,token);
 UPDATE harkas_support_private.worker_auth SET token_hash=encode(extensions.digest(token,'sha256'),'hex') WHERE singleton;
END $$;
SELECT cron.schedule('harkas-support-mail-retry','*/5 * * * *',$job$
 WITH expired AS (
  DELETE FROM harkas_support_private.worker_invocations WHERE issued_at<now()-interval '1 day' RETURNING nonce
 ), proof AS (
  SELECT floor(extract(epoch from now()))::bigint::text issued,gen_random_uuid()::text nonce
 )
 SELECT net.http_get(
  url:='https://www.harkasit.nl/api/support-notify',
  headers:=(SELECT jsonb_build_object('x-harkas-worker-nonce',p.nonce,'x-harkas-worker-issued',p.issued,
    'x-harkas-worker-signature',encode(extensions.hmac(p.issued||':'||p.nonce,s.decrypted_secret,'sha256'),'hex'))
   FROM proof p CROSS JOIN harkas_support_private.worker_auth w JOIN vault.decrypted_secrets s ON s.id=w.secret_id WHERE w.singleton),
  timeout_milliseconds:=30000
 );
$job$);
