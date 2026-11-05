// Existing password-vault encryption is decrypted only inside the trusted backend.
// Mail credentials travel over TLS to our fixed Node IMAP worker, never to a browser or logs.
const MAIL_VAULT_ID = '8aec51a9-3504-447e-99cf-2e5cb6cdea5f';
function decode(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
export async function pollMail(db: any, cfg: any): Promise<boolean> {
  try {
    const started = await db.from('one_push_config').update({ mail_last_run_at: new Date().toISOString() }).eq('singleton', true);
    if (started.error) return false;
    const secret = Deno.env.get('VAULT_ENCRYPTION_KEY');
    if (!secret) return false;
    const result = await db.from('password_vault').select('encrypted_password').eq('id', MAIL_VAULT_ID).single();
    if (result.error || typeof result.data?.encrypted_password !== 'string') return false;
    const [version, iv, ciphertext] = result.data.encrypted_password.split(':');
    if (version !== 'v1' || !iv || !ciphertext) return false;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
    const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt']);
    const sharedPassword = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv) }, key, decode(ciphertext)));
    const response = await fetch('https://www.harkasit.nl/api/one-mail-poll', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
      headers: { 'Content-Type': 'application/json', 'x-one-cron': cfg.cron_secret },
      body: JSON.stringify({ sharedPassword }),
    });
    if (!response.ok || (await response.json()).ok !== true) return false;
    const updated = await db.from('one_push_config').update({ mail_last_success_at: new Date().toISOString() }).eq('singleton', true);
    return !updated.error;
  } catch { return false; }
}
