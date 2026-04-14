import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: invoice, error: invError } = await supabase.from("invoices").select("*").eq("id", invoice_id).single();
    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice_id).order("created_at");

    let customer = null;
    if (invoice.customer_id) {
      const { data } = await supabase.from("customers").select("*").eq("id", invoice.customer_id).single();
      customer = data;
    }

    const { data: settings } = await supabase.from("settings").select("*").limit(1).maybeSingle();

    // Generate PDF
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 210;
    const margin = 20;
    const cw = pw - margin * 2;
    let y = 20;

    const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

    // Company header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(settings?.company_name || "Harkas IT", margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (settings?.address) { doc.text(settings.address, margin, y); y += 4; }
    if (settings?.email) { doc.text(settings.email, margin, y); y += 4; }
    if (settings?.kvk) { doc.text(`KVK: ${settings.kvk}`, margin, y); y += 4; }
    if (settings?.vat_number) { doc.text(`BTW: ${settings.vat_number}`, margin, y); y += 4; }
    if (settings?.iban) { doc.text(`IBAN: ${settings.iban}`, margin, y); y += 4; }
    y += 6;

    // Invoice title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("FACTUUR", margin, y);
    y += 8;

    // Invoice meta (right side) + customer (left side)
    const metaX = pw - margin;
    let metaY = y;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.text(`Factuurnummer: ${invoice.invoice_number}`, metaX, metaY, { align: "right" });
    metaY += 5;
    doc.text(`Datum: ${new Date(invoice.invoice_date).toLocaleDateString("nl-NL")}`, metaX, metaY, { align: "right" });
    metaY += 5;

    // Calculate effective due date
    let effectiveDueDate: Date;
    if (invoice.due_date) {
      effectiveDueDate = new Date(invoice.due_date);
    } else {
      const paymentTerms = settings?.payment_terms ?? 14;
      effectiveDueDate = addDays(invoice.invoice_date, paymentTerms);
    }
    doc.text(`Vervaldatum: ${formatDateNL(effectiveDueDate)}`, metaX, metaY, { align: "right" });
    metaY += 5;

    // Customer
    if (customer) {
      doc.setFont("helvetica", "bold");
      doc.text("Aan:", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text(customer.name, margin, y); y += 4;
      if (customer.company_name) { doc.text(customer.company_name, margin, y); y += 4; }
      if (customer.address) { doc.text(customer.address, margin, y); y += 4; }
      if (customer.postal_code || customer.city) {
        doc.text(`${customer.postal_code || ""} ${customer.city || ""}`.trim(), margin, y); y += 4;
      }
      if (customer.vat_number) { doc.text(`BTW: ${customer.vat_number}`, margin, y); y += 4; }
      if (customer.kvk_number) { doc.text(`KVK: ${customer.kvk_number}`, margin, y); y += 4; }
    }

    y = Math.max(y, metaY) + 10;

    // Table header
    const cols = [margin, margin + 75, margin + 95, margin + 120, margin + 140];
    const colEnd = pw - margin;

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 4, cw, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Omschrijving", cols[0], y);
    doc.text("Aantal", cols[1], y, { align: "right" });
    doc.text("Prijs p/st", cols[2] + 10, y, { align: "right" });
    doc.text("BTW %", cols[3] + 10, y, { align: "right" });
    doc.text("Totaal", colEnd, y, { align: "right" });
    y += 6;

    // Table rows
    doc.setFont("helvetica", "normal");
    const lineItems = items || [];
    for (const item of lineItems) {
      const lineSub = Math.round(Number(item.quantity) * Number(item.price) * 100) / 100;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.text(item.description.substring(0, 40), cols[0], y);
      doc.text(String(item.quantity), cols[1], y, { align: "right" });
      doc.text(fmt(Number(item.price)), cols[2] + 10, y, { align: "right" });
      doc.text(`${item.vat_percentage}%`, cols[3] + 10, y, { align: "right" });
      doc.text(fmt(lineSub), colEnd, y, { align: "right" });
      y += 5;
    }

    y += 4;
    doc.setDrawColor(200);
    doc.line(margin, y, pw - margin, y);
    y += 6;

    // Totals
    const subtotal = Number(invoice.subtotal);
    const vatTotal = Number(invoice.vat_total);
    const total = Number(invoice.total);
    const hasDamage = invoice.has_damage;
    const damageAmount = Number(invoice.damage_amount);

    const totX = pw - margin;
    const labX = totX - 50;

    doc.setFontSize(9);
    doc.text("Subtotaal", labX, y, { align: "right" });
    doc.text(fmt(subtotal), totX, y, { align: "right" });
    y += 5;

    doc.text("BTW", labX, y, { align: "right" });
    doc.text(fmt(vatTotal), totX, y, { align: "right" });
    y += 5;

    doc.text("Totaal", labX, y, { align: "right" });
    doc.text(fmt(total), totX, y, { align: "right" });
    y += 5;

    if (hasDamage && damageAmount > 0) {
      doc.setTextColor(200, 0, 0);
      doc.text("Schade correctie", labX, y, { align: "right" });
      doc.text(`- ${fmt(damageAmount)}`, totX, y, { align: "right" });
      doc.setTextColor(0);
      y += 5;
    }

    doc.line(labX, y, totX, y);
    y += 5;

    const finalTotal = hasDamage && damageAmount > 0
      ? Math.round((total - damageAmount) * 100) / 100
      : total;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Eindtotaal", labX, y, { align: "right" });
    doc.text(fmt(finalTotal), totX, y, { align: "right" });
    y += 10;

    // Damage description
    if (hasDamage && invoice.damage_description) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(`Schade: ${invoice.damage_description}`, margin, y);
      y += 6;
    }

    // Notes
    if (invoice.notes) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Opmerkingen: ${invoice.notes}`, margin, y);
      y += 6;
    }

    // Payment instructions
    y += 4;
    if (y > 250) { doc.addPage(); y = 20; }

    const iban = settings?.iban || "NL22KNAB0413717895";
    const companyName = settings?.company_name || "Harkas Dienstverlening";
    const dueDateFormatted = formatDateNL(effectiveDueDate);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(200);
    doc.line(margin, y, pw - margin, y);
    y += 5;

    const paymentText = `Wij verzoeken u het bedrag van ${fmt(finalTotal)} uiterlijk ${dueDateFormatted} over te maken naar rekeningnummer ${iban} ten name van ${companyName} onder vermelding van factuurnummer ${invoice.invoice_number}.`;
    const splitLines = doc.splitTextToSize(paymentText, cw);
    doc.text(splitLines, margin, y);
    y += splitLines.length * 4 + 4;

    // Footer
    if (settings?.invoice_footer_text) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(settings.invoice_footer_text, pw / 2, 285, { align: "center", maxWidth: cw });
    }

    // Upload to storage
    const pdfBytes = doc.output("arraybuffer");
    const pdfPath = `invoices/${invoice_id}.pdf`;

    await supabase.storage.from("invoices").remove([pdfPath]);

    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("invoices").update({ pdf_storage_path: pdfPath }).eq("id", invoice_id);

    return new Response(JSON.stringify({ success: true, pdf_path: pdfPath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
