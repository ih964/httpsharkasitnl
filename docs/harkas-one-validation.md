# Harkas One validation — 4 November 2026

Validated build based on feature commit 54c9615b64b344d85c05dcec37ec622c23a27d29 in an isolated disposable Vercel sandbox, Node 22. No production data changes or e-mail sends were used in browser checks.

- `npm run build`: pass. Existing large main-bundle warning remains; Harkas One is lazy loaded.
- `npm run test:finance`: pass, including HA authorization and invoice integrity regression suites.
- ESLint new One files: zero errors; two non-blocking Fast Refresh export warnings.
- TypeScript whole-project check: existing errors in unchanged Supabase client/generated types and Admin files; no errors reported in src/pages/one. This is not claimed as an all-project typecheck pass.
- Chromium 156 / Playwright 1.64.1 browser smoke suite: all checks pass. No private API calls before login or for a non-admin; synthetic admin login; three inbox sources; dashboard widths 360/390/768/1280; safe plaintext message rendering; correct reply account; no send when confirmation cancelled; exactly one mocked send when approved; mailbox failure preserves other sources; More and ticket navigation; no page errors.
- Service-worker cache: exactly `/admin/one/offline.html`; offline navigation fallback passes.

Reproduction: install the test-only Playwright version and Chromium, run `npm run build`, start `npm run preview -- --host 127.0.0.1 --port 4173`, then `node tests/harkas-one-smoke.mjs`. The included GitHub Actions workflow does this for relevant pull requests.

A real Android installation and authenticated production mailbox session require the account owner to open the deployed app. Do not describe the synthetic tests as live IMAP/SMTP end-to-end verification. No credentials were taken from another browser session.
