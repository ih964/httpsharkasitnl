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

type Template = "modern" | "compact" | "premium" | "classic" | "service";
type Line = { id: string; description: string; quantity: number; price: number; vat: number };
type Party = { company: string; contact: string; address: string; postalCity: string; email: string; phone: string; kvk: string; vatNumber: string; iban: string };

const makeLine = (): Line => ({ id: crypto.randomUUID(), description: "", quantity: 1, price: 0, vat: 21 });
const eur = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number.isFinite(v) ? v : 0);
const money = (v: number) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);

const templates: Record<Template, { label: string; desc: string; header: [number, number, number]; accent: [number, number, number]; compact: boolean }> = {
  modern: { label: "Modern standaard", desc: "Strak en zakelijk", header: [17, 24, 39], accent: [37, 99, 235], compact: false },
  compact: { label: "Compact", desc: "Meer regels op één pagina", header: [31, 41, 55], accent: [75, 85, 99], compact: true },
  premium: { label: "Premium / corporate", desc: "Luxer met sterke header", header: [12, 18, 34], accent: [180, 140, 70], compact: false },
  classic: { label: "Klassiek", desc: "Simpel en boekhoudkundig", header: [255, 255, 255], accent: [17, 24, 39], compact: false },
  service: { label: "Dienstverlening / uren", desc: "Voor werkzaamheden en consultancy", header: [7, 89, 133], accent: [14, 165, 233], compact: false },
};

