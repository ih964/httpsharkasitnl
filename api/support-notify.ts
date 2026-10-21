import { Pool } from "pg";
import { createHash } from "node:crypto";

/**
 * Transactional ticket notification worker.
 * The database queues one immutable event per recipient.
 * Do not read the latest reply: a later reply must never change an older email.
 */
const SUPABASE_URL =
  process.env.HARKAS_SUPABASE_URL || "https://uqkrxzlkvjdmebsbdrmb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";
const STAFF_MAIL = "support@harkasit.nl";
const SITE_URL = "https://www.harkasit.nl";

type Kind =
  | "created"
  | "customer_reply"
  | "staff_reply"
  | "status_changed"
  | "priority_changed"
  | "assignee_changed"
  | "details_changed"
  | "attachment_added";
type Audience = "staff" | "customer";
type Details = Record<string, unknown>;
type EventRow = {
  id: string;
  ticket_id: string;
  ticket_no: string;
  kind: Kind;
  recipient_type: Audience;
  payload: Details;
};

let pool: Pool | undefined;
function db() {
  if (!process.env.HARKAS_SUPABASE_DSN)
    throw new Error("HARKAS_SUPABASE_DSN missing");
  pool ??= new Pool({
    connectionString: process.env.HARKAS_SUPABASE_DSN,
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 6000,
  });
  return pool;
}

function value(details: Details, key: string): string {
  const raw = details[key];
  return typeof raw === "string" ? raw : raw == null ? "" : String(raw);
}

const STATUS: Record<string, string> = {
  nieuw: "Nieuw",
  toegewezen: "Toegewezen",
  wacht_op_leverancier: "Wacht op leverancier",
  in_behandeling: "In behandeling",
  wacht_op_klant: "Wacht op klant",
  opgelost: "Opgelost",
  gesloten: "Gesloten",
};
const PRIORITY: Record<string, string> = {
  laag: "Laag",
  normaal: "Normaal",
  hoog: "Hoog",
  spoed: "Spoed",
};
const CATEGORY: Record<string, string> = {
  it_beheer: "IT-beheer",
  microsoft_365: "Microsoft 365",
  werkplek: "Werkplek / apparaat",
  security: "Cybersecurity",
  website: "Website / applicatie",
  facturatie: "Administratie & facturatie",
  overig: "Overig",
};
const entryId = (event: EventRow) => encodeURIComponent(event.ticket_id);
const numbered = (event: EventRow) =>
  "HIT-" + String(event.ticket_no).padStart(5, "0");
const safeHeading = (s: string) => s.replace(/[\r\n\t]+/g, " ").slice(0, 145);
const named = (dictionary: Record<string, string>, s: string) =>
  dictionary[s] ?? s ?? "Niet ingesteld";
const actorLabel = (event: EventRow) =>
  event.kind === "customer_reply" ? "klant" : "Harkas IT";

function title(event: EventRow) {
  const customer = event.recipient_type === "customer";
  const label: Record<Kind, [string, string]> = {
    created: ["Nieuwe melding ontvangen", "Ontvangstbevestiging"],
    customer_reply: ["Nieuwe klantreactie", "Bevestiging van je reactie"],
    staff_reply: ["Kopie van medewerkerantwoord", "Antwoord van Harkas IT"],
    status_changed: ["Ticketstatus gewijzigd", "Ticketstatus gewijzigd"],
    priority_changed: [
      "Prioriteit gewijzigd",
      "Prioriteit van je ticket gewijzigd",
    ],
    assignee_changed: [
      "Behandelaar gewijzigd",
      "Behandelaar van je ticket gewijzigd",
    ],
    details_changed: ["Ticketgegevens gewijzigd", "Je ticket is bijgewerkt"],
    attachment_added: ["Nieuwe ticketbijlage", "Nieuwe bijlage bij je ticket"],
  };
  return (
    "[" +
    numbered(event) +
    "] " +
    label[event.kind][customer ? 1 : 0] +
    " – " +
    safeHeading(value(event.payload, "subject"))
  );
}

function detailValue(p: Details, key: string) {
  const raw = value(p, key);
  if (!raw) return "Niet ingesteld";
  if (p.field === "streefdatum" && Number.isFinite(Date.parse(raw))) {
    return new Intl.DateTimeFormat("nl-NL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Amsterdam",
    }).format(new Date(raw));
  }
  if (p.field === "categorie") return named(CATEGORY, raw);
  if (p.field === "behandelgroep")
    return named(
      {
        servicedesk: "Servicedesk",
        cloud: "Cloud & Microsoft 365",
        werkplek: "Werkplek & netwerk",
        security: "Cybersecurity",
        web: "Websites & applicaties",
        administratie: "Administratie",
      },
      raw,
    );
  return raw;
}

