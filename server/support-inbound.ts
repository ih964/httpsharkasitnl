import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import type { Pool, PoolClient } from "pg";
import { createHash, randomUUID } from "node:crypto";
export type MailConfig = { password: string };
export const SUPPORT_HOST = "shared70.cloud86-host.nl";
export const SUPPORT_ADDRESS = "support@harkasit.nl";
export function mailboxClient(config: MailConfig) {
  return new ImapFlow({
    host: SUPPORT_HOST,
    port: 993,
    secure: true,
    auth: { user: SUPPORT_ADDRESS, pass: config.password },
    logger: false,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
}
export function cleanReply(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (
      /^(Van|From):/i.test(line.trim()) &&
      /(?:Verzonden|Sent|Onderwerp|Subject):/i.test(
        lines.slice(index + 1, index + 5).join("\n"),
      )
    )
      break;
    if (
      /^\s*>/.test(line) ||
      /^\s*(On .+wrote:|Op .+(?:schreef|geschreven).*:|-{2,}\s*(Original Message|Oorspronkelijk bericht|Forwarded message))/i.test(
        line,
      )
    )
      break;
    out.push(line);
  }
  return out
    .join("\n")
    .split(/\n-- ?\n/)[0]
    .trim()
    .slice(0, 10000);
}
export function mailReferences(mail: ParsedMail) {
  return [
    ...new Set(
      [
        mail.inReplyTo,
        ...(Array.isArray(mail.references)
          ? mail.references
          : mail.references
            ? [mail.references]
            : []),
      ]
        .filter(Boolean)
        .map(String),
    ),
  ];
}
export function isAutomatic(mail: ParsedMail) {
  const auto = String(mail.headers.get("auto-submitted") ?? "").toLowerCase();
  return (
    (!!auto && auto !== "no") ||
    /^(bulk|junk|list)$/i.test(String(mail.headers.get("precedence") ?? "")) ||
    !!mail.headers.get("list-id") ||
    !!mail.headers.get("x-harkas-support") ||
    /mailer-daemon|postmaster/i.test(mail.from?.value?.[0]?.address ?? "")
  );
}
const allowedMime = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
]);
export async function importInbound(
  client: PoolClient,
  inboundId: string,
  ticketId: string,
  requireReference = true,
) {
  const primary = (
    await client.query(
      "SELECT EXISTS(SELECT 1 FROM public.harkas_resilience_state s CROSS JOIN public.harkas_failover_control c WHERE s.singleton AND c.resource='harkas-admin-db' AND s.role='primary' AND c.writer='supabase' AND s.epoch=c.epoch) allowed",
    )
  ).rows[0]?.allowed;
  if (!primary)
    throw new Error(
      "Ticketimport gepauzeerd: database is niet de actieve primary.",
    );
  const row = (
    await client.query(
      "SELECT * FROM harkas_support_private.inbound WHERE id=$1 FOR UPDATE",
      [inboundId],
    )
  ).rows[0];
  if (!row || row.status !== "review")
    throw new Error("Bericht is al verwerkt of bestaat niet.");
  const ticket = (
    await client.query(
      "SELECT * FROM public.support_tickets WHERE id=$1 FOR UPDATE",
      [ticketId],
    )
  ).rows[0];
  if (!ticket) throw new Error("Ticket bestaat niet.");
  if (requireReference && ticket.status === "gesloten") return false;
  const allowed = await client.query(
    "SELECT 1 FROM public.support_portal_access WHERE customer_id=$1 AND lower(email)=$2",
    [ticket.customer_id, row.sender],
  );
  if (requireReference && !allowed.rows.length) return false;
  // Capture existing event IDs so only this import's confirmation goes to the replier.
  const before = (
    await client.query(
      "SELECT id FROM public.support_email_events WHERE ticket_id=$1",
      [ticketId],
    )
  ).rows.map((r) => r.id);
  await client.query(
    "INSERT INTO public.support_ticket_messages(ticket_id,author_id,sender_type,body,is_internal) VALUES($1,$2,'klant',$3,false)",
    [
      ticketId,
      randomUUID(),
      row.body || "De klant heeft bijlagen per e-mail aangeleverd.",
    ],
  );
  const files = (
    await client.query(
      "SELECT filename FROM harkas_support_private.inbound_files WHERE inbound_id=$1",
      [inboundId],
    )
  ).rows;
  for (const f of files)
    await client.query(
      "SELECT public.support_enqueue_notification_pair($1,NULL,'attachment_added',jsonb_build_object('filename',$2::text))",
      [ticketId, f.filename],
    );
  await client.query(
    "UPDATE public.support_email_events SET payload=jsonb_set(payload,'{requester_email}',to_jsonb($2::text)) WHERE ticket_id=$1 AND recipient_type='customer' AND NOT(id=ANY($3::uuid[]))",
    [ticketId, row.sender, before],
  );
  await client.query(
    "UPDATE harkas_support_private.inbound SET status='imported',reason='Gekoppeld aan ticket',ticket_id=$2 WHERE id=$1",
    [inboundId, ticketId],
  );
  return true;
}
export async function pollSupportMailbox(pool: Pool) {
  const client = await pool.connect();
  let imap: ImapFlow | undefined;
  try {
    if (
      !(await client.query("SELECT pg_try_advisory_lock(710212026) AS locked"))
        .rows[0].locked
    )
      return;
    const primary = (
      await client.query(
        "SELECT EXISTS(SELECT 1 FROM public.harkas_resilience_state s CROSS JOIN public.harkas_failover_control c WHERE s.singleton AND c.resource='harkas-admin-db' AND s.role='primary' AND c.writer='supabase' AND s.epoch=c.epoch) allowed",
      )
    ).rows[0]?.allowed;
    if (!primary) return;
    const config = (
      await client.query(
        "SELECT m.*,v.decrypted_secret FROM harkas_support_private.mailbox m JOIN vault.decrypted_secrets v ON v.id=m.secret_id WHERE singleton",
      )
    ).rows[0];
    if (!config) return;
    imap = mailboxClient(JSON.parse(config.decrypted_secret));
    await imap.connect();
    const box = await imap.mailboxOpen("INBOX", { readOnly: true });
    if (String(box.uidValidity) !== config.uid_validity) {
      await client.query(
        "UPDATE harkas_support_private.mailbox SET last_error='Mailboxidentiteit gewijzigd: opnieuw verbinden om een veilig startpunt te kiezen.' WHERE singleton",
      );
      return;
    }
    const end = Number(box.uidNext) - 1;
    let cursor = Number(config.last_uid);
    const start = cursor + 1;
    if (start <= end) {
      const listing = await imap.fetchAll(
        `${start}:${end}`,
        { uid: true, size: true },
        { uid: true },
      );
      for (const entry of listing.slice(0, 15)) {
        if (entry.size > 20 * 1024 * 1024) {
          await client.query(
            "INSERT INTO harkas_support_private.inbound(message_key,sender,subject,body,reason) VALUES($1,'onbekend','Bericht te groot','','Groter dan 20 MB; bekijk dit bericht in de supportmailbox') ON CONFLICT DO NOTHING",
            [`uid:${config.uid_validity}:${entry.uid}`],
          );
          cursor = entry.uid;
          continue;
        }
        const raw = await imap.fetchOne(
          entry.uid,
          { source: true },
          { uid: true },
        );
        if (!raw || !raw.source) continue;
        let mail: ParsedMail;
        try {
          mail = await simpleParser(raw.source, {
            skipHtmlToText: true,
            skipTextToHtml: true,
            skipImageLinks: true,
          });
        } catch {
          await client.query(
            "INSERT INTO harkas_support_private.inbound(message_key,sender,subject,body,reason) VALUES($1,'onbekend','Onleesbaar mailbericht','','Bekijk het oorspronkelijke bericht in de supportmailbox') ON CONFLICT DO NOTHING",
            [`uid:${config.uid_validity}:${entry.uid}`],
          );
          cursor = entry.uid;
          continue;
        }

        const senders = mail.from?.value ?? [];
        const sender =
          senders.length === 1
            ? String(senders[0].address ?? "").toLowerCase()
            : "";
        const key = mail.messageId
          ? "id:" + createHash("sha256").update(mail.messageId).digest("hex")
          : `uid:${config.uid_validity}:${entry.uid}`;
        const auto = isAutomatic(mail);
        const body = cleanReply(mail.text ?? "");
        const files = mail.attachments.filter(
          (a) => a.contentDisposition !== "inline",
        );
        const safeFiles = files.every(
          (a) => allowedMime.has(a.contentType) && a.size <= 10 * 1024 * 1024,
        );
        await client.query("BEGIN");
        try {
          const record = await client.query(
            "INSERT INTO harkas_support_private.inbound(message_key,sender,subject,body,status,reason) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id",
            [
              key,
              sender || "onbekend",
              (mail.subject ?? "Zonder onderwerp").slice(0, 160),
              body,
              auto ? "ignored" : "review",
              auto
                ? "Automatisch bericht: geen ticketreactie"
                : "Geen betrouwbare ticketkoppeling of contactpersoon; beoordelen",
            ],
          );
          if (record.rows[0] && !auto) {
            const id = record.rows[0].id;
            for (const f of files.filter(
              (a) =>
                allowedMime.has(a.contentType) && a.size <= 10 * 1024 * 1024,
            ))
              await client.query(
                "INSERT INTO harkas_support_private.inbound_files(inbound_id,filename,mime_type,size_bytes,data) VALUES($1,$2,$3,$4,$5)",
                [
                  id,
                  (f.filename ?? "bijlage")
                    .replace(/[\r\n/\\]/g, "_")
                    .slice(0, 180),
                  f.contentType,
                  f.size,
                  f.content,
                ],
              );
            const refs = mailReferences(mail);
            const candidates = (
              await client.query(
                "SELECT DISTINCT ticket_id FROM harkas_support_private.mail_refs WHERE reference=ANY($1::text[])",
                [refs],
              )
            ).rows;
            if (candidates.length === 1 && safeFiles && (body || files.length))
              await importInbound(client, id, candidates[0].ticket_id);
            if (!safeFiles)
              await client.query(
                "UPDATE harkas_support_private.inbound SET reason='Bijlage buiten toegestane bestandstypen/grootte; controleer originele mail' WHERE id=$1",
                [id],
              );
          }
          await client.query("COMMIT");
          cursor = entry.uid;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
      }
    }
    await client.query(
      "UPDATE harkas_support_private.mailbox SET last_uid=$1,last_checked_at=now(),last_error=NULL WHERE singleton",
      [cursor],
    );
  } catch {
    await client
      .query(
        "UPDATE harkas_support_private.mailbox SET last_checked_at=now(),last_error='Mail ophalen mislukt. Controleer mailboxverbinding en aanmeldgegevens.' WHERE singleton",
      )
      .catch(() => {});
  } finally {
    if (imap) await imap.logout().catch(() => {});
    await client.query("SELECT pg_advisory_unlock(710212026)").catch(() => {});
    client.release();
  }
}
