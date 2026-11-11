# Harkas One: all mailboxes could not open (2026-11-11)

## Confirmed cause

The production Vercel mail handler failed at `stage: authorization`, before resolving mailbox credentials or opening IMAP. Matching Supabase Supavisor logs at 11:26:52-11:27:16 UTC recorded `EMAXCONNSESSION`: session-mode clients reached `pool_size: 15`. The corresponding Auth `/user` calls succeeded with HTTP 200. This was a database connection-capacity failure, not evidence of five incorrect mailbox passwords.

The old error-code filter excluded digits, so PostgreSQL SQLSTATE `XX000` appeared only as `MAIL_FAILURE`. The generic response incorrectly suggested checking saved mailbox credentials.

## Repair

Only the two mail functions use the new shared mail database configuration. On an existing Supabase shared-pooler host, session port 5432 is changed to transaction port 6543. Host, role, credentials, database and TLS settings stay unchanged; other hosts/custom ports are not redirected. The original environment variable, HA router, Neon, backup configuration, schema and permissions are not modified.

Each function instance has at most two database clients, a one-second idle timeout and a one-minute maximum connection lifetime. Idle-client errors are handled with code-only logging. The poller establishes IMAP connections before acquiring its database transaction. It still acquires the transaction-local advisory lock before reading mailbox high-water marks and changing cursors/event metadata. Checkout failures are isolated per mailbox and clients are released.

Administrator authentication and role checks remain fail-closed. Authorization/credential infrastructure errors no longer advise replacing mailbox passwords. SQLSTATE codes, including digits, are logged without raw error text, credentials, queries or mail content. Sending and trash actions are not automatically retried.

## Validation before merge

- The live transaction pool was reached with the existing read-only backup role on the same project; a read-only query returned the three admin-role rows. This is a database reachability test, not an authenticated Harkas One session.
- Pure configuration tests passed: transaction routing, TLS/credential preservation, unchanged custom endpoints, resource bounds, invalid configuration and safe error codes.
- 85 synthetic admin-mail requests passed, including all five mailboxes, admin/non-admin boundaries, send/trash safety and regression cases for the production session-limit failure.
- Poll tests passed: all five credentials, initial baseline/new-only notifications, duplicate protection, transaction-pool selection, client release and one-account checkout failure isolation.
- Targeted API TypeScript validation, production frontend build and existing finance/HA authorization regressions passed.
- An additional live concurrent database test was not executed because the tool safety check blocked it. No attempt was made to bypass that check.
- No real email was sent, moved or deleted for these tests. End-to-end opening from the user's phone remains to be confirmed after deployment.

## Technical references

- Supabase connection modes: https://supabase.com/docs/guides/database/connecting-to-postgres
- node-postgres pool configuration: https://node-postgres.com/apis/pool
