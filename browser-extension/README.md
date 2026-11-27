# Harkas Password Manager (0.1.0 - development)
Internal Chromium MV3 extension. **Do not install for real credentials until the review, integration tests, and signed distribution are approved.**
- Harkas Admin is the only authentication and vault source. No copied session tokens or encryption keys.
- Start from the extension action or, after explicit domain synchronization and browser site permissions, the on-page button.
- Admin confirms the exact HTTPS origin and selected account. A single, expiring request is bound to the original tab and top-level document ID. No form submission.
- No password is stored in extension storage. Approved domain origins are stored locally; clear with the forget button. These domains can reveal customer relationships.
- Only a visible, unambiguous password form with same-origin action is supported. No iframes, signup/change-password forms, HTTP, multi-step login, or automatic submission.
- Unpacked extension identity is pinned to a public manifest key, not a signing credential. A trusted signed package is required for managed deployment; do not distribute or load modified code.
- Test: node --test tests/password-extension.test.mjs.
- Deployment prerequisite: review both the Admin route and backward-compatible decrypt-password Edge Function change. Use an isolated preview/test vault with synthetic accounts; production must remain untouched until verified. The bridge is intentionally restricted to the official origin in this build; use a test-only manifest/config for local end-to-end tests.
- Install manually in Chrome/Edge/Opera developer mode via Load unpacked (browser-extension folder), only after approval. Opera support must be separately validated.

## Verification 2026-11-27
- Node 24: 13/13 tests passed (including actual decrypt handler using mocked DB/Auth and genuine AES-GCM fixture).
- Isolated browser profiles: bundled Chromium, installed Edge and installed Opera passed sync, recognition, fill and replay rejection using synthetic credentials and a mocked Admin page.
- Installed Google Chrome blocked command-line loading. Manual developer-mode install and real Chrome test still required.
- Vercel preview b7073a7: READY. Local full build blocked by laptop disk space; temporary dependency files from failed install removed.
- No live vault rows queried or altered. Real authenticated preview integration and production security review remain required.
- Run server and extension tests: node --test tests/password-extension.test.mjs tests/password-extension-server.test.mjs
- Browser test script tests all installed browsers and reports failures; Chrome failure is not counted as a pass.
### Full application fixture test
On Dell Latitude 7200, local Vite build with synthetic VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY succeeded; the real React AuthContext, password-extension page and browser extension passed unauthenticated denial, synthetic login, domain synchronization and selected-account fill in an isolated Edge browser profile. All HTTPS is intercepted; no production vault data is used.
To repeat on Windows: build with VITE_SUPABASE_URL=https://harkas-fixture.supabase.example.test and VITE_SUPABASE_PUBLISHABLE_KEY=test-publishable-not-real, install playwright@1.60.0 in a separate test directory, set HARKAS_PLAYWRIGHT_PACKAGE to that directory's package.json path, then node tests/password-extension-app.mjs.
## Version 1.1.0
- Secure generator; password input remains in the trusted Admin window or local generator, never captured by a page listener.
- Explicit create/update of vault records using existing encrypted storage and role checks. Account changes are checked before writing; a concurrent encrypted-password change prevents overwrite.
- Compact trusted browser window for account selection; falls back to a tab if necessary.
- Domain-only synchronization when a linked user opens or changes the Admin vault. Existing browser permissions are preserved, new site permissions require user consent.
- Existing 0.1.0 clients remain compatible. After upgrading the existing unpacked extension folder, reload each browser extension.
- 15 unit tests and isolated full application fixtures passed on Dell 7200, including Edge and Opera. All test accounts are fictitious; no production vault records were changed during testing.