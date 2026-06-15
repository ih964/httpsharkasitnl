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

const templateDescriptions: Record<Template, string> = {
  modern: "Brede donkere header, cards en moderne tabel.",
  premium: "Luxe corporate header, goud accent en opvallend totalenblok.",
  classic: "Zwart/wit boekhoudfactuur zonder moderne cards.",
  compact: "Kleine marges en compacte regels voor veel factuurregels.",
  service: "Uren/werkzaamheden layout voor IT, support en consultancy.",
  sidebar: "Verticale zijbalk links met bedrijfsgegevens en factuurinhoud rechts.",
  letterhead: "Briefpapier-stijl met grote topmarge, subtiele lijn en formele indeling.",
  split: "Bovenkant in twee grote vlakken: klant links, factuurdata rechts.",
  minimal: "Heel rustige witte layout met dunne lijnen en maximale witruimte.",
};

const newLine = (): Line => ({ id: crypto.randomUUID(), description: "", quantity: 1, price: 0, vat: 21 });
const money = (value: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number.isFinite(value) ? value : 0);
const pdfMoney = (value: number) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);

export default function InvoiceMakerMoreLayouts() {
  const { toast } = useToast();
  const [template, setTemplate] = useState<Template>("modern");
  const [sender, setSender] = useState<Party>({ company: "Harkas IT", contact: "Ilias Harkati", address: "", postalCity: "", email: "administratie@harkasit.nl", phone: "085 124 9091", kvk: "84795085", vatNumber: "", iban: "" });
  const [customer, setCustomer] = useState<Party>({ company: "", contact: "", address: "", postalCity: "", email: "", phone: "", kvk: "", vatNumber: "", iban: "" });
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${new Date().getFullYear()}-001`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 14); return date.toISOString().slice(0, 10); });
  const [notes, setNotes] = useState("Graag het totaalbedrag overmaken onder vermelding van het factuurnummer.");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [logo, setLogo] = useState("");

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const vat = lines.reduce((sum, line) => sum + (line.quantity * line.price * line.vat) / 100, 0);
    return { subtotal, vat, total: subtotal + vat };
  }, [lines]);

  const setParty = (kind: "sender" | "customer", field: keyof Party, value: string) => {
    (kind === "sender" ? setSender : setCustomer)((prev) => ({ ...prev, [field]: value }));
  };
  const setLine = (id: string, field: keyof Line, value: string | number) => setLines((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
  const uploadLogo = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setLogo(String(reader.result || "")); reader.readAsDataURL(file); };

  const drawTablePdf = (doc: jsPDF, startY: number, margin: number, width: number, style: Template) => {
    let y = startY;
    const rowHeight = style === "compact" ? 6 : 9;
    const headerColor: [number, number, number] = style === "premium" ? [181, 143, 74] : style === "service" ? [7, 89, 133] : style === "sidebar" ? [15, 23, 42] : style === "split" ? [30, 64, 175] : style === "classic" || style === "minimal" || style === "letterhead" ? [255, 255, 255] : [17, 24, 39];
    doc.setFillColor(...headerColor); doc.rect(margin, y, width, 8, "F");
    doc.setTextColor(style === "classic" || style === "minimal" || style === "letterhead" ? 17 : 255, style === "classic" || style === "minimal" || style === "letterhead" ? 24 : 255, style === "classic" || style === "minimal" || style === "letterhead" ? 39 : 255);
    if (style === "classic" || style === "minimal" || style === "letterhead") doc.rect(margin, y, width, 8);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(style === "service" ? "Werkzaamheden" : "Omschrijving", margin + 2, y + 5.5);
    doc.text(style === "service" ? "Uren" : "Aantal", margin + width - 86, y + 5.5, { align: "right" });
    doc.text(style === "service" ? "Tarief" : "Prijs", margin + width - 60, y + 5.5, { align: "right" });
    doc.text("BTW", margin + width - 38, y + 5.5, { align: "right" });
    doc.text("Totaal", margin + width - 2, y + 5.5, { align: "right" });
    y += 11; doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "normal");
    lines.filter((line) => line.description.trim()).forEach((line) => {
      const subtotal = line.quantity * line.price;
      const total = subtotal + subtotal * line.vat / 100;
      const desc = doc.splitTextToSize(line.description, Math.max(52, width - 90));
      const h = Math.max(rowHeight, desc.length * 4 + 4);
      doc.setDrawColor(229, 231, 235); doc.line(margin, y - 3, margin + width, y - 3);
      doc.text(desc, margin + 2, y + 2);
      doc.text(String(line.quantity), margin + width - 86, y + 2, { align: "right" });
      doc.text(pdfMoney(line.price), margin + width - 60, y + 2, { align: "right" });
      doc.text(`${line.vat}%`, margin + width - 38, y + 2, { align: "right" });
      doc.text(pdfMoney(total), margin + width - 2, y + 2, { align: "right" });
      y += h;
    });
    return y;
  };

  const downloadPdf = () => {
    if (!customer.company || !sender.company || lines.every((line) => !line.description.trim())) {
      toast({ title: "Vul minimaal afzender, klant en één regel in", variant: "destructive" });
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = template === "compact" ? 10 : 16;
    let y = 18;

    if (template === "sidebar") {
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 58, pageHeight, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.text("FACTUUR", 10, 24);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(invoiceNumber, 10, 32);
      [sender.company, sender.contact, sender.email, sender.phone, sender.kvk ? `KvK ${sender.kvk}` : ""].filter(Boolean).forEach((t, i) => doc.text(t, 10, 58 + i * 6));
      doc.setTextColor(17, 24, 39); y = 22;
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(customer.company || "Klant", 70, y); y += 10;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`Datum: ${new Date(invoiceDate).toLocaleDateString("nl-NL")}`, 70, y); doc.text(`Vervalt: ${new Date(dueDate).toLocaleDateString("nl-NL")}`, 130, y); y += 18;
      y = drawTablePdf(doc, y, 70, pageWidth - 86, template);
    } else if (template === "letterhead") {
      doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text(sender.company, margin, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text([sender.address, sender.postalCity, sender.email, sender.phone].filter(Boolean).join(" · "), margin, y + 7);
      doc.setDrawColor(17, 24, 39); doc.line(margin, y + 14, pageWidth - margin, y + 14);
      y = 50; doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text("Factuur", margin, y); doc.setFontSize(10); doc.text(invoiceNumber, pageWidth - margin, y, { align: "right" });
      y += 20; doc.setFont("helvetica", "normal"); doc.text(customer.company || "Klant", margin, y); doc.text(`Datum: ${new Date(invoiceDate).toLocaleDateString("nl-NL")}`, pageWidth - margin, y, { align: "right" }); y += 20;
      y = drawTablePdf(doc, y, margin, pageWidth - margin * 2, template);
    } else if (template === "split") {
      doc.setFillColor(30, 64, 175); doc.rect(0, 0, pageWidth / 2, 62, "F"); doc.setFillColor(241, 245, 249); doc.rect(pageWidth / 2, 0, pageWidth / 2, 62, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(25); doc.text("Factuur", margin, 24); doc.setFontSize(10); doc.text(invoiceNumber, margin, 34);
      doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.text(customer.company || "Klant", pageWidth / 2 + 12, 22); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`Datum ${new Date(invoiceDate).toLocaleDateString("nl-NL")}`, pageWidth / 2 + 12, 32); doc.text(`Vervalt ${new Date(dueDate).toLocaleDateString("nl-NL")}`, pageWidth / 2 + 12, 39);
      y = 78; y = drawTablePdf(doc, y, margin, pageWidth - margin * 2, template);
    } else if (template === "minimal") {
      doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(sender.company, margin, y); doc.text(invoiceNumber, pageWidth - margin, y, { align: "right" });
      y = 42; doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.text("Invoice", margin, y); y += 18; doc.setFontSize(10); doc.text(customer.company || "Klant", margin, y); doc.setFont("helvetica", "normal"); doc.text(new Date(invoiceDate).toLocaleDateString("nl-NL"), pageWidth - margin, y, { align: "right" }); y += 24;
      y = drawTablePdf(doc, y, margin, pageWidth - margin * 2, template);
    } else {
      const dark: [number, number, number] = template === "premium" ? [12, 18, 34] : template === "service" ? [7, 89, 133] : [17, 24, 39];
      if (template === "classic" || template === "compact") {
        doc.setTextColor(17, 24, 39); doc.setFont(template === "classic" ? "times" : "helvetica", "bold"); doc.setFontSize(template === "compact" ? 18 : 25); doc.text(`Factuur ${template === "compact" ? invoiceNumber : ""}`, margin, y); if (template !== "compact") doc.text(invoiceNumber, pageWidth - margin, y, { align: "right" }); y += template === "compact" ? 18 : 24;
      } else {
        doc.setFillColor(...dark); doc.rect(0, 0, pageWidth, template === "premium" ? 52 : 40, "F"); if (template === "premium") { doc.setFillColor(181, 143, 74); doc.rect(0, 50, pageWidth, 2, "F"); }
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(template === "premium" ? 30 : 25); doc.text(template === "service" ? "Werkzaamheden & factuur" : "Factuur", margin, 24); doc.setFontSize(10); doc.text(invoiceNumber, margin, 34); y = template === "premium" ? 66 : 54; doc.setTextColor(17, 24, 39);
      }
      if (template !== "compact") { doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Afzender", margin, y); doc.text("Factuur aan", 112, y); y += 6; doc.setFont("helvetica", "normal"); [sender.company, sender.contact, sender.address, sender.postalCity, sender.email, sender.phone].filter(Boolean).forEach((t, i) => doc.text(t, margin, y + i * 5)); [customer.company, customer.contact, customer.address, customer.postalCity, customer.email].filter(Boolean).forEach((t, i) => doc.text(t, 112, y + i * 5)); y += 42; }
      y = drawTablePdf(doc, y, margin, pageWidth - margin * 2, template);
    }

    y += 8; const totalsX = template === "sidebar" ? 125 : 118; doc.setFontSize(10); doc.text("Subtotaal", totalsX, y); doc.text(pdfMoney(totals.subtotal), pageWidth - margin, y, { align: "right" }); y += 7; doc.text("BTW", totalsX, y); doc.text(pdfMoney(totals.vat), pageWidth - margin, y, { align: "right" }); y += 4; doc.line(totalsX, y, pageWidth - margin, y); y += 9; doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Totaal EUR", totalsX, y); doc.text(pdfMoney(totals.total), pageWidth - margin, y, { align: "right" });
    const footerY = pageHeight - 42; y = Math.max(y + 14, footerY); doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("Betaalgegevens", template === "sidebar" ? 70 : margin, y); doc.text("Opmerking", 112, y); y += 6; doc.setFont("helvetica", "normal"); [`IBAN: ${sender.iban || "-"}`, `KvK: ${sender.kvk || "-"}`, `BTW: ${sender.vatNumber || "-"}`].forEach((t, i) => doc.text(t, template === "sidebar" ? 70 : margin, y + i * 5)); doc.text(doc.splitTextToSize(notes || "-", 80), 112, y);
    doc.save(`${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-") || "factuur"}.pdf`);
  };

  return <div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2"><div><h1 className="text-3xl font-bold">Factuur Maker</h1><p className="text-muted-foreground">Kies uit meerdere echt verschillende factuurindelingen.</p></div><Badge variant="secondary">Geen database-opslag</Badge></div>
    <Card><CardHeader><CardTitle>Template kiezen</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><Select value={template} onValueChange={(v) => setTemplate(v as Template)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(templateNames).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><div className="rounded-lg border p-3 text-sm text-muted-foreground"><strong className="text-foreground">{templateNames[template]}</strong><br />{templateDescriptions[template]}</div></CardContent></Card>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div className="space-y-6"><PartyCard title="Afzender" party={sender} onChange={(f, v) => setParty("sender", f, v)} logo={logo} uploadLogo={uploadLogo} /><PartyCard title="Klant" party={customer} onChange={(f, v) => setParty("customer", f, v)} /><Card><CardHeader><CardTitle>Factuurgegevens</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Factuurnummer" value={invoiceNumber} onChange={setInvoiceNumber} /><Field label="Factuurdatum" type="date" value={invoiceDate} onChange={setInvoiceDate} /><Field label="Vervaldatum" type="date" value={dueDate} onChange={setDueDate} /></div><div className="space-y-3"><div className="flex justify-between items-center"><Label>Factuurregels</Label><Button variant="outline" size="sm" onClick={() => setLines((rows) => [...rows, newLine()])}><Plus className="h-4 w-4 mr-2" />Regel toevoegen</Button></div><div className="hidden md:grid grid-cols-12 gap-2 px-3 text-xs font-semibold uppercase text-muted-foreground"><div className="col-span-5">Omschrijving</div><div className="col-span-2">{template === "service" ? "Uren" : "Aantal"}</div><div className="col-span-2">{template === "service" ? "Tarief" : "Prijs ex. btw"}</div><div className="col-span-2">BTW %</div><div className="col-span-1 text-right">Actie</div></div>{lines.map((line) => <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border p-3"><Input className="md:col-span-5" placeholder={template === "service" ? "Bijv. IT support mei 2026" : "Omschrijving"} value={line.description} onChange={(e) => setLine(line.id, "description", e.target.value)} /><Input className="md:col-span-2" type="number" step="0.01" value={line.quantity} onChange={(e) => setLine(line.id, "quantity", Number(e.target.value))} /><Input className="md:col-span-2" type="number" step="0.01" value={line.price} onChange={(e) => setLine(line.id, "price", Number(e.target.value))} /><Input className="md:col-span-2" type="number" value={line.vat} onChange={(e) => setLine(line.id, "vat", Number(e.target.value))} /><Button variant="ghost" size="icon" onClick={() => setLines((rows) => rows.length === 1 ? rows : rows.filter((row) => row.id !== line.id))}><Trash2 className="h-4 w-4" /></Button></div>)}</div><div className="space-y-2"><Label>Opmerking onderaan factuur</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div></CardContent></Card></div><InvoicePreview template={template} logo={logo} sender={sender} customer={customer} invoiceNumber={invoiceNumber} invoiceDate={invoiceDate} dueDate={dueDate} lines={lines} totals={totals} notes={notes} downloadPdf={downloadPdf} /></div>
  </div>;
}

