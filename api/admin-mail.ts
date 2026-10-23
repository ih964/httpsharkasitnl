import { Pool } from "pg";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";

const HOST = "shared70.cloud86-host.nl";
const AUTH_URL = process.env.HARKAS_SUPABASE_URL || "https://uqkrxzlkvjdmebsbdrmb.supabase.co";
const ACCOUNTS = { info: "info@harkasit.nl", administratie: "administratie@harkasit.nl", support: "support@harkasit.nl" } as const;
const MAIL_VAULT_ID = "8aec51a9-3504-447e-99cf-2e5cb6cdea5f";
let pool: Pool | undefined;
function db() {
  if (!process.env.HARKAS_SUPABASE_DSN) throw new Error("Database niet beschikbaar");
  return pool ??= new Pool({ connectionString: process.env.HARKAS_SUPABASE_DSN, max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 5000 });
}
class MailError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function parseRequest(query: Record<string, unknown>) {
  const account = String(query.account || "");
  if (!Object.prototype.hasOwnProperty.call(ACCOUNTS, account)) throw new MailError("Ongeldige mailbox");
  const folder = String(query.folder || "INBOX");
  if (folder.length > 255 || /[\0\r\n]/.test(folder)) throw new MailError("Ongeldige map");
  const action = String(query.action || "list");
  if (!["list", "message", "attachment", "send"].includes(action)) throw new MailError("Ongeldige actie");
  const page = Number(query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new MailError("Ongeldige pagina");
  const uid = Number(query.uid);
  if (["message", "attachment"].includes(action) && (!Number.isSafeInteger(uid) || uid < 1)) throw new MailError("Ongeldig bericht");
  return { account: account as keyof typeof ACCOUNTS, address: ACCOUNTS[account as keyof typeof ACCOUNTS], folder, action, page, uid };
}
export async function isAdmin(bearer: string) {
  if (!/^Bearer \S+$/.test(bearer)) return false;
  const response = await fetch(AUTH_URL + "/auth/v1/user", {
    headers: { Authorization: bearer, apikey: process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY || "" }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const user = await response.json();
  if (typeof user.id !== "string" || !/^[0-9a-f-]{36}$/i.test(user.id)) return false;
  return (await db().query("SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role='admin' LIMIT 1", [user.id])).rows.length > 0;
}
async function credential(account: keyof typeof ACCOUNTS, bearer: string): Promise<string> {
  if (account === "support") {
    const row = (await db().query("SELECT v.decrypted_secret FROM harkas_support_private.mailbox m JOIN vault.decrypted_secrets v ON v.id=m.secret_id WHERE m.singleton")).rows[0];
    const password = row && JSON.parse(row.decrypted_secret).password;
    if (typeof password !== "string" || !password) throw new MailError("Supportmailbox is nog niet gekoppeld.", 503);
    return password;
  }
  // This saved webmail credential is shared by info and administratie, as configured by the owner.
  // Decryption runs on the server with the requesting admin's identity. Never return it to the browser.
  const response = await fetch(AUTH_URL + "/functions/v1/decrypt-password", {
    method: "POST", headers: { Authorization: bearer, apikey: process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY || "", "Content-Type": "application/json" },
    body: JSON.stringify({ id: MAIL_VAULT_ID }), signal: AbortSignal.timeout(10000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.password !== "string" || !body.password) throw new MailError("Het opgeslagen webmailwachtwoord kon niet worden opgehaald.", 503);
  return body.password;
}
const addresses = (items?: { name?: string; address?: string }[]) => (items || []).map(x => ({ name: x.name || "", address: x.address || "" }));
export function composeInput(body: Record<string, unknown>) {
  const to = String(body.to || "").trim();
  const subject = String(body.subject || "").trim();
  const text = String(body.text || "");
  if (to.length > 254 || !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(to)) throw new MailError("Vul één geldig e-mailadres in.");
  if (!subject || subject.length > 250 || /[\r\n]/.test(subject) || !text.trim() || text.length > 100000) throw new MailError("Vul een onderwerp en bericht in.");
  return { to, subject, text };
}
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Vary", "Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Methode niet toegestaan" });
  let imap: ImapFlow | undefined;
  let stage = "authorization";
  try {
    const bearer = String(req.headers.authorization || "");
    if (!(await isAdmin(bearer))) return res.status(403).json({ error: "Alleen voor beheerders" });
    const input = parseRequest(req.query || {});
    if ((input.action === "send") !== (req.method === "POST")) throw new MailError("Methode niet toegestaan", 405);
    const composed = input.action === "send" ? composeInput(req.body || {}) : undefined;
    stage = "credential";
    const password = await credential(input.account, bearer);
    imap = new ImapFlow({ host: HOST, port: 993, secure: true, auth: { user: input.address, pass: password }, logger: false, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
    stage = "connect";
    await imap.connect();
    stage = "mailbox";
    if (composed) {
      // Build one RFC822 message for both SMTP delivery and the Sent copy.
      const composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
      const built = await composer.sendMail({ from: { name: "Harkas IT", address: input.address }, ...composed });
      if (!Buffer.isBuffer(built.message)) throw new MailError("E-mail kon niet worden opgebouwd.", 503);
      const transport = nodemailer.createTransport({ host: HOST, port: 465, secure: true, auth: { user: input.address, pass: password }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000, logger: false });
      try { await transport.sendMail({ envelope: { from: input.address, to: [composed.to] }, raw: built.message }); }
      finally { transport.close(); }
      let saved = false;
      try {
        const folders = await imap.list();
        const sent = folders.find(f => f.specialUse === "\\Sent") || folders.find(f => /^(INBOX\.)?(Sent|Sent Messages|Verzonden)$/i.test(f.path));
        if (sent) { await imap.append(sent.path, built.message, ["\\Seen"]); saved = true; }
      } catch { /* SMTP acceptance is authoritative: never report failure and encourage duplicate delivery. */ }
      return res.json({ sent: true, saved });
    }
    const folderList = input.action === "list" && input.page === 1 ? await imap.list() : undefined;
    const box = await imap.mailboxOpen(input.folder, { readOnly: true });
    if (input.action !== "list" && String(req.query.uidValidity || "") !== String(box.uidValidity)) throw new MailError("Deze map is gewijzigd. Vernieuw de mailbox en open het bericht opnieuw.", 409);
    if (input.action === "list") {
      const end = Math.max(0, box.exists - (input.page - 1) * 30);
      const entries = end ? await imap.fetchAll(`${Math.max(1, end - 29)}:${end}`, { uid: true, envelope: true, flags: true, internalDate: true }) : [];
      return res.json({ account: input.address, folder: input.folder, page: input.page, total: box.exists, uidValidity: String(box.uidValidity),
        folders: folderList?.filter(f => !f.flags.has("\\Noselect")).map(f => ({ path: f.path, name: f.name, specialUse: f.specialUse })),
        messages: entries.reverse().map(m => ({ uid: m.uid, subject: m.envelope?.subject || "Zonder onderwerp", from: addresses(m.envelope?.from), date: m.internalDate || m.envelope?.date, unread: !m.flags?.has("\\Seen") })),
      });
    }
    const meta = await imap.fetchOne(input.uid, { size: true }, { uid: true });
    if (!meta) throw new MailError("Bericht niet gevonden.", 404);
    if (meta.size > 20 * 1024 * 1024) throw new MailError("Dit bericht is groter dan 20 MB. Open het in webmail.", 413);
    const source = await imap.fetchOne(input.uid, { source: true }, { uid: true });
    if (!source || !source.source) throw new MailError("Bericht niet gevonden.", 404);
    const mail = await simpleParser(source.source, { skipTextToHtml: true, skipImageLinks: true });
    if (input.action === "attachment") {
      const index = Number(req.query.attachment);
      if (!Number.isSafeInteger(index) || index < 0 || !mail.attachments[index]) throw new MailError("Bijlage niet gevonden.", 404);
      const attachment = mail.attachments[index];
      if (attachment.size > 3 * 1024 * 1024) throw new MailError("Deze bijlage is groter dan 3 MB. Download deze via webmail.", 413);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encodeURIComponent((attachment.filename || "bijlage").replace(/[\r\n/\\]/g, "_")));
      return res.send(attachment.content);
    }
    return res.json({ uid: input.uid, account: input.address, subject: mail.subject || "Zonder onderwerp", from: addresses(mail.from?.value), to: addresses(Array.isArray(mail.to) ? mail.to.flatMap(x=>x.value) : mail.to?.value), replyTo: addresses(mail.replyTo?.value || mail.from?.value), date: mail.date, text: (mail.text || "Dit bericht bevat geen leesbare tekst. Open het in webmail voor de volledige opmaak.").slice(0, 300000), attachments: mail.attachments.map((a, index) => ({ index, filename: a.filename || "bijlage", size: a.size })) });
  } catch (error) {
    if (error instanceof MailError) return res.status(error.status).json({ error: error.message });
    const failure = error as { authenticationFailed?: boolean; code?: string; responseText?: string };
    const authenticationFailed = Boolean(failure?.authenticationFailed || /AUTHENTICATIONFAILED/i.test(failure?.responseText || ""));
    console.warn("Admin mailbox unavailable", { stage, authenticationFailed, code: /^[A-Z_]{1,32}$/.test(failure?.code || "") ? failure.code : "MAIL_FAILURE" });
    if (authenticationFailed) return res.status(503).json({ error: "De mailserver accepteert het opgeslagen mailboxwachtwoord niet. Werk het webmailwachtwoord bij in Wachtwoorden en probeer opnieuw." });
    return res.status(503).json({ error: "Mailbox openen mislukt. Controleer de opgeslagen inloggegevens of probeer opnieuw." });
  } finally { if (imap) await imap.logout().catch(() => {}); }
}