function body(event: EventRow) {
  const p = event.payload || {};
  const customer = event.recipient_type === "customer";
  const name = value(p, "subject").replace(/[\r\n]+/g, " ");
  const common = [
    "Ticketnummer: " + numbered(event),
    "Onderwerp: " + name,
    "Huidige status: " + named(STATUS, value(p, "status")),
  ];
  let intro: string;
  let details: string[] = [];

  switch (event.kind) {
    case "created":
      intro = customer
        ? "We hebben je melding goed ontvangen en geregistreerd. Je krijgt automatisch een e-mail bij elke volgende klantzichtbare wijziging."
        : "Een klant heeft een nieuw supportticket ingediend.";
      details = [
        "Categorie: " + named(CATEGORY, value(p, "category")),
        "Prioriteit: " + named(PRIORITY, value(p, "priority")),
        "",
        "Ingediende melding:",
        value(p, "description"),
      ];
      break;
    case "customer_reply":
      intro = customer
        ? "We bevestigen dat je reactie aan het ticket is toegevoegd."
        : "De klant heeft op het ticket gereageerd.";
      details = ["", "Reactie van de klant:", value(p, "message")];
      break;
    case "staff_reply":
      intro = customer
        ? "Harkas IT heeft een antwoord op je melding geplaatst."
        : "Je antwoord aan de klant is geregistreerd.";
      details = ["", "Antwoord van Harkas IT:", value(p, "message")];
      break;
    case "status_changed":
      intro = "De status van het ticket is gewijzigd.";
      details = [
        "Vorige status: " + named(STATUS, value(p, "old")),
        "Nieuwe status: " + named(STATUS, value(p, "new")),
      ];
      break;
    case "priority_changed":
      intro = "De prioriteit van het ticket is gewijzigd.";
      details = [
        "Vorige prioriteit: " + named(PRIORITY, value(p, "old")),
        "Nieuwe prioriteit: " + named(PRIORITY, value(p, "new")),
      ];
      break;
    case "assignee_changed":
      intro = "De behandelaar van het ticket is gewijzigd.";
      details = [
        "Vorige behandelaar: " + (value(p, "old") || "Niet toegewezen"),
        "Nieuwe behandelaar: " + (value(p, "new") || "Niet toegewezen"),
      ];
      break;
    case "details_changed":
      intro = "De gegevens van het ticket zijn bijgewerkt.";
      details = [
        "Gewijzigd onderdeel: " + value(p, "field"),
        ...(p.old != null ? ["Was: " + detailValue(p, "old")] : []),
        "Nu: " + detailValue(p, "new"),
      ];
      break;
    case "attachment_added":
      intro = "Er is een nieuwe bijlage aan het ticket toegevoegd.";
      details = ["Bijlage: " + value(p, "filename")];
      break;
    default:
      intro = "Je ticket is bijgewerkt.";
  }

  return [
    "Harkas IT – Servicedesk",
    "",
    intro,
    "",
    ...common,
    "",
    ...details,
    "",
    customer
      ? "Bekijk of beantwoord je melding:"
      : "Open het ticket in Harkas IT Admin:",
    customer
      ? SITE_URL + "/support?ticket=" + entryId(event)
      : SITE_URL + "/admin/tickets?ticket=" + entryId(event),
    "",
    "Alle berichten en wijzigingen worden ook in het ticket bewaard.",
    "Interne medewerkersnotities worden nooit gedeeld met klanten.",
    "Reageer via het portaal zodat je antwoord direct bij het juiste ticket staat.",
    "Servicedesk: support@harkasit.nl",
  ].join("\n");
}

function htmlEscape(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function authenticatedUser(header: string): Promise<string | null> {
  if (!header.startsWith("Bearer ") || !SUPABASE_PUBLISHABLE_KEY) return null;
  const reply = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: header },
    signal: AbortSignal.timeout(8000),
  });
  if (!reply.ok) return null;
  const data = (await reply.json()) as { id?: string };
  return typeof data.id === "string" && /^[0-9a-f-]{36}$/i.test(data.id)
    ? data.id
    : null;
}

async function claim(
  ticketId: string | null,
  userId: string | null,
  isCron: boolean,
): Promise<EventRow[]> {
  const client = await db().connect();
  let transactional = false;
  try {
    await client.query("BEGIN");
    transactional = true;
    await client.query("SET LOCAL statement_timeout='12s'");
    const mode = await client.query(
      "SELECT s.role,c.writer,s.epoch AS state_epoch,c.epoch AS control_epoch FROM public.harkas_resilience_state s CROSS JOIN public.harkas_failover_control c WHERE s.singleton=true AND c.resource='harkas-admin-db'",
    );
    const primary = mode.rows[0];
    if (
      !primary ||
      primary.role !== "primary" ||
      primary.writer !== "supabase" ||
      String(primary.state_epoch) !== String(primary.control_epoch)
    ) {
      throw new Error("Email queue paused: Supabase is not verified PRIMARY");
    }

    const access = userId
      ? await client.query(
          "SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role::text='admin') OR EXISTS(SELECT 1 FROM public.user_module_access WHERE user_id=$1 AND module_key='tickets') AS allowed",
          [userId],
        )
      : null;
    const staff = Boolean(access?.rows[0]?.allowed);
    const selected = await client.query<EventRow>(
      [
        "SELECT e.id,e.ticket_id,e.kind,e.recipient_type,e.payload,t.ticket_no::text",
        "FROM public.support_email_events e JOIN public.support_tickets t ON t.id=e.ticket_id",
        "WHERE ((e.state='pending' AND e.next_attempt_at<=now())",
        "OR (e.state='processing' AND e.locked_at<now()-interval '15 minutes'))",
        "AND ($1::uuid IS NULL OR e.ticket_id=$1::uuid)",
        "AND ($2::boolean OR e.actor_id=$3::uuid OR $4::boolean)",
        "ORDER BY e.created_at,e.id LIMIT 8 FOR UPDATE OF e SKIP LOCKED",
      ].join(" "),
      [ticketId, isCron, userId, staff],
    );

    if (selected.rows.length) {
      await client.query(
        "UPDATE public.support_email_events SET state='processing',locked_at=now(),attempts=attempts+1 WHERE id=ANY($1::uuid[])",
        [selected.rows.map((entry) => entry.id)],
      );
    }
    await client.query("COMMIT");
    transactional = false;
    return selected.rows;
  } finally {
    if (transactional) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* connection discarded */
      }
    }
    client.release();
  }
}

