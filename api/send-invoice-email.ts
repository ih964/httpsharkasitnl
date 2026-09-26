import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

const cors = (res: VercelResponse) => {
  res.setHeader("Cache-Control", "no-store");
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase configuratie ontbreekt." });
  }
  if (!resendApiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY ontbreekt." });
  }

  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Niet ingelogd." });
  }
  const token = authHeader.slice("Bearer ".length);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return res.status(401).json({ error: "Sessie ongeldig." });
  }

  const [{ data: adminRole }, { data: invoiceAccess }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle(),
    supabase
      .from("user_module_access")
      .select("module_key")
      .eq("user_id", userData.user.id)
      .eq("module_key", "invoices")
      .maybeSingle(),
  ]);

  if (!adminRole && !invoiceAccess) {
    return res.status(403).json({ error: "Geen toegang tot Facturen." });
  }

  const {
    invoice_id,
    recipient_email,
    cc_email,
    from_name,
    from_email,
  } = req.body || {};

  const invoiceId = String(invoice_id || "");
  const recipientEmail = String(recipient_email || "").trim();
  const ccEmail = String(cc_email || "").trim();
  const senderName = String(from_name || "Harkas IT").trim() || "Harkas IT";
  const senderEmail = String(from_email || "administratie@harkasit.nl").trim();

  if (!invoiceId || !isValidEmail(recipientEmail)) {
    return res.status(400).json({ error: "Factuur en geldig ontvangeradres zijn verplicht." });
  }
  if (!isValidEmail(senderEmail) || !senderEmail.toLowerCase().endsWith("@harkasit.nl")) {
    return res.status(400).json({ error: "Afzender moet een geldig @harkasit.nl-adres zijn." });
  }

  const ccList = ccEmail
    ? ccEmail.split(",").map((item: string) => item.trim()).filter(Boolean)
    : [];
  if (ccList.some((address: string) => !isValidEmail(address))) {
    return res.status(400).json({ error: "Een van de CC-adressen is ongeldig." });
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return res.status(404).json({ error: "Factuur niet gevonden." });
  }
  if (!invoice.pdf_storage_path) {
    return res.status(400).json({ error: "Genereer eerst de PDF van deze factuur." });
  }

  let customerName = "Klant";
  if (invoice.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name,company_name")
      .eq("id", invoice.customer_id)
      .maybeSingle();
    customerName = customer?.company_name || customer?.name || customerName;
  }

  const { data: settings } = await supabase
    .from("settings")
    .select("company_name,iban,payment_terms")
    .limit(1)
    .maybeSingle();

  const { data: pdfBlob, error: pdfError } = await supabase.storage
    .from("invoices")
    .download(invoice.pdf_storage_path);

  if (pdfError || !pdfBlob) {
    return res.status(500).json({ error: "PDF kon niet uit opslag worden opgehaald." });
  }

  const total = Number(invoice.total || 0);
  const damage = Number(invoice.damage_amount || 0);
  const finalTotal =
    invoice.has_damage && damage > 0 ? Math.round((total - damage) * 100) / 100 : total;

  const due = invoice.due_date
    ? new Date(invoice.due_date)
    : (() => {
        const d = new Date(invoice.invoice_date);
        d.setDate(d.getDate() + Number(settings?.payment_terms || 14));
        return d;
      })();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
  const formatDate = (value: Date | string) =>
    new Date(value).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const companyName = settings?.company_name || "Harkas IT";
  const iban = settings?.iban || "NL22KNAB0413717895";

  const text = [
    `Beste ${customerName},`,
    "",
    `Hierbij ontvangt u factuur ${invoice.invoice_number} in de bijlage.`,
    `Bedrag: ${formatCurrency(finalTotal)}`,
    `Vervaldatum: ${formatDate(due)}`,
    "",
    `U kunt het bedrag overmaken naar ${iban} t.n.v. ${companyName} onder vermelding van ${invoice.invoice_number}.`,
    "",
    `Met vriendelijke groet,`,
    senderName,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:620px">
      <h2>Factuur ${escapeHtml(String(invoice.invoice_number))}</h2>
      <p>Beste ${escapeHtml(customerName)},</p>
      <p>Hierbij ontvangt u factuur <strong>${escapeHtml(String(invoice.invoice_number))}</strong> in de bijlage.</p>
      <table style="border-collapse:collapse;width:100%;margin:20px 0">
        <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Bedrag</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${escapeHtml(formatCurrency(finalTotal))}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Vervaldatum</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${escapeHtml(formatDate(due))}</td></tr>
      </table>
      <p>Wij verzoeken u het bedrag over te maken naar <strong>${escapeHtml(iban)}</strong> t.n.v. <strong>${escapeHtml(companyName)}</strong> onder vermelding van <strong>${escapeHtml(String(invoice.invoice_number))}</strong>.</p>
      <p>Met vriendelijke groet,<br><strong>${escapeHtml(senderName)}</strong></p>
    </div>
  `;

  const resend = new Resend(resendApiKey);
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

  const { data, error } = await resend.emails.send({
    from: `${senderName} <${senderEmail}>`,
    to: [recipientEmail],
    cc: ccList.length ? ccList : undefined,
    subject: `Factuur ${invoice.invoice_number} – ${senderName}`,
    text,
    html,
    attachments: [
      {
        filename: `factuur-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error || !data?.id) {
    console.error("Resend invoice send failed", error);
    return res.status(502).json({ error: error?.message || "E-mailprovider gaf geen bevestiging." });
  }

  const sentAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      emailed_at: sentAt,
      emailed_to: recipientEmail,
      emailed_cc: ccList.length ? ccList.join(", ") : null,
    })
    .eq("id", invoiceId);

  if (updateError) {
    console.error("Invoice email metadata update failed", updateError);
  }

  await supabase.from("activity_logs").insert({
    type: "invoice_emailed",
    reference_id: invoiceId,
    description: `Factuur ${invoice.invoice_number} verzonden per e-mail`,
  });

  return res.status(200).json({ ok: true, id: data.id });
}
