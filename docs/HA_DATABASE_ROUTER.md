# Server-side HA database router

The Harkas Admin browser no longer sends application-table queries directly to Supabase. The shared `supabase` export keeps Supabase Auth and Storage, while `from()`/database RPC calls are brokered through `/api/ha-db`.

The API chooses the database whose `harkas_resilience_state.role` is `primary`. It refuses requests when no primary is provable.

## Server-only environment

Required on the production web runtime:

- `HARKAS_SUPABASE_DSN` — Session Pooler URI; server-only.
- `HARKAS_NEON_DSN` — Neon connection string; server-only.
- `HARKAS_SUPABASE_PUBLISHABLE_KEY` — publishable key for server-side Auth validation.
- `HARKAS_SUPABASE_JWKS_URL` — optional; defaults to the project's Auth JWKS endpoint.

Never expose either database DSN to the browser.

## Failover boundary

The router is the application write/read gate. The database resilience controller remains fail-closed until the fencing lease is deployed and the Auth signing keys can be verified independently during a Supabase outage.

Supabase Auth itself is still the identity provider. Existing sessions can be verified locally only when the project uses asymmetric JWT signing keys and the JWKS endpoint has been configured. Supabase documents asymmetric signing keys as the recommended model for independent JWT verification.

The database router does not pretend that Auth or Storage have failed over merely because PostgreSQL has been promoted.
