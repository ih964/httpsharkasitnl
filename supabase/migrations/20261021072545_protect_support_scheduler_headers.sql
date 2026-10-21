-- Attempt to restrict raw pg_net request reads; managed extension ownership can prevent the revoke.
-- The following signed-request migration removes the need to transport a reusable secret.
REVOKE SELECT ON net.http_request_queue FROM PUBLIC,anon,authenticated;
