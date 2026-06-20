import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Trash2 } from "lucide-react";

type Template = "modern" | "premium" | "classic" | "compact" | "service" | "sidebar" | "letterhead" | "split" | "minimal";
type Party = { company: string; contact: string; address: string; postalCity: string; email: string; phone: string; kvk: string; vatNumber: string; iban: string };
type Line = { id: string; description: string; quantity: number; price: number; vat: number };

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
const eur = (value: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number.isFinite(value) ? value : 0);
const pdfMoney = (value: number) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);

const defaultSender: Party = {
  company: "Harkas IT",
  contact: "Ilias Harkati",
  address: "",
  postalCity: "",
  email: "administratie@harkasit.nl",
  phone: "085 124 9091",
  kvk: "84795085",
  vatNumber: "",
  iban: "",
};
const emptyParty: Party = { company: "", contact: "", address: "", postalCity: "", email: "", phone: "", kvk: "", vatNumber: "", iban: "" };

export default function InvoiceMakerStable() {
  const { toast } = useToast();
  const [template, setTemplate] = useState<Template>("modern");
  const [sender, setSender] = useState<Party>(defaultSender);
  const [customer, setCustomer] = useState<Party>(emptyParty);
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${new Date().getFullYear()}-001`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); });
  const [notes, setNotes] = useState("Graag het totaalbedrag overmaken onder vermelding van het factuurnummer.");
  const [lines, setLines] = useState<Line[]>([newLine()]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const vat = lines.reduce((sum, line) => sum + (line.quantity * line.price * line.vat) / 100, 0);
    return { subtotal, vat, total: subtotal + vat };
  }, [lines]);

  const updateParty = (kind: "sender" | "customer", field: keyof Party, value: string) => {
    if (kind === "sender") setSender((old) => ({ ...old, [field]: value }));
    else setCustomer((old) => ({ ...old, [field]: value }));
  };
  const updateLine = (id: string, field: keyof Line, value: string | number) => setLines((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));

  const downloadPdf = () => {
    const validLines = lines.filter((line) => line.description.trim());
    if (!sender.company.trim() || !customer.company.trim() || validLines.length === 0) {
      toast({ title: "Vul minimaal afzender, klant en één regel in", variant: "destructive" });
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const sidebar = template === "sidebar";
    const left = sidebar ? 68 : 16;
    let y = 18;

    if (sidebar) {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 58, height, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("FACTUUR", 10, 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      [invoiceNumber, sender.company, sender.contact, sender.email, sender.phone, sender.kvk ? `KvK ${sender.kvk}` : ""].filter(Boolean).forEach((text, index) => doc.text(String(text), 10, 38 + index * 7));
      doc.setTextColor(17, 24, 39);
      y = 24;
    } else {
      const header = template === "premium" ? [12, 18, 34] : template === "service" ? [7, 89, 133] : template === "split" ? [30, 64, 175] : [17, 24, 39];
      const light = ["classic", "minimal", "letterhead", "compact"].includes(template);
      if (light) {
        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", template === "minimal" ? "normal" : "bold");
        doc.setFontSize(template === "minimal" ? 28 : 22);
        doc.text(template === "minimal" ? "Invoice" : "FACTUUR", 16, 24);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(invoiceNumber, 16, 31);
        doc.line(16, 36, width - 16, 36);
        y = 50;
      } else {
        doc.setFillColor(header[0], header[1], header[2]);
        doc.rect(0, 0, width, 42, "F");
        if (template === "premium") {
          doc.setFillColor(181, 143, 74);
          doc.rect(0, 40, width, 2, "F");
        }
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text(template === "service" ? "Werkzaamheden & factuur" : "Factuur", 16, 23);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${invoiceNumber} · ${templateNames[template]}`, 16, 31);
        y = 56;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(sender.company || "Afzender", width - 16, 16, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      [sender.contact, sender.email, sender.phone, sender.address, sender.postalCity].filter(Boolean).slice(0, 4).forEach((text, index) => doc.text(String(text), width - 16, 22 + index * 5, { align: "right" }));
      doc.setTextColor(17, 24, 39);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Factuur aan", left, y);
    doc.text("Factuurgegevens", width - 78, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    [customer.company || "Klantnaam", customer.contact, customer.address, customer.postalCity, customer.email].filter(Boolean).forEach((text, index) => doc.text(String(text), left, y + index * 5));
    doc.text(`Datum: ${new Date(invoiceDate).toLocaleDateString("nl-NL")}`, width - 78, y);
    doc.text(`Vervalt: ${new Date(dueDate).toLocaleDateString("nl-NL")}`, width - 78, y + 5);
    y += 34;

    const tableWidth = width - left - 16;
    doc.setFillColor(template === "premium" ? 181 : template === "service" ? 7 : 17, template === "premium" ? 143 : template === "service" ? 89 : 24, template === "premium" ? 74 : template === "service" ? 133 : 39);
    doc.rect(left, y, tableWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(template === "service" ? "Werkzaamheden" : "Omschrijving", left + 2, y + 5.5);
    doc.text(template === "service" ? "Uren" : "Aantal", left + tableWidth - 82, y + 5.5, { align: "right" });
    doc.text(template === "service" ? "Tarief" : "Prijs", left + tableWidth - 56, y + 5.5, { align: "right" });
    doc.text("Totaal", left + tableWidth - 2, y + 5.5, { align: "right" });
    y += 11;
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "normal");

    validLines.forEach((line) => {
      const subtotal = line.quantity * line.price;
      const total = subtotal + subtotal * line.vat / 100;
      const description = doc.splitTextToSize(line.description, tableWidth - 88);
      const rowHeight = Math.max(template === "compact" ? 6 : 9, description.length * 4 + 4);
      doc.line(left, y - 3, left + tableWidth, y - 3);
      doc.text(description, left + 2, y + 2);
      doc.text(String(line.quantity), left + tableWidth - 82, y + 2, { align: "right" });
      doc.text(pdfMoney(line.price), left + tableWidth - 56, y + 2, { align: "right" });
      doc.text(pdfMoney(total), left + tableWidth - 2, y + 2, { align: "right" });
      y += rowHeight;
    });

    y += 8;
    const totalX = width - 92;
    doc.text("Subtotaal", totalX, y);
    doc.text(pdfMoney(totals.subtotal), width - 16, y, { align: "right" });
    y += 7;
    doc.text("BTW", totalX, y);
    doc.text(pdfMoney(totals.vat), width - 16, y, { align: "right" });
    y += 5;
    doc.line(totalX, y, width - 16, y);
    y += 9;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Totaal EUR", totalX, y);
    doc.text(pdfMoney(totals.total), width - 16, y, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(notes, width - left - 16), left, height - 42);
    doc.save(`${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-") || "factuur"}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-2">
        <div>
          <h1 className="text-3xl font-bold">Factuur Maker</h1>
          <p className="text-muted-foreground">Links invullen, rechts live preview.</p>
        </div>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[1180px] grid grid-cols-[430px_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-6 max-h-[calc(100vh-130px)] overflow-y-auto pr-2">
            <Card><CardHeader><CardTitle>Template kiezen</CardTitle></CardHeader><CardContent><Select value={template} onValueChange={(value) => setTemplate(value as Template)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(templateNames).map(([key, name]) => <SelectItem key={key} value={key}>{name}</SelectItem>)}</SelectContent></Select></CardContent></Card>
            <PartyCard title="Afzender" party={sender} onChange={(field, value) => updateParty("sender", field, value)} />
            <PartyCard title="Klant" party={customer} onChange={(field, value) => updateParty("customer", field, value)} />
            <Card><CardHeader><CardTitle>Factuurgegevens</CardTitle></CardHeader><CardContent className="space-y-4"><Field label="Factuurnummer" value={invoiceNumber} onChange={setInvoiceNumber} /><div className="grid grid-cols-2 gap-3"><Field label="Factuurdatum" type="date" value={invoiceDate} onChange={setInvoiceDate} /><Field label="Vervaldatum" type="date" value={dueDate} onChange={setDueDate} /></div><div className="space-y-3"><div className="flex items-center justify-between"><Label>Factuurregels</Label><Button variant="outline" size="sm" onClick={() => setLines((rows) => [...rows, newLine()])}><Plus className="h-4 w-4 mr-2" />Regel</Button></div>{lines.map((line) => <div key={line.id} className="space-y-2 rounded-lg border p-3"><Input placeholder={template === "service" ? "Bijv. IT support mei 2026" : "Omschrijving"} value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)} /><div className="grid grid-cols-4 gap-2"><Input type="number" step="0.01" value={line.quantity} onChange={(e) => updateLine(line.id, "quantity", Number(e.target.value))} /><Input type="number" step="0.01" value={line.price} onChange={(e) => updateLine(line.id, "price", Number(e.target.value))} /><Input type="number" value={line.vat} onChange={(e) => updateLine(line.id, "vat", Number(e.target.value))} /><Button variant="ghost" size="icon" onClick={() => setLines((rows) => rows.length === 1 ? rows : rows.filter((row) => row.id !== line.id))}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div><div className="space-y-2"><Label>Opmerking onderaan factuur</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div></CardContent></Card>
          </div>
          <InvoicePreview template={template} sender={sender} customer={customer} invoiceNumber={invoiceNumber} invoiceDate={invoiceDate} dueDate={dueDate} lines={lines} totals={totals} notes={notes} downloadPdf={downloadPdf} />
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({ template, sender, customer, invoiceNumber, invoiceDate, dueDate, lines, totals, notes, downloadPdf }: { template: Template; sender: Party; customer: Party; invoiceNumber: string; invoiceDate: string; dueDate: string; lines: Line[]; totals: { subtotal: number; vat: number; total: number }; notes: string; downloadPdf: () => void }) {
  const sidebar = template === "sidebar";
  const premium = template === "premium";
  const classic = template === "classic";
  const service = template === "service";
  const split = template === "split";
  const minimal = template === "minimal";
  const letter = template === "letterhead";
  return <Card className="sticky top-4 h-fit"><CardHeader><div className="flex flex-col items-start gap-3"><CardTitle>Live preview</CardTitle><Button onClick={downloadPdf} className="w-fit"><Download className="h-4 w-4 mr-2" />PDF downloaden</Button></div></CardHeader><CardContent><div style={{ width: 794, height: 1123, zoom: 0.56, marginLeft: 0, marginRight: "auto" }} className={`rounded-xl border bg-white text-slate-900 shadow-sm overflow-hidden flex ${sidebar ? "p-0" : "p-6"} ${classic ? "font-serif" : ""}`}>{sidebar && <aside className="w-44 shrink-0 bg-slate-950 text-white p-5 text-xs space-y-6"><div className="text-2xl font-bold">FACTUUR</div><div>{invoiceNumber}</div><div className="break-words"><b>{sender.company}</b><br />{sender.email}<br />{sender.phone}</div><div>KvK<br />{sender.kvk || "-"}</div></aside>}<div className={`flex-1 flex flex-col ${sidebar ? "p-8 space-y-6" : "space-y-6"}`}>{!sidebar && <div className={`${premium ? "bg-slate-950 text-white border-b-4 border-amber-500" : service ? "bg-sky-800 text-white" : split ? "grid grid-cols-2 p-0" : classic || minimal || letter ? "bg-white text-slate-900 border-b" : "bg-slate-900 text-white"} ${split ? "-m-6 mb-0" : "-m-6 mb-0 p-6"}`}>{split ? <><div className="bg-blue-800 text-white p-6"><div className="text-3xl font-bold">Factuur</div><div>{invoiceNumber}</div></div><div className="bg-slate-100 p-6"><b>{customer.company || "Klantnaam"}</b><div>Datum: {new Date(invoiceDate).toLocaleDateString("nl-NL")}</div><div>Vervalt: {new Date(dueDate).toLocaleDateString("nl-NL")}</div></div></> : <div className="flex justify-between gap-4"><div><div className={`${minimal ? "text-4xl font-light" : "text-3xl font-bold"}`}>{service ? "Werkzaamheden & factuur" : premium ? "Invoice" : "Factuur"}</div><div className="text-sm opacity-80">{invoiceNumber} · {templateNames[template]}</div></div><div className="text-right text-sm"><b>{sender.company}</b><div>{sender.email}</div><div>{sender.phone}</div></div></div>}</div>}<div className={`${letter || minimal || classic ? "grid grid-cols-2 border-b pb-4 text-sm" : "grid grid-cols-2 gap-4 text-sm"}`}><div className={letter || minimal || classic ? "" : "rounded-lg bg-slate-50 p-4"}><b>Factuur aan</b><div>{customer.company || "Klantnaam"}</div><div>{customer.contact}</div><div>{customer.address}</div><div>{customer.postalCity}</div></div><div className={letter || minimal || classic ? "text-right" : "rounded-lg bg-slate-50 p-4"}><b>Factuurgegevens</b><div>Datum: {new Date(invoiceDate).toLocaleDateString("nl-NL")}</div><div>Vervaldatum: {new Date(dueDate).toLocaleDateString("nl-NL")}</div></div></div><div className="overflow-hidden rounded-lg border"><div className={`grid grid-cols-12 text-xs font-semibold px-3 py-2 ${premium ? "bg-amber-600 text-white" : service ? "bg-sky-800 text-white" : split ? "bg-blue-800 text-white" : classic || minimal || letter ? "bg-white text-slate-900 border-b" : "bg-slate-900 text-white"}`}><div className="col-span-6">{service ? "Werkzaamheden" : "Omschrijving"}</div><div className="col-span-2 text-right">{service ? "Uren" : "Aantal"}</div><div className="col-span-2 text-right">{service ? "Tarief" : "Prijs"}</div><div className="col-span-2 text-right">Totaal</div></div>{lines.filter((line) => line.description.trim()).map((line) => { const subtotal = line.quantity * line.price; const total = subtotal + subtotal * line.vat / 100; return <div key={line.id} className="grid grid-cols-12 px-3 py-2 text-sm border-t"><div className="col-span-6">{line.description}</div><div className="col-span-2 text-right">{line.quantity}</div><div className="col-span-2 text-right">{eur(line.price)}</div><div className="col-span-2 text-right">{eur(total)}</div></div>; })}</div><div className={`ml-auto w-72 space-y-2 text-sm ${premium ? "rounded-xl bg-amber-50 p-4" : minimal ? "border-t pt-4" : ""}`}><div className="flex justify-between"><span>Subtotaal</span><b>{eur(totals.subtotal)}</b></div><div className="flex justify-between"><span>BTW</span><b>{eur(totals.vat)}</b></div><Separator /><div className="flex justify-between text-lg"><span>Totaal</span><b>{eur(totals.total)}</b></div></div><div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-line mt-auto">{notes}</div></div></div></CardContent></Card>;
}

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
const PartyCard = ({ title, party, onChange }: { title: string; party: Party; onChange: (field: keyof Party, value: string) => void }) => <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Bedrijfsnaam" value={party.company} onChange={(v) => onChange("company", v)} /><Field label="Naam/contact" value={party.contact} onChange={(v) => onChange("contact", v)} /><Field label="Adres" value={party.address} onChange={(v) => onChange("address", v)} /><Field label="Postcode + plaats" value={party.postalCity} onChange={(v) => onChange("postalCity", v)} /><Field label="E-mail" value={party.email} onChange={(v) => onChange("email", v)} /><Field label="Telefoon" value={party.phone} onChange={(v) => onChange("phone", v)} /><div className="grid grid-cols-2 gap-3"><Field label="KvK" value={party.kvk} onChange={(v) => onChange("kvk", v)} /><Field label="BTW" value={party.vatNumber} onChange={(v) => onChange("vatNumber", v)} /></div><Field label="IBAN" value={party.iban} onChange={(v) => onChange("iban", v)} /></CardContent></Card>;
