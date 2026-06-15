import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Trash2, Upload } from "lucide-react";

type Template = "modern" | "premium" | "classic" | "compact" | "service" | "sidebar" | "letterhead" | "split" | "minimal";
type Line = { id: string; description: string; quantity: number; price: number; vat: number };
type Party = { company: string; contact: string; address: string; postalCity: string; email: string; phone: string; kvk: string; vatNumber: string; iban: string };

const templateNames: Record<Template, string> = {
  modern: "Modern",
  premium: "Premium corporate",
  classic: "Klassiek",
  compact: "Compact",
  service: "Dienstverlening / uren",
  sidebar: "Sidebar design",
  letterhead: "Briefpapier / letterhead",
  split: "Split screen",
  minimal: "Minimal clean",
};
const newLine = (): Line => ({ id: crypto.randomUUID(), description: "", quantity: 1, price: 0, vat: 21 });
const eur = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number.isFinite(v) ? v : 0);
const pdfMoney = (v: number) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);

export default function InvoiceMakerSplitView() {
  const { toast } = useToast();
  const [template, setTemplate] = useState<Template>("modern");
  const [sender, setSender] = useState<Party>({ company: "Harkas IT", contact: "Ilias Harkati", address: "", postalCity: "", email: "administratie@harkasit.nl", phone: "085 124 9091", kvk: "84795085", vatNumber: "", iban: "" });
  const [customer, setCustomer] = useState<Party>({ company: "", contact: "", address: "", postalCity: "", email: "", phone: "", kvk: "", vatNumber: "", iban: "" });
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${new Date().getFullYear()}-001`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); });
  const [notes, setNotes] = useState("Graag het totaalbedrag overmaken onder vermelding van het factuurnummer.");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [logo, setLogo] = useState("");

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const vat = lines.reduce((sum, line) => sum + (line.quantity * line.price * line.vat) / 100, 0);
    return { subtotal, vat, total: subtotal + vat };
  }, [lines]);

  const setParty = (kind: "sender" | "customer", field: keyof Party, value: string) => (kind === "sender" ? setSender : setCustomer)((old) => ({ ...old, [field]: value }));
  const setLine = (id: string, field: keyof Line, value: string | number) => setLines((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
  const uploadLogo = (file?: File) => { if (!file) return; const r = new FileReader(); r.onload = () => setLogo(String(r.result || "")); r.readAsDataURL(file); };

  const downloadPdf = () => {
    if (!sender.company || !customer.company || lines.every((line) => !line.description.trim())) {
      toast({ title: "Vul minimaal afzender, klant en één regel in", variant: "destructive" });
      return;
    }
    const doc = new jsPDF("p", "mm", "a4");
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const sidebar = template === "sidebar";
    const left = sidebar ? 68 : 16;
    let y = 20;

    if (sidebar) {
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 58, h, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("FACTUUR", 10, 24);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); [invoiceNumber, sender.company, sender.email, sender.phone, sender.kvk ? `KvK ${sender.kvk}` : ""].filter(Boolean).forEach((t, i) => doc.text(String(t), 10, 36 + i * 8));
      doc.setTextColor(17, 24, 39);
    } else if (template === "classic" || template === "minimal" || template === "letterhead") {
      doc.setTextColor(17, 24, 39); doc.setFont(template === "classic" ? "times" : "helvetica", "bold"); doc.setFontSize(template === "minimal" ? 30 : 24); doc.text(template === "minimal" ? "Invoice" : "FACTUUR", 16, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(invoiceNumber, w - 16, y, { align: "right" }); doc.line(16, y + 8, w - 16, y + 8); y += 24;
    } else {
      const color = template === "premium" ? [12, 18, 34] : template === "service" ? [7, 89, 133] : template === "split" ? [30, 64, 175] : [17, 24, 39];
      doc.setFillColor(color[0], color[1], color[2]); doc.rect(0, 0, w, 42, "F");
      if (template === "premium") { doc.setFillColor(181, 143, 74); doc.rect(0, 40, w, 2, "F"); }
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(25); doc.text(template === "service" ? "Werkzaamheden & factuur" : "Factuur", 16, 24);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`${invoiceNumber} · ${templateNames[template]}`, 16, 34); y = 56; doc.setTextColor(17, 24, 39);
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Factuur aan", left, y); doc.text("Factuurgegevens", w - 76, y);
    y += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    [customer.company || "Klantnaam", customer.contact, customer.address, customer.postalCity, customer.email].filter(Boolean).forEach((t, i) => doc.text(String(t), left, y + i * 5));
    doc.text(`Datum: ${new Date(invoiceDate).toLocaleDateString("nl-NL")}`, w - 76, y);
    doc.text(`Vervalt: ${new Date(dueDate).toLocaleDateString("nl-NL")}`, w - 76, y + 5);
    y += 34;

    const tableW = w - left - 16;
    const dark = template === "premium" ? [181, 143, 74] : template === "service" ? [7, 89, 133] : template === "split" ? [30, 64, 175] : [17, 24, 39];
    doc.setFillColor(dark[0], dark[1], dark[2]); doc.rect(left, y, tableW, 8, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(template === "service" ? "Werkzaamheden" : "Omschrijving", left + 2, y + 5.5); doc.text(template === "service" ? "Uren" : "Aantal", left + tableW - 82, y + 5.5, { align: "right" }); doc.text(template === "service" ? "Tarief" : "Prijs", left + tableW - 56, y + 5.5, { align: "right" }); doc.text("Totaal", left + tableW - 2, y + 5.5, { align: "right" });
    y += 11; doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "normal");
    lines.filter((line) => line.description.trim()).forEach((line) => {
      const sub = line.quantity * line.price; const total = sub + sub * line.vat / 100; const desc = doc.splitTextToSize(line.description, tableW - 88); const rowH = Math.max(template === "compact" ? 6 : 9, desc.length * 4 + 4);
      doc.setDrawColor(229, 231, 235); doc.line(left, y - 3, left + tableW, y - 3); doc.text(desc, left + 2, y + 2); doc.text(String(line.quantity), left + tableW - 82, y + 2, { align: "right" }); doc.text(pdfMoney(line.price), left + tableW - 56, y + 2, { align: "right" }); doc.text(pdfMoney(total), left + tableW - 2, y + 2, { align: "right" }); y += rowH;
    });
    y += 8; const totalsX = w - 92; doc.text("Subtotaal", totalsX, y); doc.text(pdfMoney(totals.subtotal), w - 16, y, { align: "right" }); y += 7; doc.text("BTW", totalsX, y); doc.text(pdfMoney(totals.vat), w - 16, y, { align: "right" }); y += 5; doc.line(totalsX, y, w - 16, y); y += 9; doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Totaal EUR", totalsX, y); doc.text(pdfMoney(totals.total), w - 16, y, { align: "right" });
    y = h - 42; doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(doc.splitTextToSize(notes, w - left - 16), left, y);
    doc.save(`${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-") || "factuur"}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Factuur Maker</h1>
          <p className="text-muted-foreground">Links gegevens invullen, rechts live preview.</p>
        </div>
        <Badge variant="secondary">Geen database-opslag</Badge>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[520px_minmax(0,1fr)] xl:grid-cols-[460px_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-6 xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto xl:pr-2">
          <Card>
            <CardHeader><CardTitle>Template kiezen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={template} onValueChange={(value) => setTemplate(value as Template)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(templateNames).map(([key, name]) => <SelectItem key={key} value={key}>{name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">Live preview rechts past direct mee aan.</div>
            </CardContent>
          </Card>

          <PartyCard title="Afzender" party={sender} onChange={(f, v) => setParty("sender", f, v)} logo={logo} uploadLogo={uploadLogo} />
          <PartyCard title="Klant" party={customer} onChange={(f, v) => setParty("customer", f, v)} />

          <Card>
            <CardHeader><CardTitle>Factuurgegevens</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-4">
                <Field label="Factuurnummer" value={invoiceNumber} onChange={setInvoiceNumber} />
                <Field label="Factuurdatum" type="date" value={invoiceDate} onChange={setInvoiceDate} />
                <Field label="Vervaldatum" type="date" value={dueDate} onChange={setDueDate} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Factuurregels</Label><Button variant="outline" size="sm" onClick={() => setLines((rows) => [...rows, newLine()])}><Plus className="h-4 w-4 mr-2" />Regel toevoegen</Button></div>
                <div className="hidden md:grid grid-cols-12 xl:hidden 2xl:grid gap-2 px-3 text-xs font-semibold uppercase text-muted-foreground"><div className="col-span-5">Omschrijving</div><div className="col-span-2">Aantal</div><div className="col-span-2">Prijs</div><div className="col-span-2">BTW</div><div className="col-span-1 text-right">Actie</div></div>
                {lines.map((line) => <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 xl:grid-cols-1 2xl:grid-cols-12 gap-2 rounded-lg border p-3"><Input className="md:col-span-5 xl:col-span-1 2xl:col-span-5" placeholder={template === "service" ? "Bijv. IT support mei 2026" : "Omschrijving"} value={line.description} onChange={(e) => setLine(line.id, "description", e.target.value)} /><Input className="md:col-span-2 xl:col-span-1 2xl:col-span-2" type="number" step="0.01" value={line.quantity} onChange={(e) => setLine(line.id, "quantity", Number(e.target.value))} /><Input className="md:col-span-2 xl:col-span-1 2xl:col-span-2" type="number" step="0.01" value={line.price} onChange={(e) => setLine(line.id, "price", Number(e.target.value))} /><Input className="md:col-span-2 xl:col-span-1 2xl:col-span-2" type="number" value={line.vat} onChange={(e) => setLine(line.id, "vat", Number(e.target.value))} /><Button variant="ghost" size="icon" onClick={() => setLines((rows) => rows.length === 1 ? rows : rows.filter((row) => row.id !== line.id))}><Trash2 className="h-4 w-4" /></Button></div>)}
              </div>
              <div className="space-y-2"><Label>Opmerking onderaan factuur</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </CardContent>
          </Card>
        </div>

        <InvoicePreview template={template} sender={sender} customer={customer} invoiceNumber={invoiceNumber} invoiceDate={invoiceDate} dueDate={dueDate} lines={lines} totals={totals} notes={notes} logo={logo} downloadPdf={downloadPdf} />
      </div>
    </div>
  );
}

function InvoicePreview({ template, sender, customer, invoiceNumber, invoiceDate, dueDate, lines, totals, notes, logo, downloadPdf }: { template: Template; sender: Party; customer: Party; invoiceNumber: string; invoiceDate: string; dueDate: string; lines: Line[]; totals: { subtotal: number; vat: number; total: number }; notes: string; logo: string; downloadPdf: () => void }) {
  const sidebar = template === "sidebar";
  const premium = template === "premium";
  const classic = template === "classic";
  const service = template === "service";
  const split = template === "split";
  const minimal = template === "minimal";
  const letter = template === "letterhead";
  return <Card className="sticky top-4 h-fit"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Live preview</CardTitle><Button onClick={downloadPdf}><Download className="h-4 w-4 mr-2" />PDF downloaden</Button></div></CardHeader><CardContent><div className={`rounded-xl border bg-white text-slate-900 shadow-sm overflow-hidden flex ${sidebar ? "p-0" : "p-6"} ${classic ? "font-serif" : ""}`}>{sidebar && <aside className="w-44 shrink-0 bg-slate-950 text-white p-5 text-xs space-y-6"><div className="text-2xl font-bold">FACTUUR</div><div>{invoiceNumber}</div><div className="break-words"><b>{sender.company}</b><br />{sender.email}<br />{sender.phone}</div><div>KvK<br />{sender.kvk || "-"}</div></aside>}<div className={`flex-1 flex flex-col ${sidebar ? "p-8 space-y-6" : "space-y-6"}`}>{!sidebar && <div className={`${premium ? "bg-slate-950 text-white border-b-4 border-amber-500" : service ? "bg-sky-800 text-white" : split ? "grid grid-cols-2 p-0" : classic || minimal || letter ? "bg-white text-slate-900 border-b" : "bg-slate-900 text-white"} ${split ? "-m-6 mb-0" : "-m-6 mb-0 p-6"}`}>{split ? <><div className="bg-blue-800 text-white p-6"><div className="text-3xl font-bold">Factuur</div><div>{invoiceNumber}</div></div><div className="bg-slate-100 p-6"><b>{customer.company || "Klantnaam"}</b><div>Datum: {new Date(invoiceDate).toLocaleDateString("nl-NL")}</div><div>Vervalt: {new Date(dueDate).toLocaleDateString("nl-NL")}</div></div></> : <div className="flex justify-between gap-4"><div>{logo && <img src={logo} className="h-14 max-w-[150px] object-contain mb-3" />}<div className={`${minimal ? "text-4xl font-light" : "text-3xl font-bold"}`}>{service ? "Werkzaamheden & factuur" : premium ? "Invoice" : "Factuur"}</div><div className="text-sm opacity-80">{invoiceNumber} · {templateNames[template]}</div></div><div className="text-right text-sm"><b>{sender.company}</b><div>{sender.email}</div><div>{sender.phone}</div></div></div>}</div>}{template !== "compact" && !split && <div className={`${letter || minimal || classic ? "grid grid-cols-2 border-b pb-4 text-sm" : "grid grid-cols-2 gap-4 text-sm"}`}><div className={letter || minimal || classic ? "" : "rounded-lg bg-slate-50 p-4"}><b>Factuur aan</b><div>{customer.company || "Klantnaam"}</div><div>{customer.contact}</div><div>{customer.address}</div><div>{customer.postalCity}</div></div><div className={letter || minimal || classic ? "text-right" : "rounded-lg bg-slate-50 p-4"}><b>Factuurgegevens</b><div>Datum: {new Date(invoiceDate).toLocaleDateString("nl-NL")}</div><div>Vervaldatum: {new Date(dueDate).toLocaleDateString("nl-NL")}</div></div></div>}<div className="overflow-hidden rounded-lg border"><div className={`grid grid-cols-12 text-xs font-semibold px-3 py-2 ${premium ? "bg-amber-600 text-white" : service ? "bg-sky-800 text-white" : split ? "bg-blue-800 text-white" : classic || minimal || letter ? "bg-white text-slate-900 border-b" : "bg-slate-900 text-white"}`}><div className="col-span-6">{service ? "Werkzaamheden" : "Omschrijving"}</div><div className="col-span-2 text-right">{service ? "Uren" : "Aantal"}</div><div className="col-span-2 text-right">{service ? "Tarief" : "Prijs"}</div><div className="col-span-2 text-right">Totaal</div></div>{lines.filter((line) => line.description.trim()).map((line) => { const sub = line.quantity * line.price; const total = sub + sub * line.vat / 100; return <div key={line.id} className="grid grid-cols-12 px-3 py-2 text-sm border-t"><div className="col-span-6">{line.description}</div><div className="col-span-2 text-right">{line.quantity}</div><div className="col-span-2 text-right">{eur(line.price)}</div><div className="col-span-2 text-right">{eur(total)}</div></div>; })}</div><div className={`ml-auto w-72 space-y-2 text-sm ${premium ? "rounded-xl bg-amber-50 p-4" : minimal ? "border-t pt-4" : ""}`}><div className="flex justify-between"><span>Subtotaal</span><b>{eur(totals.subtotal)}</b></div><div className="flex justify-between"><span>BTW</span><b>{eur(totals.vat)}</b></div><Separator /><div className="flex justify-between text-lg"><span>Totaal</span><b>{eur(totals.total)}</b></div></div><div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-line mt-auto">{notes}</div></div></div></CardContent></Card>;
}

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
const PartyCard = ({ title, party, onChange, logo, uploadLogo }: { title: string; party: Party; onChange: (field: keyof Party, value: string) => void; logo?: string; uploadLogo?: (file?: File) => void }) => <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4"><Field label="Bedrijfsnaam" value={party.company} onChange={(v) => onChange("company", v)} /><Field label="Naam/contact" value={party.contact} onChange={(v) => onChange("contact", v)} /><Field label="Adres" value={party.address} onChange={(v) => onChange("address", v)} /><Field label="Postcode + plaats" value={party.postalCity} onChange={(v) => onChange("postalCity", v)} /><Field label="E-mail" value={party.email} onChange={(v) => onChange("email", v)} /><Field label="Telefoon" value={party.phone} onChange={(v) => onChange("phone", v)} /><Field label="KvK" value={party.kvk} onChange={(v) => onChange("kvk", v)} /><Field label="BTW-nummer" value={party.vatNumber} onChange={(v) => onChange("vatNumber", v)} />{title === "Afzender" && <><div className="md:col-span-2 xl:col-span-1 2xl:col-span-2"><Field label="IBAN" value={party.iban} onChange={(v) => onChange("iban", v)} /></div><div className="md:col-span-2 xl:col-span-1 2xl:col-span-2 space-y-2"><Label>Logo uploaden</Label><div className="flex items-center gap-3"><Input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => uploadLogo?.(e.target.files?.[0])} /><Upload className="h-5 w-5 text-muted-foreground" /></div>{logo && <img src={logo} className="h-14 max-w-[180px] object-contain rounded border p-2" />}</div></>}</CardContent></Card>;
