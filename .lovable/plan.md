

## Plan: Replace SMTP with Resend for Invoice Emails

### Step 1: Connect Resend connector
Use the `standard_connectors--connect` tool with connector_id `resend` to link Resend to the project. This provides `RESEND_API_KEY` and `LOVABLE_API_KEY` as environment variables.

### Step 2: Rewrite `supabase/functions/send-invoice-email/index.ts`

**Remove entirely:**
- `SMTPClient` import from denomailer
- `SMTP_PASSWORD` check and usage
- All SMTP client config, `.send()`, and `.close()` calls

**Add:**
- Gateway-based Resend call via `fetch` to `https://connector-gateway.lovable.dev/resend/emails`
- Headers: `Authorization: Bearer ${LOVABLE_API_KEY}`, `X-Connection-Api-Key: ${RESEND_API_KEY}`
- 10-second timeout using `AbortController` + `Promise.race`
- `from: "Harkas IT <administratie@harkasit.nl>"`

**Error handling (per your requirements):**
- Log full Resend response body with `console.error`
- Parse and return the actual Resend error message to frontend (not generic)
- Only update `emailed_at`, `emailed_to`, `emailed_cc` and insert activity log AFTER confirmed successful Resend response (`response.ok === true`)

**Keep unchanged:**
- Auth + admin role check
- Invoice/customer/settings fetch
- Signed URL creation (7 days)
- finalTotal calculation
- Due date logic
- Email HTML template
- CORS handling

### Step 3: Deploy and test
Deploy the updated edge function and test with a real invoice.

### Files changed

| File | Action |
|------|--------|
| `supabase/functions/send-invoice-email/index.ts` | Rewrite SMTP → Resend gateway |

