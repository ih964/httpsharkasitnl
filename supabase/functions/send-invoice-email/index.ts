import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateNL(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { invoice_id, recipient_email, cc_email, from_name, from_email } = body;

    if (!invoice_id || !recipient_email) {
      return new Response(JSON.stringify({ error: "invoice_id and recipient_email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Fetch invoice ---
    const { data: invoice, error: invError } = await supabase.from("invoices").select("*").eq("id", invoice_id).single();
    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Fetch customer ---
    let customerName = "Klant";
    if (invoice.customer_id) {
      const { data: cust } = await supabase.from("customers").select("name").eq("id", invoice.customer_id).single();
      if (cust) customerName = cust.name;
    }

    // --- Fetch settings ---
    const { data: settings } = await supabase.from("settings").select("*").limit(1).maybeSingle();

    // --- Ensure PDF exists ---
    let pdfPath = invoice.pdf_storage_path;
    if (!pdfPath) {
      return new Response(JSON.stringify({ error: "PDF moet eerst gegenereerd worden. Genereer de PDF en probeer opnieuw." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Download PDF from storage ---
    const { data: pdfData, error: pdfError } = await supabase.storage.from("invoices").download(pdfPath);
    if (pdfError || !pdfData) {
      console.error("PDF download error:", pdfError);
      return new Response(JSON.stringify({ error: "PDF kon niet worden opgehaald uit storage" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    const pdfBase64 = base64Encode(pdfBytes);
    const pdfFilename = `factuur-${invoice.invoice_number}.pdf`;

    // --- Calculate final total ---
    const total = Number(invoice.total);
    const damageAmount = Number(invoice.damage_amount);
    const finalTotal = invoice.has_damage && damageAmount > 0
      ? Math.round((total - damageAmount) * 100) / 100
      : total;

    const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

    // --- Calculate effective due date ---
    let effectiveDueDate: Date;
    if (invoice.due_date) {
      effectiveDueDate = new Date(invoice.due_date);
    } else {
      const paymentTerms = settings?.payment_terms ?? 14;
      effectiveDueDate = addDays(invoice.invoice_date, paymentTerms);
    }

    const senderName = from_name || settings?.company_name || "Harkas IT";
    const senderEmail = from_email || "administratie@harkasit.nl";
    const iban = settings?.iban || "NL22KNAB0413717895";

    // --- Build email HTML ---
    const emailHtml = `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">Factuur ${invoice.invoice_number}</h2>
  
  <p>Beste ${customerName},</p>
  
  <p>Hierbij ontvangt u factuur <strong>${invoice.invoice_number}</strong> in de bijlage.</p>
  
  <p>Wij verzoeken u vriendelijk het openstaande bedrag van <strong>${fmt(finalTotal)}</strong> uiterlijk ${formatDateNL(effectiveDueDate)} te voldoen.</p>
  
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr style="background: #f5f5f5;">
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Factuurnummer</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${invoice.invoice_number}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Factuurdatum</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${formatDateNL(invoice.invoice_date)}</td>
    </tr>
    <tr style="background: #f5f5f5;">
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Vervaldatum</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${formatDateNL(effectiveDueDate)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Bedrag</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>${fmt(finalTotal)}</strong></td>
    </tr>
  </table>

  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px;">
      <strong>Betalingsinstructies</strong><br>
      Wij verzoeken u het bedrag van ${fmt(finalTotal)} uiterlijk ${formatDateNL(effectiveDueDate)} over te maken naar rekeningnummer <strong>${iban}</strong> ten name van <strong>${senderName}</strong> onder vermelding van factuurnummer <strong>${invoice.invoice_number}</strong>.
    </p>
  </div>

  <p>Met vriendelijke groet,<br><strong>${senderName}</strong></p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 15px;">
  <p style="font-size: 11px; color: #999;">De factuur is als PDF bijgevoegd bij deze e-mail.</p>
</body>
</html>`;

    // --- Send email via Resend gateway ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build CC list
    const ccList: string[] = [];
    if (cc_email) {
      const parts = String(cc_email).split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      ccList.push(...parts);
    }

    const emailPayload: Record<string, unknown> = {
      from: `${senderName} <${senderEmail}>`,
      to: [recipient_email],
      subject: `Factuur ${invoice.invoice_number} – ${senderName}`,
      html: emailHtml,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBase64,
        },
      ],
    };
    if (ccList.length > 0) {
      emailPayload.cc = ccList;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let resendResponse: Response;
    try {
      resendResponse = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify(emailPayload),
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const msg = fetchErr instanceof Error ? fetchErr.message : "Unknown fetch error";
      console.error("Resend fetch error:", msg);
      return new Response(JSON.stringify({ error: `E-mail verzenden mislukt: ${msg}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    clearTimeout(timeoutId);

    const resendBody = await resendResponse.text();
    console.log("Resend response status:", resendResponse.status, "body:", resendBody);

    if (!resendResponse.ok) {
      let errorMessage = `Resend error (${resendResponse.status})`;
      try {
        const parsed = JSON.parse(resendBody);
        if (parsed.message) errorMessage = parsed.message;
        else if (parsed.error) errorMessage = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
      } catch { /* use default */ }
      console.error("Resend error detail:", errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Only update DB after confirmed success ---
    await supabase.from("invoices").update({
      emailed_at: new Date().toISOString(),
      emailed_to: recipient_email,
      emailed_cc: cc_email || null,
    }).eq("id", invoice_id);

    await supabase.from("activity_logs").insert({
      type: "invoice_emailed",
      reference_id: invoice_id,
      description: `Factuur ${invoice.invoice_number} gemaild naar ${recipient_email}${cc_email ? ` (CC: ${cc_email})` : ""} met PDF bijlage`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-invoice-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
