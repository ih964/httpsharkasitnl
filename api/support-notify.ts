import { Pool } from "pg";

const SUPABASE_URL = process.env.HARKAS_SUPABASE_URL || "https://uqkrxzlkvjdmebsbdrmb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const SUPPORT_EMAIL = "info@harkasit.nl";
const SITE_URL = "https://www.harkasit.nl";
let pool: Pool | undefined;

function db() {
  const connectionString = process.env.HARKAS_SUPABASE_DSN;
  if (!connectionString) throw new Error("Database not configured");
  pool ??= new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 6000 });
  return pool;
}

type EventRow = {
  id: string;
  ticket_id: string;
  kind: "created" | "customer_reply" | "staff_reply" | "status_changed";
  ticket_no: string;
  subject: string;
  requester_email: string;
  status: string;
};

async function getAuthenticatedUser(authorization: string): Promise<string | null> {
  if (!authorization.startsWith("Bearer ") || !SUPABASE_PUBLISHABLE_KEY) return null;
  const result = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: authorization },
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) return null;
  const user = await result.json() as { id?: string };
  return typeof user.id === "string" && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null;
}

async function claimNotifications(ticketId: string | null, userId: string | null, cron: boolean): Promise<EventRow[]> {
  const client = await db().connect();
  let inTransaction = false;
  try {
    await client.query("BEGIN");
    inTransaction = true;
    await client.query("SET LOCAL statement_timeout = '12000ms'");
    const primary = await client.query(
      "SELECT s.role, c.writer, s.epoch AS state_epoch, c.epoch AS control_epoch FROM public.harkas_resilience_state s CROSS JOIN public.harkas_failover_control c WHERE s.singleton=true AND c.resource='harkas-admin-db'"
    );
    const state = primary.rows[0];
    if (!state || state.role !== "primary" || state.writer !== "supabase" ||
        String(state.state_epoch) !== String(state.control_epoch)) {
      throw new Error("Support notifications paused: primary writer not verified");
    }
    const staff = userId ? await client.query(
      "SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role::text='admin') OR EXISTS(SELECT 1 FROM public.user_module_access WHERE user_id=$1 AND module_key='tickets') AS allowed",
      [userId],
    ) : null;
    const staffAllowed = Boolean(staff?.rows[0]?.allowed);
    const selected = await client.query<EventRow>(
      [
        "SELECT e.id,e.ticket_id,e.kind,t.ticket_no::text,t.subject,t.requester_email,t.status",
        "FROM public.support_email_events e",
        "JOIN public.support_tickets t ON t.id=e.ticket_id",
        "WHERE ((e.state='pending' AND e.next_attempt_at <= now())",
        "OR (e.state='processing' AND e.locked_at < now()-interval '15 minutes'))",
        "AND ($1::uuid IS NULL OR e.ticket_id=$1::uuid)",
        "AND ($2::boolean OR e.actor_id=$3::uuid OR $4::boolean)",
        "ORDER BY e.created_at LIMIT 8 FOR UPDATE OF e SKIP LOCKED"
      ].join(" "),
      [ticketId, cron, userId, staffAllowed],
    );
    if (selected.rows.length) {
      await client.query(
        "UPDATE public.support_email_events SET state='processing', locked_at=now(), attempts=attempts+1 WHERE id=ANY($1::uuid[])",
        [selected.rows.map(e => e.id)],
      );
    }
    await client.query("COMMIT");
    inTransaction = false;
    return selected.rows;
  } finally {
    if (inTransaction) {
      try { await client.query("ROLLBACK"); } catch { /* connection ends */ }
    }
    client.release();
  }
}

function subjectLine(ticket: EventRow): string {
  const title = ticket.subject.replace(/[\r\n\t]+/g, " ").slice(0, 140);
  const prefix = ticket.kind === "created" ? "Nieuw supportticket"
    : ticket.kind === "customer_reply" ? "Nieuwe klantreactie"
    : ticket.kind === "staff_reply" ? "Reactie van Harkas IT"
    : "Status gewijzigd";
  return prefix + " HIT-" + String(ticket.ticket_no).padStart(5, "0") + ": " + title;
}