const InvoiceMakerTemplates = () => {
  const { toast } = useToast();
  const [template, setTemplate] = useState<Template>("modern");
  const [sender, setSender] = useState<Party>({ company: "Harkas IT", contact: "Ilias Harkati", address: "", postalCity: "", email: "administratie@harkasit.nl", phone: "085 124 9091", kvk: "84795085", vatNumber: "", iban: "" });
  const [customer, setCustomer] = useState<Party>({ company: "", contact: "", address: "", postalCity: "", email: "", phone: "", kvk: "", vatNumber: "", iban: "" });
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${new Date().getFullYear()}-001`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); });
  const [notes, setNotes] = useState("Graag het totaalbedrag overmaken onder vermelding van het factuurnummer.");
  const [lines, setLines] = useState<Line[]>([makeLine()]);
  const [logo, setLogo] = useState("");

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.price, 0);
    const vat = lines.reduce((s, l) => s + (l.quantity * l.price * l.vat) / 100, 0);
    return { subtotal, vat, total: subtotal + vat };
  }, [lines]);

  const cfg = templates[template];
  const setParty = (type: "sender" | "customer", field: keyof Party, value: string) => (type === "sender" ? setSender : setCustomer)((p) => ({ ...p, [field]: value }));
  const setLine = (id: string, field: keyof Line, value: string | number) => setLines((all) => all.map((l) => l.id === id ? { ...l, [field]: value } : l));
  const removeLine = (id: string) => setLines((all) => all.length === 1 ? all : all.filter((l) => l.id !== id));
  const uploadLogo = (file?: File) => { if (!file) return; const r = new FileReader(); r.onload = () => setLogo(String(r.result || "")); r.readAsDataURL(file); };

  const downloadPdf = () => {
    if (!sender.company || !customer.company || !invoiceNumber || lines.every((l) => !l.description.trim())) {
      toast({ title: "Vul eerst afzender, klant, factuurnummer en minimaal één regel in", variant: "destructive" });
      return;
    }
    const doc = new jsPDF("p", "mm", "a4");
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const m = template === "compact" ? 12 : 16;
    const rowStep = cfg.compact ? 6 : 9;
    let y = template === "classic" ? 18 : 50;
    const page = (need = 20) => { if (y + need > h - m) { doc.addPage(); y = m; } };

    if (template === "classic") {
      doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "bold"); doc.setFontSize(25); doc.text("FACTUUR", m, y);
      doc.setFontSize(10); doc.text(invoiceNumber, w - m, y, { align: "right" }); y += 18;
    } else {
      doc.setFillColor(...cfg.header); doc.rect(0, 0, w, template === "premium" ? 44 : 38, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(template === "premium" ? 28 : 25); doc.text("Factuur", m, 22);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`${invoiceNumber} · ${templates[template].label}`, m, 31);
      if (logo) { try { doc.addImage(logo, logo.includes("png") ? "PNG" : "JPEG", w - 50, 8, 32, 22); } catch {} }
    }

    doc.setTextColor(17, 24, 39); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Afzender", m, y); doc.text("Factuur aan", 112, y); y += 6;
    doc.setFont("helvetica", "normal");
    [sender.company, sender.contact, sender.address, sender.postalCity, sender.email, sender.phone].filter(Boolean).forEach((t, i) => doc.text(t, m, y + i * 5));
    [customer.company, customer.contact, customer.address, customer.postalCity, customer.email, customer.phone].filter(Boolean).forEach((t, i) => doc.text(t, 112, y + i * 5));
    y += cfg.compact ? 32 : 42;

    doc.setFillColor(249, 250, 251); doc.roundedRect(m, y, w - m * 2, cfg.compact ? 18 : 24, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.text("Factuurgegevens", m + 4, y + 7);
    doc.setFont("helvetica", "normal"); doc.text(`Factuurdatum: ${new Date(invoiceDate).toLocaleDateString("nl-NL")}`, m + 4, y + 14);
    doc.text(`Vervaldatum: ${new Date(dueDate).toLocaleDateString("nl-NL")}`, 98, y + 14); y += cfg.compact ? 28 : 36;

    doc.setFillColor(...(template === "classic" ? [17, 24, 39] as [number, number, number] : cfg.header)); doc.rect(m, y, w - m * 2, 9, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(template === "service" ? "Werkzaamheden / omschrijving" : "Omschrijving", m + 2, y + 6); doc.text(template === "service" ? "Uren" : "Aantal", 108, y + 6, { align: "right" }); doc.text(template === "service" ? "Tarief" : "Prijs", 132, y + 6, { align: "right" }); doc.text("BTW", 153, y + 6, { align: "right" }); doc.text("Totaal", w - m - 2, y + 6, { align: "right" });
    y += 12; doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "normal");
    lines.filter((l) => l.description.trim()).forEach((l) => { const sub = l.quantity * l.price; const total = sub + sub * l.vat / 100; const desc = doc.splitTextToSize(l.description, 76); const rowH = Math.max(rowStep, desc.length * 5 + 4); page(rowH + 5); doc.setDrawColor(229, 231, 235); doc.line(m, y - 3, w - m, y - 3); doc.text(desc, m + 2, y + 2); doc.text(String(l.quantity), 108, y + 2, { align: "right" }); doc.text(money(l.price), 132, y + 2, { align: "right" }); doc.text(`${l.vat}%`, 153, y + 2, { align: "right" }); doc.text(money(total), w - m - 2, y + 2, { align: "right" }); y += rowH; });

    y += 8; page(70); const tx = 118; doc.setFontSize(10); doc.text("Subtotaal", tx, y); doc.text(money(totals.subtotal), w - m, y, { align: "right" }); y += 7; doc.text("BTW", tx, y); doc.text(money(totals.vat), w - m, y, { align: "right" }); y += 4; doc.line(tx, y, w - m, y); y += 9; doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Totaal EUR", tx, y); doc.text(money(totals.total), w - m, y, { align: "right" });

    const bottomY = h - 42; y = Math.max(y + 16, bottomY); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Betaalgegevens", m, y); doc.text("Opmerking", 112, y); y += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(9); [`IBAN: ${sender.iban || "-"}`, `KvK: ${sender.kvk || "-"}`, `BTW: ${sender.vatNumber || "-"}`].forEach((t, i) => doc.text(t, m, y + i * 5)); doc.text(doc.splitTextToSize(notes || "-", 80), 112, y);
    doc.save(`${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-") || "factuur"}.pdf`); toast({ title: "PDF gedownload", description: templates[template].label });
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h1 className="text-3xl font-bold">Factuur Maker</h1><p className="text-muted-foreground">Losse factuur maken met template-keuze en direct PDF downloaden.</p></div><Badge variant="secondary">Geen database-opslag</Badge></div>
    <Card><CardHeader><CardTitle>Template kiezen</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Template</Label><Select value={template} onValueChange={(v) => setTemplate(v as Template)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(templates).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="rounded-lg border p-4 text-sm text-muted-foreground"><strong className="text-foreground">{cfg.label}</strong><br />{cfg.desc}</div></CardContent></Card>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div className="space-y-6"><PartyCard title="Afzender" party={sender} onChange={(f, v) => setParty("sender", f, v)} logo={logo} uploadLogo={uploadLogo} /><PartyCard title="Klant" party={customer} onChange={(f, v) => setParty("customer", f, v)} /><Card><CardHeader><CardTitle>Factuurgegevens</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Factuurnummer" value={invoiceNumber} onChange={setInvoiceNumber} /><Field label="Factuurdatum" type="date" value={invoiceDate} onChange={setInvoiceDate} /><Field label="Vervaldatum" type="date" value={dueDate} onChange={setDueDate} /></div><div className="space-y-3"><div className="flex items-center justify-between"><Label>Factuurregels</Label><Button variant="outline" size="sm" onClick={() => setLines((l) => [...l, makeLine()])}><Plus className="h-4 w-4 mr-2" />Regel toevoegen</Button></div><div className="hidden md:grid grid-cols-12 gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><div className="col-span-5">Omschrijving</div><div className="col-span-2">{template === "service" ? "Uren" : "Aantal"}</div><div className="col-span-2">{template === "service" ? "Tarief ex. btw" : "Prijs ex. btw"}</div><div className="col-span-2">BTW %</div><div className="col-span-1 text-right">Actie</div></div>{lines.map((line) => <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border p-3"><div className="md:col-span-5 space-y-1"><Label className="md:hidden text-xs">Omschrijving</Label><Input placeholder={template === "service" ? "Bijv. IT support mei 2026" : "Bijv. werkzaamheden"} value={line.description} onChange={(e) => setLine(line.id, "description", e.target.value)} /></div><div className="md:col-span-2 space-y-1"><Label className="md:hidden text-xs">Aantal</Label><Input type="number" step="0.01" value={line.quantity} onChange={(e) => setLine(line.id, "quantity", Number(e.target.value))} /></div><div className="md:col-span-2 space-y-1"><Label className="md:hidden text-xs">Prijs ex. btw</Label><Input type="number" step="0.01" value={line.price} onChange={(e) => setLine(line.id, "price", Number(e.target.value))} /></div><div className="md:col-span-2 space-y-1"><Label className="md:hidden text-xs">BTW %</Label><Input type="number" value={line.vat} onChange={(e) => setLine(line.id, "vat", Number(e.target.value))} /></div><div className="md:col-span-1 flex items-end justify-end"><Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={lines.length === 1}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div><div className="space-y-2"><Label>Omschrijving / opmerking</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div></CardContent></Card></div><Preview template={template} cfg={cfg} logo={logo} sender={sender} customer={customer} invoiceNumber={invoiceNumber} invoiceDate={invoiceDate} dueDate={dueDate} lines={lines} totals={totals} notes={notes} downloadPdf={downloadPdf} /></div>
  </div>;
};

const Preview = ({ template, cfg, logo, sender, customer, invoiceNumber, invoiceDate, dueDate, lines, totals, notes, downloadPdf }: any) => <Card className="sticky top-4 h-fit"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>PDF voorbeeld</CardTitle><Button onClick={downloadPdf}><Download className="h-4 w-4 mr-2" />PDF downloaden</Button></div></CardHeader><CardContent><div className={`rounded-xl border bg-white text-slate-900 p-6 shadow-sm space-y-6 ${template === "compact" ? "text-sm" : ""}`}><div className={`flex justify-between gap-6 ${template === "premium" ? "border-b-4 pb-4" : ""}`} style={{ borderColor: `rgb(${cfg.accent.join(",")})` }}><div className="flex gap-4 items-center">{logo && <img src={logo} alt="Logo" className="h-14 max-w-[140px] object-contain" />}<div><div className="text-3xl font-bold">Factuur</div><div className="text-sm text-slate-500">{invoiceNumber} · {cfg.label}</div></div></div><div className="text-right text-sm"><div className="font-semibold">{sender.company}</div><div>{sender.email}</div><div>{sender.phone}</div></div></div><div className="grid grid-cols-2 gap-4 text-sm"><div className="rounded-lg bg-slate-50 p-4"><div className="font-semibold mb-2">Factuur aan</div><div className="font-medium">{customer.company || "Klantnaam"}</div><div>{customer.contact}</div><div>{customer.address}</div><div>{customer.postalCity}</div></div><div className="rounded-lg bg-slate-50 p-4"><div className="font-semibold mb-2">Factuurgegevens</div><div>Datum: {new Date(invoiceDate).toLocaleDateString("nl-NL")}</div><div>Vervaldatum: {new Date(dueDate).toLocaleDateString("nl-NL")}</div></div></div><div className="overflow-hidden rounded-lg border"><div className="grid grid-cols-12 text-white text-xs font-semibold px-3 py-2" style={{ backgroundColor: `rgb(${cfg.header.join(",")})` }}><div className="col-span-6">{template === "service" ? "Werkzaamheden" : "Omschrijving"}</div><div className="col-span-2 text-right">{template === "service" ? "Uren" : "Aantal"}</div><div className="col-span-2 text-right">{template === "service" ? "Tarief" : "Prijs"}</div><div className="col-span-2 text-right">Totaal</div></div>{lines.filter((l: Line) => l.description.trim()).map((l: Line) => { const sub = l.quantity * l.price; const total = sub + sub * l.vat / 100; return <div key={l.id} className="grid grid-cols-12 px-3 py-2 text-sm border-t"><div className="col-span-6">{l.description}</div><div className="col-span-2 text-right">{l.quantity}</div><div className="col-span-2 text-right">{eur(l.price)}</div><div className="col-span-2 text-right">{eur(total)}</div></div>; })}</div><div className="ml-auto w-72 space-y-2 text-sm"><div className="flex justify-between"><span>Subtotaal</span><strong>{eur(totals.subtotal)}</strong></div><div className="flex justify-between"><span>BTW</span><strong>{eur(totals.vat)}</strong></div><Separator /><div className="flex justify-between text-lg"><span>Totaal</span><strong>{eur(totals.total)}</strong></div></div><div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-line mt-auto">{notes}</div></div></CardContent></Card>;
const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
const PartyCard = ({ title, party, onChange, logo, uploadLogo }: { title: string; party: Party; onChange: (f: keyof Party, v: string) => void; logo?: string; uploadLogo?: (file?: File) => void }) => <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Bedrijfsnaam" value={party.company} onChange={(v) => onChange("company", v)} /><Field label="Naam/contact" value={party.contact} onChange={(v) => onChange("contact", v)} /><Field label="Adres" value={party.address} onChange={(v) => onChange("address", v)} /><Field label="Postcode + plaats" value={party.postalCity} onChange={(v) => onChange("postalCity", v)} /><Field label="E-mail" value={party.email} onChange={(v) => onChange("email", v)} /><Field label="Telefoon" value={party.phone} onChange={(v) => onChange("phone", v)} /><Field label="KvK" value={party.kvk} onChange={(v) => onChange("kvk", v)} /><Field label="BTW-nummer" value={party.vatNumber} onChange={(v) => onChange("vatNumber", v)} />{title === "Afzender" && <><div className="md:col-span-2"><Field label="IBAN" value={party.iban} onChange={(v) => onChange("iban", v)} /></div><div className="md:col-span-2 space-y-2"><Label>Logo uploaden</Label><div className="flex items-center gap-3"><Input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => uploadLogo?.(e.target.files?.[0])} /><Upload className="h-5 w-5 text-muted-foreground" /></div>{logo && <img src={logo} alt="Logo preview" className="h-14 max-w-[180px] object-contain rounded border p-2" />}</div></>}</CardContent></Card>;

export default InvoiceMakerTemplates;
