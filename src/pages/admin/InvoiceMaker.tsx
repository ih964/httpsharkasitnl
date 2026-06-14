import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Trash2, Upload } from "lucide-react";

type InvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  price: number;
  vat: number;
};

type PartyDetails = {
  company: string;
  contact: string;
  address: string;
  postalCity: string;
  email: string;
  phone: string;
  kvk: string;
  vatNumber: string;
  iban: string;
};

const newLine = (): InvoiceLine => ({
  id: Math.random().toString(36).slice(2),
  description: "",
  quantity: 1,
  price: 0,
  vat: 21,
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number.isFinite(value) ? value : 0);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const InvoiceMaker = () => {
  const { toast } = useToast();
  const [sender, setSender] = useState<PartyDetails>({
    company: "Harkas IT",
    contact: "Ilias Harkati",
    address: "",
    postalCity: "",
    email: "administratie@harkasit.nl",
    phone: "085 124 9091",
    kvk: "84795085",
    vatNumber: "",
    iban: "",
  });
  const [customer, setCustomer] = useState<PartyDetails>({
    company: "",
    contact: "",
    address: "",
    postalCity: "",
    email: "",
    phone: "",
    kvk: "",
    vatNumber: "",
    iban: "",
  });
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${new Date().getFullYear()}-001`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("Graag het totaalbedrag overmaken onder vermelding van het factuurnummer.");
  const [lines, setLines] = useState<InvoiceLine[]>([newLine()]);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const vatTotal = lines.reduce((sum, line) => sum + (line.quantity * line.price * line.vat) / 100, 0);
    return {
      subtotal,
      vatTotal,
      total: subtotal + vatTotal,
    };
  }, [lines]);

  const updateSender = (field: keyof PartyDetails, value: string) => setSender((prev) => ({ ...prev, [field]: value }));
  const updateCustomer = (field: keyof PartyDetails, value: string) => setCustomer((prev) => ({ ...prev, [field]: value }));

  const updateLine = (id: string, field: keyof InvoiceLine, value: string | number) => {
    setLines((current) => current.map((line) => line.id === id ? { ...line, [field]: value } : line));
  };

  const addLine = () => setLines((current) => [...current, newLine()]);
  const removeLine = (id: string) => setLines((current) => current.length === 1 ? current : current.filter((line) => line.id !== id));

  const handleLogoUpload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Logo upload mislukt", description: "Upload een afbeelding zoals PNG, JPG of SVG.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!sender.company.trim()) return "Vul afzender bedrijfsnaam in.";
    if (!customer.company.trim()) return "Vul klantnaam of bedrijfsnaam in.";
    if (!invoiceNumber.trim()) return "Vul factuurnummer in.";
    if (lines.every((line) => !line.description.trim())) return "Vul minimaal één factuurregel in.";
    return null;
  };

  const buildInvoiceHtml = () => {
    const safeSender = sender;
    const safeCustomer = customer;
    const rows = lines
      .filter((line) => line.description.trim())
      .map((line) => {
        const subtotal = line.quantity * line.price;
        const vatAmount = (subtotal * line.vat) / 100;
        return `
          <tr>
            <td>${escapeHtml(line.description)}</td>
            <td class="right">${line.quantity}</td>
            <td class="right">${formatCurrency(line.price)}</td>
            <td class="right">${line.vat}%</td>
            <td class="right">${formatCurrency(subtotal + vatAmount)}</td>
          </tr>`;
      })
      .join("");

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Factuur ${escapeHtml(invoiceNumber)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; background: #fff; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 36px; }
    .brand { display: flex; gap: 16px; align-items: center; }
    .logo { width: 86px; max-height: 68px; object-fit: contain; }
    h1 { font-size: 34px; margin: 0 0 8px; letter-spacing: -1px; }
    h2 { font-size: 15px; margin: 0 0 8px; color: #111827; }
    .muted { color: #6b7280; }
    .block { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; background: #f9fafb; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 28px; }
    .meta { text-align: right; line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; margin-top: 22px; }
    th { text-align: left; background: #111827; color: white; padding: 11px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    td { border-bottom: 1px solid #e5e7eb; padding: 11px 10px; vertical-align: top; }
    .right { text-align: right; }
    .totals { width: 300px; margin-left: auto; margin-top: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .grand { font-size: 18px; font-weight: 700; border-bottom: 0; padding-top: 12px; }
    .footer { margin-top: 34px; display: grid; grid-template-columns: 1.4fr .8fr; gap: 18px; }
    .small { font-size: 11px; line-height: 1.55; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : ""}
      <div>
        <h1>Factuur</h1>
        <div class="muted">${escapeHtml(invoiceNumber)}</div>
      </div>
    </div>
    <div class="meta">
      <strong>${escapeHtml(safeSender.company)}</strong><br />
      ${escapeHtml(safeSender.contact)}<br />
      ${escapeHtml(safeSender.address)}<br />
      ${escapeHtml(safeSender.postalCity)}<br />
      ${escapeHtml(safeSender.email)}<br />
      ${escapeHtml(safeSender.phone)}
    </div>
  </div>

  <div class="grid">
    <div class="block">
      <h2>Factuur aan</h2>
      <strong>${escapeHtml(safeCustomer.company)}</strong><br />
      ${escapeHtml(safeCustomer.contact)}<br />
      ${escapeHtml(safeCustomer.address)}<br />
      ${escapeHtml(safeCustomer.postalCity)}<br />
      ${escapeHtml(safeCustomer.email)}
    </div>
    <div class="block">
      <h2>Factuurgegevens</h2>
      <div>Factuurnummer: <strong>${escapeHtml(invoiceNumber)}</strong></div>
      <div>Factuurdatum: ${new Date(invoiceDate).toLocaleDateString("nl-NL")}</div>
      <div>Vervaldatum: ${new Date(dueDate).toLocaleDateString("nl-NL")}</div>
      ${safeCustomer.vatNumber ? `<div>BTW klant: ${escapeHtml(safeCustomer.vatNumber)}</div>` : ""}
      ${safeCustomer.kvk ? `<div>KvK klant: ${escapeHtml(safeCustomer.kvk)}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Omschrijving</th>
        <th class="right">Aantal</th>
        <th class="right">Prijs</th>
        <th class="right">BTW</th>
        <th class="right">Totaal</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotaal</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
    <div class="totals-row"><span>BTW</span><strong>${formatCurrency(totals.vatTotal)}</strong></div>
    <div class="totals-row grand"><span>Totaal</span><span>${formatCurrency(totals.total)}</span></div>
  </div>

  <div class="footer">
    <div class="block small">
      <strong>Opmerking</strong><br />
      ${escapeHtml(notes).replaceAll("\n", "<br />")}
    </div>
    <div class="block small">
      <strong>Betaalgegevens</strong><br />
      IBAN: ${escapeHtml(safeSender.iban)}<br />
      KvK: ${escapeHtml(safeSender.kvk)}<br />
      BTW: ${escapeHtml(safeSender.vatNumber)}
    </div>
  </div>
</body>
</html>`;
  };

  const downloadPdf = () => {
    const validationError = validate();
    if (validationError) {
      toast({ title: "Factuur nog niet compleet", description: validationError, variant: "destructive" });
      return;
    }

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      toast({ title: "Popup geblokkeerd", description: "Sta popups toe om de PDF te maken.", variant: "destructive" });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildInvoiceHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factuur Maker</h1>
          <p className="text-muted-foreground">
            Losse factuur maken en als PDF downloaden. Deze module staat los van de bestaande facturen en uren.
          </p>
        </div>
        <Badge variant="secondary">Geen database-opslag</Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Afzender</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Bedrijfsnaam" value={sender.company} onChange={(v) => updateSender("company", v)} />
              <Field label="Naam/contact" value={sender.contact} onChange={(v) => updateSender("contact", v)} />
              <Field label="Adres" value={sender.address} onChange={(v) => updateSender("address", v)} />
              <Field label="Postcode + plaats" value={sender.postalCity} onChange={(v) => updateSender("postalCity", v)} />
              <Field label="E-mail" value={sender.email} onChange={(v) => updateSender("email", v)} />
              <Field label="Telefoon" value={sender.phone} onChange={(v) => updateSender("phone", v)} />
              <Field label="KvK" value={sender.kvk} onChange={(v) => updateSender("kvk", v)} />
              <Field label="BTW-nummer" value={sender.vatNumber} onChange={(v) => updateSender("vatNumber", v)} />
              <div className="md:col-span-2"><Field label="IBAN" value={sender.iban} onChange={(v) => updateSender("iban", v)} /></div>
              <div className="md:col-span-2 space-y-2">
                <Label>Logo uploaden</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={(event) => handleLogoUpload(event.target.files?.[0])} />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                {logoDataUrl && <img src={logoDataUrl} alt="Logo preview" className="h-14 max-w-[180px] object-contain rounded border p-2" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Klant</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Klantnaam / bedrijfsnaam" value={customer.company} onChange={(v) => updateCustomer("company", v)} />
              <Field label="Contactpersoon" value={customer.contact} onChange={(v) => updateCustomer("contact", v)} />
              <Field label="Adres" value={customer.address} onChange={(v) => updateCustomer("address", v)} />
              <Field label="Postcode + plaats" value={customer.postalCity} onChange={(v) => updateCustomer("postalCity", v)} />
              <Field label="E-mail" value={customer.email} onChange={(v) => updateCustomer("email", v)} />
              <Field label="Telefoon" value={customer.phone} onChange={(v) => updateCustomer("phone", v)} />
              <Field label="KvK optioneel" value={customer.kvk} onChange={(v) => updateCustomer("kvk", v)} />
              <Field label="BTW optioneel" value={customer.vatNumber} onChange={(v) => updateCustomer("vatNumber", v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Factuurgegevens</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Factuurnummer" value={invoiceNumber} onChange={setInvoiceNumber} />
                <Field label="Factuurdatum" type="date" value={invoiceDate} onChange={setInvoiceDate} />
                <Field label="Vervaldatum" type="date" value={dueDate} onChange={setDueDate} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Factuurregels</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-2" /> Regel toevoegen
                  </Button>
                </div>
                {lines.map((line) => (
                  <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border p-3">
                    <div className="md:col-span-5">
                      <Input placeholder="Omschrijving" value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" min="0" step="0.01" placeholder="Aantal" value={line.quantity} onChange={(e) => updateLine(line.id, "quantity", Number(e.target.value))} />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" min="0" step="0.01" placeholder="Prijs" value={line.price} onChange={(e) => updateLine(line.id, "price", Number(e.target.value))} />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" min="0" step="1" placeholder="BTW %" value={line.vat} onChange={(e) => updateLine(line.id, "vat", Number(e.target.value))} />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={lines.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Omschrijving / opmerking</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>PDF voorbeeld</CardTitle>
                <Button onClick={downloadPdf}>
                  <Download className="h-4 w-4 mr-2" /> PDF downloaden
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-white text-slate-900 p-6 shadow-sm space-y-6">
                <div className="flex justify-between gap-6">
                  <div className="flex gap-4 items-center">
                    {logoDataUrl && <img src={logoDataUrl} alt="Logo" className="h-14 max-w-[140px] object-contain" />}
                    <div>
                      <div className="text-3xl font-bold">Factuur</div>
                      <div className="text-sm text-slate-500">{invoiceNumber}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{sender.company}</div>
                    <div>{sender.contact}</div>
                    <div>{sender.address}</div>
                    <div>{sender.postalCity}</div>
                    <div>{sender.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="font-semibold mb-2">Factuur aan</div>
                    <div className="font-medium">{customer.company || "Klantnaam"}</div>
                    <div>{customer.contact}</div>
                    <div>{customer.address}</div>
                    <div>{customer.postalCity}</div>
                    <div>{customer.email}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="font-semibold mb-2">Factuurgegevens</div>
                    <div>Datum: {invoiceDate ? new Date(invoiceDate).toLocaleDateString("nl-NL") : "—"}</div>
                    <div>Vervaldatum: {dueDate ? new Date(dueDate).toLocaleDateString("nl-NL") : "—"}</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-12 bg-slate-900 text-white text-xs font-semibold px-3 py-2">
                    <div className="col-span-6">Omschrijving</div>
                    <div className="col-span-2 text-right">Aantal</div>
                    <div className="col-span-2 text-right">Prijs</div>
                    <div className="col-span-2 text-right">Totaal</div>
                  </div>
                  {lines.filter((line) => line.description.trim()).length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">Nog geen factuurregels.</div>
                  ) : lines.filter((line) => line.description.trim()).map((line) => {
                    const subtotal = line.quantity * line.price;
                    const total = subtotal + subtotal * line.vat / 100;
                    return (
                      <div key={line.id} className="grid grid-cols-12 px-3 py-2 text-sm border-t">
                        <div className="col-span-6">{line.description}</div>
                        <div className="col-span-2 text-right">{line.quantity}</div>
                        <div className="col-span-2 text-right">{formatCurrency(line.price)}</div>
                        <div className="col-span-2 text-right">{formatCurrency(total)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="ml-auto w-72 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotaal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
                  <div className="flex justify-between"><span>BTW</span><strong>{formatCurrency(totals.vatTotal)}</strong></div>
                  <Separator />
                  <div className="flex justify-between text-lg"><span>Totaal</span><strong>{formatCurrency(totals.total)}</strong></div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-line">{notes}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

export default InvoiceMaker;
