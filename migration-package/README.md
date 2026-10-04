# Harkas IT backend – portable migration package

Source: Lovable Cloud project (read-only export, 2026-10-04). Target: `uqkrxzlkvjdmebsbdrmb`.
No secret values and no row data are included. There is **no active connector** from this project to the target.

## Contents
| Path | What |
|---|---|
| `schema/01_live_schema_snapshot.sql` | Enums, 11 tables, grants, 3 SQL functions, 6 triggers, RLS + 12 table policies, 2 buckets + 8 storage policies (exact live definitions) |
| `schema/02_cron_jobs.sql` | 2 cron jobs (placeholders for target URL/key) + keep_alive seed row |
| `supabase/migrations/` | All 11 original migration files (history; the two `20260926*` files add `user_module_access`/`managed_users`, which are **not present** in the live source DB) |
| `supabase/functions/` | Source of all 7 Edge Functions |
| `scripts/reencrypt-vault.ts` | Vault decrypt/re-encrypt tool |

## Order of operations on target
1. Create Auth users first (see Auth section) – `user_roles.user_id` FKs to `auth.users`.
2. Run `schema/01_live_schema_snapshot.sql`, then the two `20260926*` migrations.
3. Load data in FK order: customers → invoice_counters → invoices → invoice_items → domains → time_entries → settings → activity_logs → password_vault → user_roles. Keep original UUIDs.
4. Copy storage objects with identical paths (`invoices/invoices/<invoice_id>.pdf` ×18, `branding/logo.png` ×1). Update `settings.logo_url` to the target public URL.
5. Set secrets, deploy functions, run `schema/02_cron_jobs.sql`.
6. Point the frontend env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) to the target.

## Edge Functions
`generate-invoice-pdf`, `send-invoice-email`, `send-domain-reminders`, `encrypt-password`, `decrypt-password`, `keep-alive`, `smtp-send`. All validate auth in code → deploy with `--no-verify-jwt` (keep-alive must be public).

## Secrets to set on target (names only)
- `VAULT_ENCRYPTION_KEY` – see vault section.
- `RESEND_API_KEY` – use a **direct** Resend API key. `send-invoice-email` and `send-domain-reminders` currently call the Lovable connector gateway (`connector-gateway.lovable.dev` + `LOVABLE_API_KEY`); outside Lovable, change them to call `https://api.resend.com/emails` with `Authorization: Bearer RESEND_API_KEY`.
- `SMTP_PASSWORD`, `SMTP_HOSTNAME` (harkasit.nl), `SMTP_PORT` (465), `SMTP_USERNAME` (administratie@harkasit.nl), `SMTP_FROM`, `SMTP_SECURE` (true) – only for `smtp-send`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` – provided automatically by the target.

## Non-secret config
- Mail sender: `administratie@harkasit.nl` (domain must be verified in Resend); reminder recipients are hardcoded in `send-domain-reminders`.
- Cron times are UTC.
- Buckets: `invoices` private, `branding` public, no size/MIME limits.

## Password vault
- Format: `v1:<base64 IV>:<base64 ciphertext>`, AES-256-GCM, 12-byte random IV, key = SHA-256 of the `VAULT_ENCRYPTION_KEY` string.
- **Option A (simplest):** set the identical `VAULT_ENCRYPTION_KEY` value on the target and copy `encrypted_password` unchanged. The key value can only come from whoever originally created it. Lovable Cloud does not reveal it, and it is not in this package.
- **Option B:** pick a new key and run `scripts/reencrypt-vault.ts` with OLD and NEW keys (needs the old value too).
- **If the old value is unavailable:** decrypt in-app *before* switching (per entry via the vault's "show" action, which uses the `decrypt-password` function), then re-enter the passwords on the target. Do this manually; never write plaintext to disk.

## Auth users (4 accounts)
- Lovable Cloud does not give direct database or dashboard access, so `pg_dump` of the `auth` schema can't be run. Through the agent's read access, password hashes *can* technically be selected from `auth.users`, but exporting hashes through chat is not a supported or safe path, so this package leaves them out.
- **Supported, login-preserving path:** recreate the 4 users on the target with the **same UUIDs** (Admin API `createUser` accepts `id`). Then either set new passwords or send password-reset emails. Bcrypt hashes are portable between Supabase projects if you do obtain them, and Admin API `createUser` accepts `password_hash`.
- After creating them, insert `user_roles` rows (role `admin`).

## Known gaps in source
- `user_module_access` / `managed_users` are referenced by the app and two functions but missing from the live DB. The vault functions return 403 for non-admins only; admins work.
