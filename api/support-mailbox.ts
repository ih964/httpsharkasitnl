import { Pool } from "pg";
import {
  mailboxClient,
  importInbound,
  SUPPORT_ADDRESS,
} from "../server/support-inbound.js";
let pool: Pool | undefined;
function db() {
  if (!process.env.HARKAS_SUPABASE_DSN)
    throw new Error("Database niet geconfigureerd");
  return (pool ??= new Pool({
    connectionString: process.env.HARKAS_SUPABASE_DSN,
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 6000,
  }));
}
const uuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
async function identity(header: string) {
  if (!header.startsWith("Bearer ")) return null;
  const url =
    process.env.HARKAS_SUPABASE_URL ||
    "https://uqkrxzlkvjdmebsbdrmb.supabase.co";
  const r = await fetch(url + "/auth/v1/user", {
    headers: {
      Authorization: header,
      apikey:
        process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const u = await r.json();
  return uuid(u.id)
    ? { id: u.id as string, email: String(u.email ?? "").toLowerCase() }
    : null;
}
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method))
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const user = await identity(String(req.headers.authorization ?? ""));
    if (!user) return res.status(401).json({ error: "Niet aangemeld" });
    const staff = !!(
      await db().query("SELECT public.has_module($1,'tickets') allowed", [
        user.id,
      ])
    ).rows[0]?.allowed;
    const action = String(req.query?.action ?? req.body?.action ?? "status");
    if (req.method === "GET" && ["files", "download"].includes(action)) {
      const ticketId = String(req.query.ticketId ?? "");
      if (!uuid(ticketId))
        return res.status(400).json({ error: "Ongeldig ticket" });
      const allowed = await db().query(
        "SELECT 1 FROM public.support_tickets t WHERE t.id=$1 AND ($2::boolean OR EXISTS(SELECT 1 FROM public.support_portal_access a WHERE a.customer_id=t.customer_id AND lower(a.email)=$3))",
        [ticketId, staff, user.email],
      );
      if (!allowed.rows.length)
        return res.status(403).json({ error: "Geen toegang" });
      if (action === "files") {
        const r = await db().query(
          "SELECT f.id,f.filename,f.mime_type,f.size_bytes,i.created_at FROM harkas_support_private.inbound_files f JOIN harkas_support_private.inbound i ON i.id=f.inbound_id WHERE i.ticket_id=$1 AND i.status='imported' ORDER BY i.created_at",
          [ticketId],
        );
        return res.json({ files: r.rows });
      }
      if (!uuid(req.query.id))
        return res.status(400).json({ error: "Ongeldige bijlage" });
      const f = (
        await db().query(
          "SELECT f.* FROM harkas_support_private.inbound_files f JOIN harkas_support_private.inbound i ON i.id=f.inbound_id WHERE f.id=$1 AND i.ticket_id=$2 AND i.status='imported'",
          [req.query.id, ticketId],
        )
      ).rows[0];
      if (!f) return res.status(404).end();
      res.setHeader("Content-Type", f.mime_type);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''" + encodeURIComponent(f.filename),
      );
      return res.send(f.data);
    }
    if (!staff)
      return res.status(403).json({ error: "Alleen servicedeskmedewerkers" });
    if (req.method === "GET") {
      const m = (
        await db().query(
          "SELECT configured_at,last_checked_at,last_error FROM harkas_support_private.mailbox WHERE singleton",
        )
      ).rows[0];
      const intake = await db().query(
        "SELECT id,sender,subject,body,reason,created_at,(SELECT count(*) FROM harkas_support_private.inbound_files f WHERE f.inbound_id=i.id) AS files FROM harkas_support_private.inbound i WHERE status='review' ORDER BY created_at LIMIT 50",
      );
      return res.json({
        configured: !!m,
        mailbox: SUPPORT_ADDRESS,
        ...m,
        intake: intake.rows,
      });
    }
    if (action === "configure") {
      const password = req.body?.password;
      if (typeof password !== "string" || !password || password.length > 1000)
        return res.status(400).json({ error: "Vul het mailboxwachtwoord in." });
      const imap = mailboxClient({ password });
      let validity: string;
      try {
        await imap.connect();
        const box = await imap.mailboxOpen("INBOX", { readOnly: true });
        validity = String(box.uidValidity);
      } catch {
        return res.status(400).json({
          error:
            "Aanmelden bij de supportmailbox mislukt. Controleer het wachtwoord.",
        });
      } finally {
        await imap.logout().catch(() => {});
      }
      const client = await db().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(710212026)");
        const old = (
          await client.query(
            "SELECT secret_id FROM harkas_support_private.mailbox WHERE singleton FOR UPDATE",
          )
        ).rows[0];
        const secret = JSON.stringify({ password });
        let secretId = old?.secret_id;
        if (secretId)
          await client.query("SELECT vault.update_secret($1,$2)", [
            secretId,
            secret,
          ]);
        else
          secretId = (
            await client.query(
              "SELECT vault.create_secret($1,'harkas_support_imap','Support mailbox credential') id",
              [secret],
            )
          ).rows[0].id;
        await client.query(
          "INSERT INTO harkas_support_private.mailbox(singleton,secret_id,uid_validity,last_uid) VALUES(true,$1,$2,0) ON CONFLICT(singleton) DO UPDATE SET secret_id=EXCLUDED.secret_id,uid_validity=EXCLUDED.uid_validity,last_uid=CASE WHEN mailbox.uid_validity=EXCLUDED.uid_validity THEN mailbox.last_uid ELSE 0 END,last_error=NULL",
          [secretId, validity],
        );
        await client.query("COMMIT");
        return res.json({ ok: true });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    if (["approve", "ignore"].includes(action) && uuid(req.body.id)) {
      const client = await db().connect();
      try {
        await client.query("BEGIN");
        if (action === "approve") {
          const n = String(req.body.ticketNumber ?? "").replace(/^HIT-/i, "");
          if (!/^\d{1,15}$/.test(n)) {
            await client.query("ROLLBACK");
            return res
              .status(400)
              .json({ error: "Vul een geldig ticketnummer in." });
          }
          const t = (
            await client.query(
              "SELECT id FROM public.support_tickets WHERE ticket_no=$1",
              [n],
            )
          ).rows[0];
          if (!t) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Ticket bestaat niet." });
          }
          await importInbound(client, req.body.id, t.id, false);
        } else
          await client.query(
            "UPDATE harkas_support_private.inbound SET status='ignored',reason='Handmatig afgehandeld door servicedesk' WHERE id=$1 AND status='review'",
            [req.body.id],
          );
        await client.query("COMMIT");
        return res.json({ ok: true });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    return res.status(400).json({ error: "Ongeldige actie" });
  } catch {
    return res
      .status(503)
      .json({ error: "Mailboxverwerking tijdelijk niet beschikbaar." });
  }
}
