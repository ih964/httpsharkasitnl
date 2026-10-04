import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@7.0.6";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type SendBody = {
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: string;
  fromName?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Niet ingelogd." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json({ error: "Supabase configuratie ontbreekt." }, 500);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.slice("Bearer ".length);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Sessie ongeldig." }, 401);

  const { data: adminRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !adminRole) {
    return json({ error: "Alleen administrators mogen SMTP-mail versturen." }, 403);
  }

  const host = Deno.env.get("SMTP_HOSTNAME");
  const port = Number(Deno.env.get("SMTP_PORT") || "465");
  const username = Deno.env.get("SMTP_USERNAME");
  const password = Deno.env.get("SMTP_PASSWORD");
  const configuredFrom = Deno.env.get("SMTP_FROM") || "info@harkasit.nl";
  const secure = (Deno.env.get("SMTP_SECURE") || "true").toLowerCase() === "true";

  if (!host || !username || !password || !Number.isFinite(port)) {
    return json({
      error: "SMTP is nog niet geconfigureerd.",
      missing: [
        !host ? "SMTP_HOSTNAME" : null,
        !username ? "SMTP_USERNAME" : null,
        !password ? "SMTP_PASSWORD" : null,
      ].filter(Boolean),
    }, 503);
  }

  let body: SendBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ongeldige JSON." }, 400);
  }

  const recipients = (Array.isArray(body.to) ? body.to : [body.to])
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  const subject = String(body.subject || "").trim();
  const text = String(body.text || "");
  const html = body.html ? String(body.html) : undefined;
  const replyTo = body.replyTo ? String(body.replyTo).trim() : "info@harkasit.nl";
  const fromName = String(body.fromName || "Harkas IT").trim() || "Harkas IT";

  if (!recipients.length || recipients.some((v) => !emailOk(v))) {
    return json({ error: "Geldig ontvangeradres ontbreekt." }, 400);
  }
  if (!subject || (!text && !html)) {
    return json({ error: "Onderwerp en berichtinhoud zijn verplicht." }, 400);
  }
  if (replyTo && !emailOk(replyTo)) {
    return json({ error: "Reply-to is ongeldig." }, 400);
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: username, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  try {
    const result = await transport.sendMail({
      from: `${fromName} <${configuredFrom}>`,
      to: recipients,
      replyTo: replyTo || undefined,
      subject,
      text: text || undefined,
      html,
    });

    return json({
      ok: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      provider: "smtp",
    });
  } catch (error) {
    console.error("[smtp-send] send failed", error);
    return json({
      error: "SMTP-verzending mislukt.",
      detail: error instanceof Error ? error.message : "Onbekende SMTP-fout",
    }, 502);
  } finally {
    transport.close();
  }
});
