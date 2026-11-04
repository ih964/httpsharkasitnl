# Harkas One v1

Entry: `/admin/one/`. Mobile shell, shared existing Supabase Auth and server-side authorization, existing database and mail API. No database migration, account creation or secret distribution.

## Included
- Admin-only entry with existing credentials, install prompt and standalone web manifest.
- Live dashboard counts (open tickets, sent/unpaid-marker invoices, customers), actual recent open tickets, unified latest incoming mail.
- Info, administratie and support inboxes with independent errors, search of loaded sender/subjects, pagination, text-only reader, reply, forward text, attachment download and explicit send confirmation.
- Existing ticket/customer/invoice/quote/time/document modules inside the mobile shell. Full mail folders and vault remain available in existing Admin.
- No business-data cache: the service worker caches only the public offline notice. API requests are network-only with no-store, access token stays in the existing Auth implementation, no service-role or mailbox credentials in browser code.

## Not included
Native APK, background push, AI assistant, cross-system global search, Calendar/Metricool/SnelStart/backup integrations, IMAP mutations or persisted drafts. Folder list uses the existing Admin mailbox. Forwarded messages do not automatically include attachments. Read actions preserve the existing read-only IMAP behavior.

## Verification
Build, new UI smoke checks and existing finance/authorization regressions must pass before production. Authenticated browser tests use isolated synthetic fixtures, not credentials or real customer/mail contents. Live mail delivery must never be tested by sending an unsolicited message.

## Install
Open `/admin/one/` in Chrome on Android and select **Installeer app**, or the browser menu's Add to Home screen. Log in with the existing admin account. Installing on a physical handset requires its owner to accept the browser install dialog.

## Rollback
Revert the Harkas One commit(s). Existing `/admin` routes and backend remain unchanged. The service worker is scoped to `/admin/one/`, intercepts navigation only and does not serve a cached application bundle, so normal Admin is unaffected.
