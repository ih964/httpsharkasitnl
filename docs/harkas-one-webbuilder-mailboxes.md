# Harkas One — Webbuilder mailbox integration

Requested accounts: `info@harkaswebbuilder.nl` (`webbuilder_info`) and `admin@harkaswebbuilder.nl` (`webbuilder_admin`). Existing IT info, administratie and support accounts remain unchanged.

## Scope and boundaries

- Five accounts in the combined mobile inbox, latest-mail dashboard and sender dropdown. Explicit IT/Builder filter labels prevent duplicate info/admin names.
- Both new accounts use the existing read, reply, forward, attachment, SMTP send/Sent-copy and confirmed native-IMAP MOVE-to-Trash routes. They do not reuse the IT mailbox password.
- Separate fixed webmail entries from the existing password vault are decrypted only by the authenticated backend. Both mailbox domains resolve to the existing Cloud86 mail host.
- Admin folder links use account IDs, not the local part before @, so Builder Info cannot accidentally open IT Info.
- Email push extends the existing minute scheduler. Each new account establishes an independent baseline; no notifications for historical mail. Push payloads show the real domain, never sender/subject/body. Existing subscriptions, preferences and VAPID keys are retained.
- Calendar, private/business appointments and multi-reminder schedules are not changed.

## Deployment order

1. Apply `20261111130000_harkas_one_webbuilder_mailboxes.sql`, which only widens the two fixed account CHECK constraints. No rows, policies or grants are removed.
2. Deploy `harkas-one-push` including `index.ts`, `poll-mail.ts`, `mail-payload.ts` and `deno.json`. Keep the existing in-function authentication and verify_jwt setting. The new helper remains compatible with the previous three-account Node endpoint.
3. Publish the app/API through the existing `httpsharkasitnl` Vercel project.
4. Confirm fresh cursors for all five accounts and a successful mail poll before claiming the new inbox connections are active. Confirm the production JS contains both account addresses. Do not equate an IMAP login with SMTP delivery or phone receipt.

## Validation

- Backend suite: 81 mocked requests across all five read/send/trash accounts, fixed credential selection, SMTP sender branding, authorization and safe deletion behavior.
- Push suites: per-account passwords, missing-credential isolation, new-only baselines, deduplication, production-only polling, real-domain notification deep links and invalid-account rejection.
- Credential-handoff suite: synthetic AES-GCM roundtrip, exact vault IDs, fixed TLS-only worker URL, redirect rejection and health reporting.
- Isolated mobile smoke: five mailbox filters, both Builder reply/send/trash flows, correct send-review addresses, 360/390/768/1280 widths and offline/privacy boundaries.
- Build, API TypeScript, targeted lint, existing calendar and finance regression tests.

No real email is sent or moved by these tests. Real delivery and receipt on the user's phone require a real message and are not inferred from fixture tests.