async function deliver(entry: EventRow): Promise<boolean> {
  const addr =
    entry.recipient_type === "staff"
      ? STAFF_MAIL
      : value(entry.payload, "requester_email").trim();
  try {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr))
      throw new Error("Invalid recipient address");
    const text = body(entry);
    const html =
      "<!doctype html><html lang='nl'><body style='margin:0;padding:24px;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif'>" +
      "<div style='max-width:660px;margin:0 auto;background:white;padding:28px;border-radius:14px;border:1px solid #e2e8f0'>" +
      "<h2 style='margin-top:0;color:#0f172a'>Harkas IT Servicedesk</h2>" +
      "<pre style='font-family:Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;font-size:14px'>" +
      htmlEscape(text) +
      "</pre></div></body></html>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": "support-notification-" + entry.id,
      },
      body: JSON.stringify({
        from: "Harkas IT Servicedesk <support@harkasit.nl>",
        to: [addr],
        reply_to: STAFF_MAIL,
        subject: title(entry),
        text,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const outcome = (await response.json().catch(() => null)) as {
      id?: string;
    } | null;
    if (!response.ok || !outcome?.id)
      throw new Error("Mail provider HTTP " + response.status);
    await db().query(
      "UPDATE public.support_email_events SET state='sent',provider_message_id=$2,sent_at=now(),last_error=NULL WHERE id=$1 AND state='processing'",
      [entry.id, outcome.id],
    );
    return true;
  } catch (error) {
    const summary =
      error instanceof Error
        ? error.name + ": " + error.message
        : "Unknown error";
    console.error("[ticket-mail] delivery failed", {
      eventId: entry.id,
      cause: summary,
    });
    try {
      await db().query(
        [
          "UPDATE public.support_email_events SET",
          "state=CASE WHEN attempts>=6 OR created_at<now()-interval '23 hours' THEN 'failed' ELSE 'pending' END,",
          "next_attempt_at=now()+make_interval(mins=>LEAST(1440,attempts*15)),",
          "locked_at=NULL,last_error=$2",
          "WHERE id=$1 AND state='processing'",
        ].join(" "),
        [entry.id, summary.slice(0, 250)],
      );
    } catch (dbError) {
      console.error(
        "[ticket-mail] failed to record retry",
        dbError instanceof Error ? dbError.name : "unknown",
      );
    }
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const isCron = req.method === "GET";
    let userId: string | null = null;
    let ticketId: string | null = null;
    if (isCron) {
      let authorized =
        !!process.env.CRON_SECRET &&
        req.headers.authorization === "Bearer " + process.env.CRON_SECRET;
      const workerToken = req.headers["x-harkas-worker-token"];
      if (
        !authorized &&
        typeof workerToken === "string" &&
        /^[0-9a-f]{64}$/.test(workerToken)
      ) {
        const hash = createHash("sha256").update(workerToken).digest("hex");
        const check = await db().query(
          "SELECT EXISTS(SELECT 1 FROM harkas_support_private.worker_auth WHERE token_hash=$1) AS allowed",
          [hash],
        );
        authorized = check.rows[0]?.allowed === true;
      }
      if (!authorized) return res.status(401).json({ error: "Unauthorized" });
    } else {
      userId = await authenticatedUser(String(req.headers.authorization || ""));
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const supplied = String(req.body?.ticketId || "");
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          supplied,
        )
      ) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }
      ticketId = supplied;
    }
    const items = await claim(ticketId, userId, isCron);
    const result: boolean[] = [];
    for (const item of items) {
      result.push(await deliver(item));
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return res.status(200).json({
      ok: true,
      processed: items.length,
      accepted_by_provider: result.filter(Boolean).length,
    });
  } catch (error) {
    console.error(
      "[ticket-mail] request failed",
      error instanceof Error ? error.name : "unknown",
    );
    return res
      .status(503)
      .json({ error: "Ticket email temporarily unavailable" });
  }
}

export { title as supportMailTitle, body as supportMailBody };
