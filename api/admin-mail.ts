import { Pool } from "pg";
import { mailDatabaseOptions, mailFailureCode, isMailDatabaseBusy } from "../server/mail-database.js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";

const HOST = "shared70.cloud86-host.nl";
const AUTH_URL = process.env.HARKAS_SUPABASE_URL || "https://uqkrxzlkvjdmebsbdrmb.supabase.co";
const ACCOUNTS = { info: 'info@harkasit.nl', administratie: 'administratie@harkasit.nl', support: 'support@harkasit.nl', webbuilder_info: 'info@harkaswebbuilder.nl', webbuilder_admin: 'admin@harkaswebbuilder.nl' } as const;
const MAIL_VAULT_IDS = { info: '8aec51a9-3504-447e-99cf-2e5cb6cdea5f', administratie: '8aec51a9-3504-447e-99cf-2e5cb6cdea5f', webbuilder_info: '07b1de96-f2ea-406b-abe5-8e6619576abb', webbuilder_admin: 'c4e70f1e-407a-4a41-a42a-ee91e77c14d7' } as const;
let pool: Pool | undefined;
function db() {
  if (!pool) {
    pool = new Pool(mailDatabaseOptions(process.env.HARKAS_SUPABASE_DSN));
    pool.on('error', error => console.warn('Mail database idle connection failed', { code: mailFailureCode(error) }));
  }
  return pool;
}
class MailError extends Error { constructor(message: string, public status = 400) { super(message); } }
function messageIdentifier(value: unknown, label: string) {
  if ((typeof value !== "string" && typeof value !== "number") || !/^[1-9]\d{0,9}$/.test(String(value))) throw new MailError(label);
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id > 4294967295) throw new MailError(label);
  return id;
}
function mailboxClient(address: string, password: string) {
  return new ImapFlow({ host: HOST, port: 993, secure: true, auth: { user: address, pass: password }, logger: false, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
}
export function parseRequest(query: Record<string, unknown>) {
  const account = String(query.account || "");
  if (!Object.prototype.hasOwnProperty.call(ACCOUNTS, account)) throw new MailError("Ongeldige mailbox");
  const folder = String(query.folder || "INBOX");
  if (folder.length > 255 || /[\0\r\n]/.test(folder)) throw new MailError("Ongeldige map");
  const action = String(query.action || "list");
  if (!["list", "message", "attachment", "send", "trash", "trash-many"].includes(action)) throw new MailError("Ongeldige actie");
  const page = Number(query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new MailError("Ongeldige pagina");
  const needsMessage = ["message", "attachment", "trash"].includes(action);
  const uid = needsMessage ? messageIdentifier(query.uid, "Ongeldig bericht") : 0;
  const uidValidity = (needsMessage || action === "trash-many") ? String(messageIdentifier(query.uidValidity, "Ongeldige berichtverwijzing. Open het bericht opnieuw vanuit de mailbox.")) : "";
  return { account: account as keyof typeof ACCOUNTS, address: ACCOUNTS[account as keyof typeof ACCOUNTS], folder, action, page, uid, uidValidity };
}
export function bulkTrashInput(body: Record<string, unknown>): number[] {
  if (!Array.isArray(body.uids) || body.uids.length < 1 || body.uids.length > 100) throw new MailError("Selecteer 1 tot 100 berichten per mailboxaanvraag.");
  const uids = body.uids.map(value => messageIdentifier(value, "Ongeldige berichtselectie."));
  if (new Set(uids).size !== uids.length) throw new MailError("De selectie bevat dubbele berichten.");
  return uids;
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
  // Each Webbuilder mailbox has its own saved webmail credential. Only IT info/administratie share a credential.
  // Decryption runs on the server with the requesting admin's identity. Never return it to the browser.
  const response = await fetch(AUTH_URL + "/functions/v1/decrypt-password", {
    method: "POST", headers: { Authorization: bearer, apikey: process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY || "", "Content-Type": "application/json" },
    body: JSON.stringify({ id: MAIL_VAULT_IDS[account] }), signal: AbortSignal.timeout(10000),
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
    if (["send", "trash", "trash-many"].includes(input.action) !== (req.method === "POST")) throw new MailError("Methode niet toegestaan", 405);
    const composed = input.action === "send" ? composeInput(req.body || {}) : undefined;
    const bulkUids = input.action === "trash-many" ? bulkTrashInput(req.body || {}) : undefined;
    const isTrash = input.action === "trash" || input.action === "trash-many";
    stage = "credential";
    const password = await credential(input.account, bearer);
    if (composed) {
      stage = "compose";
      // Build one RFC822 message for SMTP and the optional Sent copy.
      const composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
      const built = await composer.sendMail({ from: { name: input.address.endsWith("@harkaswebbuilder.nl") ? "Harkas Webbuilder" : "Harkas IT", address: input.address }, ...composed });
      if (!Buffer.isBuffer(built.message)) throw new MailError("E-mail kon niet worden opgebouwd.", 503);
      stage = "smtp";
      const transport = nodemailer.createTransport({ host: HOST, port: 465, secure: true, auth: { user: input.address, pass: password }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000, logger: false });
      let delivery;
      try { delivery = await transport.sendMail({ envelope: { from: input.address, to: [composed.to] }, raw: built.message }); }
      finally { try { transport.close(); } catch { /* Cleanup cannot turn an accepted send into a failure. */ } }
      const accepted = Array.isArray(delivery.accepted) && delivery.accepted.some((recipient: string | { address?: string }) =>
        (typeof recipient === "string" ? recipient : recipient.address || "").toLowerCase() === composed.to.toLowerCase());
      if (!accepted) {
        if (delivery.rejected?.length) throw new MailError("De mailserver heeft de ontvanger geweigerd. Controleer het e-mailadres.", 422);
        throw new MailError("Verzending is niet bevestigd. Controleer eerst Verzonden of webmail voordat je opnieuw verstuurt.", 503);
      }
      // An unavailable IMAP archive must never prevent SMTP delivery or trigger a retry.
      stage = "sent-copy";
      let saved = false;
      try {
        imap = mailboxClient(input.address, password);
        await imap.connect();
        const folders = (await imap.list()).filter(f => !f.flags.has("\\Noselect"));
        const sent = folders.find(f => f.specialUse === "\\Sent") || folders.find(f => /^(INBOX\.)?(Sent|Sent Messages|Verzonden)$/i.test(f.path));
        if (sent) saved = Boolean(await imap.append(sent.path, built.message, ["\\Seen"]));
      } catch { /* SMTP acceptance is authoritative; report sent:true, saved:false. */ }
      return res.json({ sent: true, saved });
    }
    imap = mailboxClient(input.address, password);
    stage = "connect";
    await imap.connect();
    stage = isTrash ? "trash" : "mailbox";
    const folderList = input.action === "list" && input.page === 1 ? await imap.list() : undefined;
    const box = await imap.mailboxOpen(input.folder, { readOnly: !isTrash });
    if (input.action !== "list" && input.uidValidity !== String(box.uidValidity)) throw new MailError("Deze map is gewijzigd. Vernieuw de mailbox en open het bericht opnieuw.", 409);
    if (isTrash) {
      if (box.readOnly) throw new MailError("Deze map kan niet worden aangepast.", 403);
      const folders = await imap.list();
      const trash = folders.find(f => f.specialUse === "\\Trash" && !f.flags.has("\\Noselect"));
      if (!trash) throw new MailError("De prullenbak kon niet worden gevonden. Verwijder het bericht via webmail.", 503);
      if (trash.path === box.path) throw new MailError("Dit bericht staat al in de prullenbak. Definitief verwijderen kan alleen via webmail.", 409);
      // ImapFlow otherwise falls back to COPY + DELETE/EXPUNGE. Only native MOVE is allowed.
      const nativeMove = imap.capabilities.has("MOVE") || imap.enabled.has("IMAP4REV2") ||
        (imap.capabilities.has("IMAP4rev2") && !imap.capabilities.has("IMAP4rev1"));
      if (!nativeMove) throw new MailError("Veilig verplaatsen naar de prullenbak is niet beschikbaar. Gebruik webmail.", 503);
      if (bulkUids) {
        // Explicit UIDs only; never a sequence range, wildcard, or other mailbox.
        const existing = await imap.fetchAll(bulkUids, { uid: true }, { uid: true });
        const found = new Set(existing.map(message => message.uid));
        if (bulkUids.some(uid => !found.has(uid))) throw new MailError("Een geselecteerd bericht staat niet meer in deze map. Vernieuw en selecteer opnieuw.", 409);
        const moved = await imap.messageMove(bulkUids, trash.path, { uid: true });
        // A response loss or incomplete UID mapping must never be reported as full success.
        if (!moved || !moved.uidMap || bulkUids.some(uid => !moved.uidMap!.has(uid))) throw new MailError("Verplaatsen is niet volledig bevestigd. Vernieuw de mailbox en controleer de prullenbak.", 503);
        return res.json({ moved: true, movedUids: bulkUids, folder: trash.path });
      }
      const existing = await imap.fetchOne(input.uid, { uid: true }, { uid: true });
      if (!existing || existing.uid !== input.uid) throw new MailError("Bericht niet gevonden. Vernieuw de mailbox.", 404);
      const moved = await imap.messageMove(input.uid, trash.path, { uid: true });
      if (!moved || (moved.uidMap && !moved.uidMap.has(input.uid))) throw new MailError("Verplaatsen is niet bevestigd. Vernieuw de mailbox en controleer de prullenbak.", 503);
      return res.json({ moved: true, folder: trash.path });
    }
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
    const authenticationFailed = Boolean(failure?.authenticationFailed || failure?.code === "EAUTH" || /AUTHENTICATIONFAILED/i.test(failure?.responseText || ""));
    console.warn("Admin mailbox unavailable", { stage, authenticationFailed, code: mailFailureCode(error) });
    if (stage === "authorization" || stage === "credential") {
      const busy = isMailDatabaseBusy(error);
      return res.status(503).json({ error: busy
        ? "De verbinding voor de mailcontrole is tijdelijk bezet. Probeer over enkele seconden opnieuw. Je mailboxwachtwoord hoeft niet te worden gewijzigd."
        : "De toegangscontrole voor de mailbox is tijdelijk niet beschikbaar. Probeer opnieuw. Je mailboxwachtwoord hoeft niet te worden gewijzigd." });
    }
    if (authenticationFailed) return res.status(503).json({ error: "De mailserver accepteert het opgeslagen mailboxwachtwoord niet. Werk het webmailwachtwoord bij in Wachtwoorden en probeer opnieuw." });
    if (stage === "smtp") return res.status(503).json({ error: "Verzending is niet bevestigd. Controleer eerst Verzonden of webmail voordat je opnieuw verstuurt." });
    if (stage === "compose") return res.status(503).json({ error: "E-mail kon niet worden opgebouwd. Je bericht is niet verstuurd." });
    if (stage === "trash") return res.status(503).json({ error: "Verplaatsen is niet bevestigd. Vernieuw de mailbox en controleer de prullenbak." });
    return res.status(503).json({ error: "Mailbox openen mislukt. Controleer de opgeslagen inloggegevens of probeer opnieuw." });
  } finally { if (imap) await imap.logout().catch(() => {}); }
}
