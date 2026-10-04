// Re-encrypt password_vault rows from an OLD key to a NEW key (run locally with Deno).
// Only needed if you choose a NEW VAULT_ENCRYPTION_KEY on the target.
// If you reuse the same key value on the target, copy encrypted_password as-is — no re-encryption needed.
//
// Format: "v1:<base64 iv(12 bytes)>:<base64 AES-256-GCM ciphertext+tag>"
// Key:    AES key = SHA-256(UTF-8 bytes of VAULT_ENCRYPTION_KEY)
//
// Usage:
//   OLD_VAULT_KEY=... NEW_VAULT_KEY=... deno run --allow-env --allow-read --allow-write \
//     reencrypt-vault.ts in.json out.json
// in.json: [{ "id": "...", "encrypted_password": "v1:..." }, ...]  (export from source table)
// out.json: same shape, re-encrypted with NEW key. Import into target via UPDATE by id.
// Never commit the keys or the plaintext; plaintext only exists in memory.

async function keyFrom(secret: string, usage: KeyUsage) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [usage]);
}
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

const oldKey = await keyFrom(Deno.env.get("OLD_VAULT_KEY")!, "decrypt");
const newKey = await keyFrom(Deno.env.get("NEW_VAULT_KEY")!, "encrypt");
const rows: { id: string; encrypted_password: string }[] = JSON.parse(await Deno.readTextFile(Deno.args[0]));

const out = [];
for (const r of rows) {
  const [v, iv, ct] = r.encrypted_password.split(":");
  if (v !== "v1") throw new Error(`Unsupported format for ${r.id}`);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, oldKey, fromB64(ct));
  const newIv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: newIv }, newKey, plain));
  out.push({ id: r.id, encrypted_password: `v1:${toB64(newIv)}:${toB64(enc)}` });
}
await Deno.writeTextFile(Deno.args[1], JSON.stringify(out, null, 2));
console.log(`Re-encrypted ${out.length} rows`);