function InvoicePreview({ template, logo, sender, customer, invoiceNumber, invoiceDate, dueDate, lines, totals, notes, downloadPdf }: { template: Template; logo: string; sender: Party; customer: Party; invoiceNumber: string; invoiceDate: string; dueDate: string; lines: Line[]; totals: { subtotal: number; vat: number; total: number }; notes: string; downloadPdf: () => void }) {
  const isSidebar = template === "sidebar"; const isLetter = template === "letterhead"; const isSplit = template === "split"; const isMinimal = template === "minimal"; const isPremium = template === "premium"; const isClassic = template === "classic"; const isCompact = template === "compact"; const isService = template === "service";
  const headerClass = isPremium ? "bg-slate-950 text-white border-b-4 border-amber-500" : isService ? "bg-sky-800 text-white" : isSplit ? "grid grid-cols-2 p-0" : isClassic || isMinimal || isLetter ? "bg-white text-slate-900 border-b" : "bg-slate-900 text-white";
  return <Card className="sticky top-4 h-fit"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>PDF voorbeeld</CardTitle><Button onClick={downloadPdf}><Download className="h-4 w-4 mr-2" />PDF downloaden</Button></div></CardHeader><CardContent><div className={`rounded-xl border bg-white text-slate-900 shadow-sm overflow-hidden flex ${isSidebar ? "p-0" : "p-6"} ${isClassic ? "font-serif" : ""}`}>
    {isSidebar && <aside className="w-28 shrink-0 bg-slate-950 text-white p-4 text-xs space-y-5"><div className="text-xl font-bold">FACTUUR</div><div>{invoiceNumber}</div><div><b>{sender.company}</b><br />{sender.email}<br />{sender.phone}</div><div>KvK<br />{sender.kvk || "-"}</div></aside>}
    <div className={`flex-1 flex flex-col ${isSidebar ? "p-6 space-y-6" : "space-y-6"}`}>
      {!isSidebar && <div className={`${headerClass} ${isSplit ? "-m-6 mb-0" : "-m-6 mb-0 p-6"}`}>{isSplit ? <><div className="bg-blue-800 text-white p-6"><div className="text-3xl font-bold">Factuur</div><div>{invoiceNumber}</div></div><div className="bg-slate-100 p-6"><b>{customer.company || "Klantnaam"}</b><div>Datum: {new Date(invoiceDate).toLocaleDateString("nl-NL")}</div><div>Vervalt: {new Date(dueDate).toLocaleDateString("nl-NL")}</div></div></> : <div className="flex justify-between gap-4"><div>{logo && <img src={logo} className="h-14 max-w-[150px] object-contain mb-3" />}<div className={`${isMinimal ? "text-4xl font-light" : "text-3xl font-bold"}`}>{isService ? "Werkzaamheden & factuur" : isPremium ? "Invoice" : "Factuur"}</div><div className="text-sm opacity-80">{invoiceNumber} · {templateNames[template]}</div></div><div className="text-right text-sm"><b>{sender.company}</b><div>{sender.email}</div><div>{sender.phone}</div></div></div>}</div>}
      {!isCompact && !isSplit && <div className={`${isLetter || isMinimal || isClassic ? "grid grid-cols-2 border-b pb-4 text-sm" : "grid grid-cols-2 gap-4 text-sm"}`}><div className={isLetter || isMinimal || isClassic ? "" : "rounded-lg bg-slate-50 p-4"}><b>Factuur aan</b><div>{customer.company || "Klantnaam"}</div><div>{customer.contact}</div><div>{customer.address}</div><div>{customer.postalCity}</div></div><div className={isLetter || isMinimal || isClassic ? "text-right" : "rounded-lg bg-slate-50 p-4"}><b>Factuurgegevens</b><div>Datum: {new Date(invoiceDate).toLocaleDateString("nl-NL")}</div><div>Vervaldatum: {new Date(dueDate).toLocaleDateString("nl-NL")}</div></div></div>}
      <div className="overflow-hidden rounded-lg border"><div className={`grid grid-cols-12 text-xs font-semibold px-3 py-2 ${isPremium ? "bg-amber-600 text-white" : isService ? "bg-sky-800 text-white" : isSplit ? "bg-blue-800 text-white" : isClassic || isMinimal || isLetter ? "bg-white text-slate-900 border-b" : "bg-slate-900 text-white"}`}><div className="col-span-6">{isService ? "Werkzaamheden" : "Omschrijving"}</div><div className="col-span-2 text-right">{isService ? "Uren" : "Aantal"}</div><div className="col-span-2 text-right">{isService ? "Tarief" : "Prijs"}</div><div className="col-span-2 text-right">Totaal</div></div>{lines.filter((l) => l.description.trim()).map((line) => { const sub = line.quantity * line.price; const total = sub + sub * line.vat / 100; return <div key={line.id} className={`grid grid-cols-12 px-3 ${isCompact ? "py-1" : "py-2"} text-sm border-t`}><div className="col-span-6">{line.description}</div><div className="col-span-2 text-right">{line.quantity}</div><div className="col-span-2 text-right">{money(line.price)}</div><div className="col-span-2 text-right">{money(total)}</div></div>; })}</div>
      <div className={`ml-auto w-72 space-y-2 text-sm ${isPremium ? "rounded-xl bg-amber-50 p-4" : isMinimal ? "border-t pt-4" : ""}`}><div className="flex justify-between"><span>Subtotaal</span><b>{money(totals.subtotal)}</b></div><div className="flex justify-between"><span>BTW</span><b>{money(totals.vat)}</b></div><Separator /><div className="flex justify-between text-lg"><span>Totaal</span><b>{money(totals.total)}</b></div></div>
      <div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-line mt-auto">{notes}</div>
    </div>
  </div></CardContent></Card>;
}

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
const PartyCard = ({ title, party, onChange, logo, uploadLogo }: { title: string; party: Party; onChange: (field: keyof Party, value: string) => void; logo?: string; uploadLogo?: (file?: File) => void }) => <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Bedrijfsnaam" value={party.company} onChange={(v) => onChange("company", v)} /><Field label="Naam/contact" value={party.contact} onChange={(v) => onChange("contact", v)} /><Field label="Adres" value={party.address} onChange={(v) => onChange("address", v)} /><Field label="Postcode + plaats" value={party.postalCity} onChange={(v) => onChange("postalCity", v)} /><Field label="E-mail" value={party.email} onChange={(v) => onChange("email", v)} /><Field label="Telefoon" value={party.phone} onChange={(v) => onChange("phone", v)} /><Field label="KvK" value={party.kvk} onChange={(v) => onChange("kvk", v)} /><Field label="BTW-nummer" value={party.vatNumber} onChange={(v) => onChange("vatNumber", v)} />{title === "Afzender" && <><div className="md:col-span-2"><Field label="IBAN" value={party.iban} onChange={(v) => onChange("iban", v)} /></div><div className="md:col-span-2 space-y-2"><Label>Logo uploaden</Label><div className="flex items-center gap-3"><Input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => uploadLogo?.(e.target.files?.[0])} /><Upload className="h-5 w-5 text-muted-foreground" /></div>{logo && <img src={logo} className="h-14 max-w-[180px] object-contain rounded border p-2" />}</div></>}</CardContent></Card>;
