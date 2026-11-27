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
