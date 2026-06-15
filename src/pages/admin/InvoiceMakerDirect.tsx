import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Trash2, Upload } from "lucide-react";

type Line = { id: string; description: string; quantity: number; price: number; vat: number };
type Party = { company: string; contact: string; address: string; postalCity: string; email: string; phone: string; kvk: string; vatNumber: string; iban: string };

const makeLine = (): Line => ({ id: crypto.randomUUID(), description: "", quantity: 1, price: 0, vat: 21 });
const eur = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number.isFinite(v) ? v : 0);
const pdfMoney = (v: number) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);

const InvoiceMakerDirect = () => {
  const { toast } = useToast();
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

  const setParty = (type: "sender" | "customer", field: keyof Party, value: string) => {
    const fn = type === "sender" ? setSender : setCustomer;
    fn((p) => ({ ...p, [field]: value }));
  };

  const setLine = (id: string, field: keyof Line, value: string | number) => setLines((all) => all.map((l) => l.id === id ? { ...l, [field]: value } : l));
  const removeLine = (id: string) => setLines((all) => all.length === 1 ? all : all.filter((l) => l.id !== id));

  const uploadLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.includes("png") && !file.type.includes("jpeg") && !file.type.includes("jpg")) {
      toast({ title: "Gebruik PNG of JPG", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const downloadPdf = () => {
    if (!sender.company || !customer.company || !invoiceNumber || lines.every((l) => !l.description.trim())) {
      toast({ title: "Vul eerst afzender, klant, factuurnummer en minimaal één regel in", variant: "destructive" });
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const m = 16;
    let y = 18;
    const page = (need = 20) => { if (y + need > h - m) { doc.addPage(); y = m; } };

    doc.setFillColor(17, 24, 39); doc.rect(0, 0, w, 38, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(25); doc.text("Factuur", m, 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(invoiceNumber, m, 30);
    if (logo) { try { doc.addImage(logo, logo.includes("image/png") ? "PNG" : "JPEG", w - 50, 8, 32, 22); } catch { /* logo overslaan */ } }

    y = 50; doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Afzender", m, y); doc.text("Factuur aan", 112, y); y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    [sender.company, sender.contact, sender.address, sender.postalCity, sender.email, sender.phone].filter(Boolean).forEach((t, i) => doc.text(t, m, y + i * 5));
    [customer.company, customer.contact, customer.address, customer.postalCity, customer.email, customer.phone].filter(Boolean).forEach((t, i) => doc.text(t, 112, y + i * 5));
    y += 42;

    doc.setFillColor(249, 250, 251); doc.roundedRect(m, y, w - m * 2, 24, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.text("Factuurgegevens", m + 4, y + 7);
    doc.setFont("helvetica", "normal"); doc.text(`Factuurdatum: ${new Date(invoiceDate).toLocaleDateString("nl-NL")}`, m + 4, y + 14);
    doc.text(`Vervaldatum: ${new Date(dueDate).toLocaleDateString("nl-NL")}`, 98, y + 14);
    if (customer.vatNumber) doc.text(`BTW klant: ${customer.vatNumber}`, m + 4, y + 20);
    y += 36;

    doc.setFillColor(17, 24, 39); doc.rect(m, y, w - m * 2, 9, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("Omschrijving", m + 2, y + 6); doc.text("Aantal", 108, y + 6, { align: "right" }); doc.text("Prijs", 132, y + 6, { align: "right" }); doc.text("BTW", 153, y + 6, { align: "right" }); doc.text("Totaal", w - m - 2, y + 6, { align: "right" });
    y += 12; doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "normal");

    lines.filter((l) => l.description.trim()).forEach((l) => {
      const subtotal = l.quantity * l.price; const total = subtotal + subtotal * l.vat / 100;
      const desc = doc.splitTextToSize(l.description, 76); const rowH = Math.max(9, desc.length * 5 + 4); page(rowH + 6);
      doc.setDrawColor(229, 231, 235); doc.line(m, y - 3, w - m, y - 3);
      doc.text(desc, m + 2, y + 2); doc.text(String(l.quantity), 108, y + 2, { align: "right" }); doc.text(pdfMoney(l.price), 132, y + 2, { align: "right" }); doc.text(`${l.vat}%`, 153, y + 2, { align: "right" }); doc.text(pdfMoney(total), w - m - 2, y + 2, { align: "right" });
      y += rowH;
    });

    y += 8; page(44); const tx = 118; doc.setFontSize(10);
    doc.text("Subtotaal", tx, y); doc.text(pdfMoney(totals.subtotal), w - m, y, { align: "right" }); y += 7;
    doc.text("BTW", tx, y); doc.text(pdfMoney(totals.vat), w - m, y, { align: "right" }); y += 4;
    doc.line(tx, y, w - m, y); y += 9; doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("Totaal EUR", tx, y); doc.text(pdfMoney(totals.total), w - m, y, { align: "right" });

    y += 16; page(40); doc.setFontSize(10); doc.text("Betaalgegevens", m, y); doc.text("Opmerking", 112, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    [`IBAN: ${sender.iban || "-"}`, `KvK: ${sender.kvk || "-"}`, `BTW: ${sender.vatNumber || "-"}`].forEach((t, i) => doc.text(t, m, y + i * 5));
    doc.text(doc.splitTextToSize(notes || "-", 80), 112, y);

    const filename = `${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-") || "factuur"}.pdf`;
    doc.save(filename);
    toast({ title: "PDF gedownload", description: filename });
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h1 className="text-3xl font-bold">Factuur Maker</h1><p className="text-muted-foreground">Losse factuur maken en direct als PDF downloaden. Staat los van bestaande facturen en uren.</p></div><Badge variant="secondary">Geen database-opslag</Badge></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div className="space-y-6">
      <PartyCard title="Afzender" party={sender} onChange={(f, v) => setParty("sender", f, v)} logo={logo} uploadLogo={uploadLogo} />
      <PartyCard title="Klant" party={customer} onChange={(f, v) => setParty("customer", f, v)} />
      <Card><CardHeader><CardTitle>Factuurgegevens</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Factuurnummer" value={invoiceNumber} onChange={setInvoiceNumber} /><Field label="Factuurdatum" type="date" value={invoiceDate} onChange={setInvoiceDate} /><Field label="Vervaldatum" type="date" value={dueDate} onChange={setDueDate} /></div><div className="space-y-3"><div className="flex items-center justify-between"><Label>Factuurregels</Label><Button variant="outline" size="sm" onClick={() => setLines((l) => [...l, makeLine()])}><Plus className="h-4 w-4 mr-2" />Regel toevoegen</Button></div>{lines.map((line) => <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border p-3"><Input className="md:col-span-5" placeholder="Omschrijving" value={line.description} onChange={(e) => setLine(line.id, "description", e.target.value)} /><Input className="md:col-span-2" type="number" step="0.01" placeholder="Aantal" value={line.quantity} onChange={(e) => setLine(line.id, "quantity", Number(e.target.value))} /><Input className="md:col-span-2" type="number" step="0.01" placeholder="Prijs" value={line.price} onChange={(e) => setLine(line.id, "price", Number(e.target.value))} /><Input className="md:col-span-2" type="number" placeholder="BTW %" value={line.vat} onChange={(e) => setLine(line.id, "vat", Number(e.target.value))} /><Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={lines.length === 1}><Trash2 className="h-4 w-4" /></Button></div>)}</div><div className="space-y-2"><Label>Omschrijving / opmerking</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div></CardContent></Card>
    </div><Card className="sticky top-4 h-fit"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>PDF voorbeeld</CardTitle><Button onClick={downloadPdf}><Download className="h-4 w-4 mr-2" />PDF downloaden</Button></div></CardHeader><CardContent><div className="rounded-xl border bg-white text-slate-900 p-6 shadow-sm space-y-6"><div className="flex justify-between gap-6"><div className="flex gap-4 items-center">{logo && <img src={logo} alt="Logo" className="h-14 max-w-[140px] object-contain" />}<div><div className="text-3xl font-bold">Factuur</div><div className="text-sm text-slate-500">{invoiceNumber}</div></div></div><div className="text-right text-sm"><div className="font-semibold">{sender.company}</div><div>{sender.email}</div><div>{sender.phone}</div></div></div><div className="grid grid-cols-2 gap-4 text-sm"><div className="rounded-lg bg-slate-50 p-4"><div className="font-semibold mb-2">Factuur aan</div><div className="font-medium">{customer.company || "Klantnaam"}</div><div>{customer.contact}</div><div>{customer.address}</div><div>{customer.postalCity}</div></div><div className="rounded-lg bg-slate-50 p-4"><div className="font-semibold mb-2">Factuurgegevens</div><div>Datum: {new Date(invoiceDate).toLocaleDateString("nl-NL")}</div><div>Vervaldatum: {new Date(dueDate).toLocaleDateString("nl-NL")}</div></div></div><div className="overflow-hidden rounded-lg border"><div className="grid grid-cols-12 bg-slate-900 text-white text-xs font-semibold px-3 py-2"><div className="col-span-6">Omschrijving</div><div className="col-span-2 text-right">Aantal</div><div className="col-span-2 text-right">Prijs</div><div className="col-span-2 text-right">Totaal</div></div>{lines.filter((l) => l.description.trim()).map((l) => { const sub = l.quantity * l.price; const total = sub + sub * l.vat / 100; return <div key={l.id} className="grid grid-cols-12 px-3 py-2 text-sm border-t"><div className="col-span-6">{l.description}</div><div className="col-span-2 text-right">{l.quantity}</div><div className="col-span-2 text-right">{eur(l.price)}</div><div className="col-span-2 text-right">{eur(total)}</div></div>; })}</div><div className="ml-auto w-72 space-y-2 text-sm"><div className="flex justify-between"><span>Subtotaal</span><strong>{eur(totals.subtotal)}</strong></div><div className="flex justify-between"><span>BTW</span><strong>{eur(totals.vat)}</strong></div><Separator /><div className="flex justify-between text-lg"><span>Totaal</span><strong>{eur(totals.total)}</strong></div></div><div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-line">{notes}</div></div></CardContent></Card></div>
  </div>;
};

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
const PartyCard = ({ title, party, onChange, logo, uploadLogo }: { title: string; party: Party; onChange: (f: keyof Party, v: string) => void; logo?: string; uploadLogo?: (file?: File) => void }) => <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Bedrijfsnaam" value={party.company} onChange={(v) => onChange("company", v)} /><Field label="Naam/contact" value={party.contact} onChange={(v) => onChange("contact", v)} /><Field label="Adres" value={party.address} onChange={(v) => onChange("address", v)} /><Field label="Postcode + plaats" value={party.postalCity} onChange={(v) => onChange("postalCity", v)} /><Field label="E-mail" value={party.email} onChange={(v) => onChange("email", v)} /><Field label="Telefoon" value={party.phone} onChange={(v) => onChange("phone", v)} /><Field label="KvK" value={party.kvk} onChange={(v) => onChange("kvk", v)} /><Field label="BTW-nummer" value={party.vatNumber} onChange={(v) => onChange("vatNumber", v)} />{title === "Afzender" && <><div className="md:col-span-2"><Field label="IBAN" value={party.iban} onChange={(v) => onChange("iban", v)} /></div><div className="md:col-span-2 space-y-2"><Label>Logo uploaden</Label><div className="flex items-center gap-3"><Input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => uploadLogo?.(e.target.files?.[0])} /><Upload className="h-5 w-5 text-muted-foreground" /></div>{logo && <img src={logo} alt="Logo preview" className="h-14 max-w-[180px] object-contain rounded border p-2" />}</div></>}</CardContent></Card>;

export default InvoiceMakerDirect;