function messageText(ticket: EventRow): string {
  const number = "HIT-" + String(ticket.ticket_no).padStart(5, "0");
  const isStaffTarget = ticket.kind === "created" || ticket.kind === "customer_reply";
  const intro = ticket.kind === "created" ? "Er is een nieuw supportticket ingediend."
    : ticket.kind === "customer_reply" ? "Er is een nieuwe reactie van een klant toegevoegd."
    : ticket.kind === "staff_reply" ? "Harkas IT heeft gereageerd op je ticket."
    : "De status van je supportticket is gewijzigd.";
  return [
    "Harkas IT – Servicedesk", "",
    intro, "",
    "Ticket: " + number,
    "Onderwerp: " + ticket.subject.replace(/[\r\n]+/g, " "),
    ...(isStaffTarget ? ["Contact: " + ticket.requester_email] : ["Status: " + ticket.status.replace(/_/g, " ")]),
    "", isStaffTarget ? SITE_URL + "/admin/tickets" : SITE_URL + "/support",
    "", "Dit is een automatische notificatie. Reageer via het klantenportaal.",
  ].join("\n");
}

async function sendOne(event: EventRow): Promise<boolean> {
  const recipient = event.kind === "created" || event.kind === "customer_reply"
    ? SUPPORT_EMAIL : event.requester_email.trim();
  try {
    if (!process.env.RESEND_API_KEY) throw new Error("Mail provider not configured");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) throw new Error("Invalid email destination");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": "support-notification-" + event.id,
      },
      body: JSON.stringify({
        from: "Harkas IT <info@harkasit.nl>",
        to: [recipient],
        reply_to: SUPPORT_EMAIL,
        subject: subjectLine(event),
        text: messageText(event),
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json().catch(() => null) as { id?: string } | null;
    if (!response.ok || !data?.id) {
      throw new Error("Email provider rejected notification, HTTP " + response.status);
    }
    await db().query(
      "UPDATE public.support_email_events SET state='sent',provider_message_id=$2,sent_at=now(),last_error=NULL WHERE id=$1 AND state='processing'",
      [event.id, data.id],
    );
    return true;
  } catch (error) {
    const safeMessage = error instanceof Error ? error.name + ": " + error.message : "Unknown mail delivery failure";
    console.error("[support-notify] delivery failure", { event: event.id, error: safeMessage });
    try {
      await db().query(
        [
          "UPDATE public.support_email_events SET",
          "state=CASE WHEN attempts >= 6 THEN 'failed' ELSE 'pending' END,",
          "next_attempt_at=now()+make_interval(mins => LEAST(1440,attempts*15)),",
          "locked_at=NULL,last_error=$2",
          "WHERE id=$1 AND state='processing'"
        ].join(" "),
        [event.id, safeMessage.slice(0, 250)],
      );
    } catch (e) {
      console.error("[support-notify] could not record failed delivery", e instanceof Error ? e.name : "unknown");
    }
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const isCron = req.method === "GET";
  try {
    let userId: string | null = null;
    let ticketId: string | null = null;
    if (isCron) {
      const secret = process.env.CRON_SECRET;
      if (!secret || req.headers.authorization !== "Bearer " + secret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    } else {
      userId = await getAuthenticatedUser(String(req.headers.authorization || ""));
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const candidate = String(req.body?.ticketId || "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)) {
        return res.status(400).json({ error: "Invalid ticket" });
      }
      ticketId = candidate;
    }
    const events = await claimNotifications(ticketId, userId, isCron);
    const outcomes = await Promise.all(events.map(sendOne));
    return res.status(200).json({ ok: true, processed: events.length, sent: outcomes.filter(Boolean).length });
  } catch (error) {
    console.error("[support-notify] request failed", error instanceof Error ? error.name : "unknown");
    return res.status(503).json({ error: "Notification delivery temporarily unavailable" });
  }
}
