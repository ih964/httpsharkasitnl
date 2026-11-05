# Harkas One — mail notifications and multiple reminders

## Scope

- Reminder checkboxes: 0, 5, 15, 30, 60, 120, 1440, 2880, 7200 and 10080 minutes before a timed event. Any combination, including 5 days + 24 hours + 1 hour, is stored as a canonical array.
- Whole-day events use Amsterdam 09:00 on the event day; 60 means 08:00, day offsets stay at local 09:00 through DST.
- The old scalar column remains a compatible projection. The dispatch delivery key includes the offset. Changing the selection does not repeat accepted offsets; moving the start re-versions the schedule. The dispatcher rechecks owner, selected offset, event version and device preferences before sending.
- Existing VAPID keys and browser subscriptions are preserved. The service worker now supplies the existing Harkas icon. Browser/OS attribution remains controlled by Android/Chrome.

## Mail flow and trust boundary

The existing authenticated Supabase minute dispatcher calls a fixed, TLS-only production endpoint `/api/one-mail-poll`. Mailbox access uses the same stored credentials as the existing mail module; no new browser credentials or client-side secrets are introduced. The helper decrypts the fixed info/administratie vault entry inside the trusted Edge runtime and sends it only to the fixed Harkas backend with redirects disallowed. Support credentials stay inside the Node worker and its existing private vault lookup. Never log request bodies, authorization headers, IMAP credentials, decrypted vault values or push endpoints.

The worker validates the existing 64-hex scheduler credential in constant time, requires the production Vercel environment and the explicit mail activation flag, and permits only the three fixed account aliases and existing mail host. Every mailbox uses a transaction-scoped advisory lock, TLS, read-only INBOX and UID/internal-date metadata only. No subjects, senders, bodies, attachments, URLs or instructions from email are processed. Incoming mail never authorizes actions or changes recipients.

A first poll or UIDVALIDITY reset establishes a baseline without notifying historical mail. Subsequent arrivals use `(account, UIDVALIDITY, UID)` uniqueness, per-device opt-in timestamps, and the existing claimed delivery ledger. Notifications contain only the fixed mailbox address and an authenticated in-app deep link. The worker never marks email as read, sends email, deletes email or examines spam folders.

Both email and agenda notifications have a 15-minute freshness/expiry window. This intentionally avoids a burst of stale notifications after a prolonged outage; delivery is best effort, not an exact alarm guarantee. Mail control health is separate from the existing push dispatcher health. Metadata and delivery records are removed after 30 days. No polling is performed when no authorized device has mail enabled.

## Release order

1. Apply additive migration `20261105144829_harkas_one_mail_multi_reminders.sql` (already applied to production with mail polling disabled).
2. Release the API and mobile UI; release the updated Edge function including `poll-mail.ts` and `deno.json`.
3. Enable the server mail flag and the requesting user's verified device only. Confirm all three cursors initialize and mail health succeeds before reporting activation.
4. Rollback: disable `mail_poll_enabled` first. Additive schema remains compatible with the preceding UI/Edge build. Do not rotate VAPID keys or remove subscriptions.

## Tests

- Production build; calendar pure tests; synthetic IMAP/authentication/baseline/dedup tests.
- Isolated Playwright calendar create/edit/readback with 5d + 24h + 1h; device preferences, rejected permission, sign-out, private/business and responsive widths.
- Database transaction test (rolled back): independent due windows, removed offset, unchanged delivery version on selection edit, whole-day DST and service-only metadata/RPC privileges. No synthetic appointment remains in production.
- Existing finance/authorization/invoice regression suite.
- Real phone receipt is not inferred from server acceptance. User's earlier screenshot confirms the existing test push, not the new email/agenda flow.
