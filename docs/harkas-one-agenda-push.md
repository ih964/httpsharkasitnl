# Harkas One — agenda and push

## Scope

`/admin/one/agenda`: own private/business appointments, month/list views, all-day/multi-day appointments, location, notes, create/edit/delete and optional reminder. Times are Europe/Amsterdam regardless of handset timezone. Nonexistent/ambiguous DST wall times are rejected. Both categories are owner-only, including between admin accounts. Business is not a shared team calendar.

`/admin/one/meldingen`: explicit per-device push opt-in, independent calendar/ticket preferences, test notification, unsubscribe and scheduler health. The top-bar bell opens settings; Agenda is a fifth bottom navigation item. Today shows the next seven days. Logout detaches the device before signing out.

No Outlook/Google sync, recurrence, meeting invitations, email push or offline private-data storage in this version. No actual user appointments, test emails or physical-device push were created during deployment validation.

## Backend and privacy

Supabase project `uqkrxzlkvjdmebsbdrmb`. Calendar uses `portalSupabase`, not the legacy HA proxy. RLS requires `auth.uid() = user_id` and the database admin role on every calendar operation. Updates have both USING and WITH CHECK; client writes cannot set timestamps/reminder internals. Private push tables have no anon/authenticated grants or policies. Server signing and cron secrets are generated server-side, never checked in or sent to browsers. Backups of these tables must be handled as secrets.

Deploy `supabase/functions/harkas-one-push` with **verify_jwt=false** because it verifies browser JWTs with `auth.getUser`, checks the actual database role, and separately verifies a high-entropy cron secret. This setting does NOT make actions public. Anonymous POST actions return 401. CORS is restricted to the two production domains. Endpoint hosts are restricted to known web push providers, preventing arbitrary server-side requests. Test messages are owner/device-only and rate limited.

The scheduler is a named pg_cron job `harkas-one-push-every-minute`, every minute. It POSTs `{"action":"dispatch"}` to this Edge function. Header `x-one-cron` is read by SQL from `one_push_config`; the secret is not embedded in the cron command. Existing pg_net and pg_cron are used; no extra paid service was added. Cron must not be enabled in a standby/restore environment.

Per-device receipts claim a three-minute lease and deduplicate event-version/ticket delivery. Retries are bounded. Old reminders expire after fifteen minutes; accepted receipts are retained for thirty days. Notification tags reduce visible duplicates after interrupted receipt writes. Successful acceptance by a push provider is not proof of handset receipt. Handset permission, connectivity and OS policies can delay or suppress a notification. Never rely exclusively on push for critical appointments.

Push payloads contain generic text and an internal app URL, never appointment titles, notes or customer names. Service worker navigation is same-origin and restricted to `/admin/one/`. Only the public offline page is cached. Existing Supabase/Neon routing and writer fencing were not altered. The new module is Supabase-primary only; failover/backup coverage of its tables must be verified separately.

## Validation

The GitHub workflow builds the app, runs existing finance/authorization tests, existing Harkas One mail/mobile/offline tests, pure timezone/service-worker safety tests and synthetic calendar/push browser tests. Screenshots contain synthetic data only. Browser checks cover create/edit/delete, private/business filtering, invalid ranges, all-day dates, a non-Dutch handset timezone, errors, widths 360/390/768/1280, explicit opt-in, preferences, test acknowledgment, denied permission and logout unsubscribe.

Live SQL tests use two existing admin identities in a transaction, create only synthetic appointments/subscriptions, verify ownership isolation, forged ownership rejection, server-secret and dispatch-RPC restrictions, reminder calculation and claim/retry deduplication, then roll back. No role changes or writer-fence bypasses are used.

Physical acceptance: open the installed app, open the bell, enable notifications, accept the browser prompt, send a test, and verify it on the handset. Then create an appointment with a future reminder and verify the scheduled path. Do not claim end-to-end handset delivery until this has been observed.
