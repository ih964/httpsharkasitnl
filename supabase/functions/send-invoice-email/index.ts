import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phase 1: Email met signed URL download link
// Later uitbreidbaar naar echte bijlagen wanneer ondersteund

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
    const { invoice_id, recipient_email, cc_email } = body;

    if (!invoice_id || !recipient_email) {
      return new Response(JSON.stringify({ error: "invoice_id and recipient_email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch invoice
    const { data: invoice, error: invError } = await supabase.from("invoices").select("*").eq("id", invoice_id).single();
    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch customer
    let customerName = "Klant";
    if (invoice.customer_id) {
      const { data: cust } = await supabase.from("customers").select("name").eq("id", invoice.customer_id).single();
      if (cust) customerName = cust.name;
    }

    // Fetch settings
    const { data: settings } = await supabase.from("settings").select("*").limit(1).maybeSingle();

    // Ensure PDF exists
    let pdfPath = invoice.pdf_storage_path;
    if (!pdfPath) {
      // Generate PDF first via the other function (call internally)
      return new Response(JSON.stringify({ error: "PDF moet eerst gegenereerd worden. Genereer de PDF en probeer opnieuw." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create signed URL (7 days)
    const { data: signedData, error: signError } = await supabase.storage.from("invoices").createSignedUrl(pdfPath, 7 * 24 * 60 * 60);
    if (signError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Could not create download link" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calculate final total
    const total = Number(invoice.total);
    const damageAmount = Number(invoice.damage_amount);
    const finalTotal = invoice.has_damage && damageAmount > 0
      ? Math.round((total - damageAmount) * 100) / 100
      : total;

    const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

    // Calculate effective due date
    let effectiveDueDate: Date;
    if (invoice.due_date) {
      effectiveDueDate = new Date(invoice.due_date);
    } else {
      const paymentTerms = settings?.payment_terms ?? 14;
      effectiveDueDate = addDays(invoice.invoice_date, paymentTerms);
    }

    const iban = settings?.iban || "NL22KNAB0413717895";
    const companyName = settings?.company_name || "Harkas Dienstverlening";

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">Factuur ${invoice.invoice_number}</h2>
  
  <p>Beste ${customerName},</p>
  
  <p>Hierbij ontvangt u factuur <strong>${invoice.invoice_number}</strong>.</p>
  
  <p>Wij verzoeken u vriendelijk het bedrag van <strong>${fmt(finalTotal)}</strong> binnen de gestelde termijn te voldoen.</p>
  
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

  <p style="text-align: center; margin: 25px 0;">
    <a href="${signedData.signedUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">📄 Factuur downloaden</a>
  </p>

  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px;">
      <strong>Betalingsinstructies</strong><br>
      Wij verzoeken u het bedrag van ${fmt(finalTotal)} uiterlijk ${formatDateNL(effectiveDueDate)} over te maken naar rekeningnummer <strong>${iban}</strong> ten name van <strong>${companyName}</strong> onder vermelding van factuurnummer <strong>${invoice.invoice_number}</strong>.
    </p>
  </div>

  <p>Met vriendelijke groet,<br><strong>${companyName}</strong></p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 15px;">
  <p style="font-size: 11px; color: #999;">De download-link is 7 dagen geldig. Neem contact op als u problemen ondervindt.</p>
</body>
</html>`;

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "E-mail service niet geconfigureerd (RESEND_API_KEY ontbreekt)" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fromEmail = settings?.email || "administratie@harkasit.nl";
    const emailPayload: any = {
      from: `${companyName} <${fromEmail}>`,
      to: [recipient_email],
      subject: `Factuur ${invoice.invoice_number} – ${companyName}`,
      html: emailHtml,
    };

    if (cc_email) {
      emailPayload.cc = [cc_email];
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      return new Response(JSON.stringify({ error: `E-mail verzenden mislukt: ${errBody}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update invoice
    await supabase.from("invoices").update({
      emailed_at: new Date().toISOString(),
      emailed_to: recipient_email,
      emailed_cc: cc_email || null,
    }).eq("id", invoice_id);

    // Activity log
    await supabase.from("activity_logs").insert({
      type: "invoice_emailed",
      reference_id: invoice_id,
      description: `Factuur ${invoice.invoice_number} gemaild naar ${recipient_email}${cc_email ? ` (CC: ${cc_email})` : ""}`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
