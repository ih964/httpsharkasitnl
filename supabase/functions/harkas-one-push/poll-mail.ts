// Decrypt only fixed, owner-configured mail credentials inside the trusted backend.
// Never log these values, expose them to a browser or follow redirects.
const MAIL_VAULT_IDS = { sharedPassword: '8aec51a9-3504-447e-99cf-2e5cb6cdea5f', webbuilder_info: '07b1de96-f2ea-406b-abe5-8e6619576abb', webbuilder_admin: 'c4e70f1e-407a-4a41-a42a-ee91e77c14d7' } as const;
function decode(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
export async function pollMail(db: any, cfg: any): Promise<boolean> {
  try {
    const started = await db.from('one_push_config').update({ mail_last_run_at: new Date().toISOString() }).eq('singleton', true);
    if (started.error) return false;
    const secret = Deno.env.get('VAULT_ENCRYPTION_KEY');
    if (!secret) return false;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
    const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt']);
    const passwords: Record<string, string> = {};
    await Promise.all(Object.entries(MAIL_VAULT_IDS).map(async ([account, id]) => {
      // One unavailable vault entry must not block polling the remaining mailboxes.
      try {
        const result = await db.from('password_vault').select('encrypted_password').eq('id', id).single();
        if (result.error || typeof result.data?.encrypted_password !== 'string') return;
        const [version, iv, ciphertext] = result.data.encrypted_password.split(':');
        if (version !== 'v1' || !iv || !ciphertext) return;
        const password = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv) }, key, decode(ciphertext)));
        if (password && password.length <= 4096) passwords[account] = password;
      } catch { /* No decrypted values or server error text in logs. */ }
    }));
    const response = await fetch('https://www.harkasit.nl/api/one-mail-poll', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
      headers: { 'Content-Type': 'application/json', 'x-one-cron': cfg.cron_secret },
      body: JSON.stringify({ sharedPassword: passwords.sharedPassword, mailboxPasswords: { webbuilder_info: passwords.webbuilder_info, webbuilder_admin: passwords.webbuilder_admin } }),
    });
    if (!response.ok || (await response.json()).ok !== true) return false;
    const updated = await db.from('one_push_config').update({ mail_last_success_at: new Date().toISOString() }).eq('singleton', true);
    return !updated.error;
  } catch { return false; }
}
