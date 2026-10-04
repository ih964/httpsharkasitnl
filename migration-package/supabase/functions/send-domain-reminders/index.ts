// Daily cron: scan domains expiring in ~30 or ~7 days and send reminder emails via Resend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const FROM = "Harkas IT <administratie@harkasit.nl>";
const TO_RECIPIENTS = ["info@harkasit.nl", "iliasharkati@outlook.com"];

interface DomainRow {
  id: string;
  domain_name: string;
  customer_name: string | null;
  customer_email: string | null;
  expiry_date: string;
  reminder_1_month_sent_at: string | null;
  reminder_1_week_sent_at: string | null;
}

function formatDateNl(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildBody(d: DomainRow) {
  return `<p>Beste,</p>
<p>Domein <strong>${d.domain_name}</strong> verloopt op <strong>${formatDateNl(d.expiry_date)}</strong>.</p>
<p>Klant: ${d.customer_name ?? "—"}</p>
<p>Controleer of dit domein verlengd of opgezegd moet worden.</p>
<p>Met vriendelijke groet,<br/>Harkas IT</p>`;
}

async function sendResend(subject: string, html: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ontbreekt");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY ontbreekt");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: TO_RECIPIENTS,
        subject,
        html,
      }),
      signal: ctrl.signal,
    });
    const txt = await res.text();
    if (!res.ok) {
      console.error("Resend error", res.status, txt);
      throw new Error(`Resend ${res.status}: ${txt}`);
    }
    return JSON.parse(txt);
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    const target30 = new Date(today);
    target30.setDate(today.getDate() + 30);
    const target7 = new Date(today);
    target7.setDate(today.getDate() + 7);

    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const { data: domains, error } = await supabase
      .from("domains")
      .select(
        "id, domain_name, customer_name, customer_email, expiry_date, reminder_1_month_sent_at, reminder_1_week_sent_at",
      )
      .in("expiry_date", [iso(target30), iso(target7)]);

    if (error) throw error;

    const results: Array<{ domain: string; type: string; status: string; error?: string }> = [];

    for (const d of (domains ?? []) as DomainRow[]) {
      // 1 month reminder
      if (d.expiry_date === iso(target30) && !d.reminder_1_month_sent_at) {
        try {
          await sendResend(
            `Domein ${d.domain_name} verloopt over 1 maand`,
            buildBody(d),
          );
          await supabase
            .from("domains")
            .update({
              reminder_1_month_sent_at: new Date().toISOString(),
              action_required: true,
              action_status: "pending",
            })
            .eq("id", d.id);
          results.push({ domain: d.domain_name, type: "1month", status: "sent" });
        } catch (e: any) {
          results.push({ domain: d.domain_name, type: "1month", status: "error", error: e.message });
        }
      }
      // 1 week reminder
      if (d.expiry_date === iso(target7) && !d.reminder_1_week_sent_at) {
        try {
          await sendResend(
            `Domein ${d.domain_name} verloopt over 1 week`,
            buildBody(d),
          );
          await supabase
            .from("domains")
            .update({
              reminder_1_week_sent_at: new Date().toISOString(),
              action_required: true,
            })
            .eq("id", d.id);
          results.push({ domain: d.domain_name, type: "1week", status: "sent" });
        } catch (e: any) {
          results.push({ domain: d.domain_name, type: "1week", status: "error", error: e.message });
        }
      }
    }

    // Mark expired
    await supabase
      .from("domains")
      .update({ status: "expired" })
      .lt("expiry_date", iso(today))
      .neq("status", "expired");

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("send-domain-reminders error", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message ?? "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
