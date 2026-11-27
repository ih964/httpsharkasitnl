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