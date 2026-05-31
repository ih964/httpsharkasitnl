import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, RotateCcw, Trash2 } from "lucide-react";
import AdminTimeEntries from "./AdminTimeEntries";

type Customer = { id: string; name: string; company_name: string | null };
type TimeEntry = { id: string; customer_id: string | null; customer_name: string | null; work_date: string; description: string; hours: number; hourly_rate: number; status: string | null; invoice_id: string | null; invoices?: { invoice_number: string } | null };

const round2 = (value: number) => Math.round(value * 100) / 100;
const fmt = (value: number) => `€ ${round2(value).toFixed(2).replace(".", ",")}`;
const formatNlDate = (isoDate: string) => new Date(isoDate).toLocaleDateString("nl-NL");
const isoToday = () => new Date().toISOString().slice(0, 10);
const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return { from: `${year}-${String(month).padStart(2, "0")}-01`, to: new Date(year, month, 0).toISOString().slice(0, 10) };
};

const AdminTimeEntriesWithPeriod = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [fromDate, setFromDate] = useState(getCurrentMonthRange().from);
  const [toDate, setToDate] = useState(getCurrentMonthRange().to);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [customersRes, entriesRes] = await Promise.all([
      supabase.from("customers").select("id, name, company_name").order("name"),
      supabase.from("time_entries").select("id, customer_id, customer_name, work_date, description, hours, hourly_rate, status, invoice_id, invoices(invoice_number)").order("work_date", { ascending: true }),
    ]);
    if (customersRes.error) toast({ title: "Klanten laden mislukt", description: customersRes.error.message, variant: "destructive" });
    else setCustomers((customersRes.data ?? []) as Customer[]);
    if (entriesRes.error) toast({ title: "Uren laden mislukt", description: entriesRes.error.message, variant: "destructive" });
    else setEntries((entriesRes.data ?? []) as TimeEntry[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const periodEntries = useMemo(() => {
    if (!customerId || !fromDate || !toDate) return [];
    return entries.filter((entry) => entry.customer_id === customerId && entry.work_date >= fromDate && entry.work_date <= toDate);
  }, [entries, customerId, fromDate, toDate]);

  const invoiceableEntries = useMemo(() => {
    return periodEntries.filter((entry) => entry.status !== "gefactureerd" && !entry.invoice_id);
  }, [periodEntries]);

  const invoicedEntries = useMemo(() => {
    return periodEntries.filter((entry) => entry.status === "gefactureerd" || !!entry.invoice_id);
  }, [periodEntries]);

  const totalHours = useMemo(() => round2(periodEntries.reduce((sum, entry) => sum + Number(entry.hours), 0)), [periodEntries]);
  const invoicedHours = useMemo(() => round2(invoicedEntries.reduce((sum, entry) => sum + Number(entry.hours), 0)), [invoicedEntries]);

  const invoiceTotals = useMemo(() => {
    const hours = invoiceableEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const subtotal = invoiceableEntries.reduce((sum, entry) => sum + Number(entry.hours) * Number(entry.hourly_rate), 0);
    const vat = subtotal * 0.21;
    return { count: invoiceableEntries.length, hours: round2(hours), subtotal: round2(subtotal), vat: round2(vat), total: round2(subtotal + vat) };
  }, [invoiceableEntries]);

  const createInvoice = async () => {
    if (!customerId) return toast({ title: "Selecteer eerst een klant", variant: "destructive" });
    if (!fromDate || !toDate) return toast({ title: "Selecteer een vanaf- en tot-datum", variant: "destructive" });
    if (fromDate > toDate) return toast({ title: "Vanaf datum mag niet na tot datum liggen", variant: "destructive" });
    if (invoiceableEntries.length === 0) return toast({ title: "Geen factureerbare uren gevonden voor deze klant en periode", variant: "destructive" });

    setCreating(true);
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const { data: invoiceNumber, error: invoiceNumberError } = await supabase.rpc("generate_invoice_number", { p_year: year });
      if (invoiceNumberError || !invoiceNumber) throw new Error(invoiceNumberError?.message || "Kon factuurnummer niet genereren");
      const { data: settings } = await supabase.from("settings").select("payment_terms").maybeSingle();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + (settings?.payment_terms ?? 30));
      const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        customer_id: customerId,
        invoice_date: isoToday(),
        due_date: dueDate.toISOString().slice(0, 10),
        status: "concept",
        source_type: "generated",
        invoice_year: year,
        invoice_month: month,
        subtotal: invoiceTotals.subtotal,
        vat_total: invoiceTotals.vat,
        total: invoiceTotals.total,
      }).select("id").single();
      if (invoiceError || !invoice) throw new Error(invoiceError?.message || "Kon factuur niet aanmaken");
      const invoiceItems = invoiceableEntries.map((entry) => ({ invoice_id: invoice.id, description: `${formatNlDate(entry.work_date)} - ${entry.description}`, quantity: Number(entry.hours), price: Number(entry.hourly_rate), vat_percentage: 21, subtotal: round2(Number(entry.hours) * Number(entry.hourly_rate)) }));
      const { error: itemError } = await supabase.from("invoice_items").insert(invoiceItems);
      if (itemError) throw new Error(itemError.message);
      const { error: updateError } = await supabase.from("time_entries").update({ status: "gefactureerd", invoice_id: invoice.id }).in("id", invoiceableEntries.map((entry) => entry.id));
      if (updateError) throw new Error(updateError.message);
      await supabase.from("activity_logs").insert({ type: "invoice_created_from_hours_period", reference_id: invoice.id, description: `Factuur ${invoiceNumber} aangemaakt voor ${invoiceableEntries.length} urenregel(s) via periode` });
      const customer = customers.find((item) => item.id === customerId);
      toast({ title: "Factuur aangemaakt", description: `Factuur ${invoiceNumber} aangemaakt voor ${customer?.company_name || customer?.name || "klant"}` });
      setPeriodOpen(false);
      await loadData();
    } catch (error: any) {
      toast({ title: "Fout bij factuur aanmaken", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const undoInvoicing = async (entry: TimeEntry) => {
    if (!confirm(`Facturatie ongedaan maken voor ${formatNlDate(entry.work_date)} - ${entry.description}?\n\nLet op: de bestaande factuur zelf blijft bestaan.`)) return;
    setBusyId(entry.id);
    try {
      const { error } = await supabase.from("time_entries").update({ status: "concept", invoice_id: null }).eq("id", entry.id);
      if (error) throw new Error(error.message);
      await supabase.from("activity_logs").insert({ type: "time_entry_invoice_undone", reference_id: entry.id, description: `Facturatie ongedaan gemaakt voor urenregel ${entry.id}` });
      toast({ title: "Facturatie ongedaan gemaakt" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Ongedaan maken mislukt", description: error.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const deleteInvoicedEntry = async (entry: TimeEntry) => {
    if (!confirm(`Gefactureerde urenregel verwijderen?\n\n${formatNlDate(entry.work_date)} - ${entry.description}\n\nLet op: de bestaande factuur blijft bestaan. Controleer de factuur daarna handmatig.`)) return;
    setBusyId(entry.id);
    try {
      await supabase.from("time_entries").update({ status: "concept", invoice_id: null }).eq("id", entry.id);
      const { error } = await supabase.from("time_entries").delete().eq("id", entry.id);
      if (error) throw new Error(error.message);
      await supabase.from("activity_logs").insert({ type: "invoiced_time_entry_deleted", reference_id: entry.id, description: `Gefactureerde urenregel ${entry.id} verwijderd` });
      toast({ title: "Urenregel verwijderd" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const openPeriod = () => { loadData(); setPeriodOpen(true); };
  const openManage = () => { loadData(); setManageOpen(true); };

  const FilterFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div><Label>Klant</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder="Kies klant" /></SelectTrigger><SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.company_name || customer.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Vanaf datum</Label><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div>
      <div><Label>Tot datum</Label><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>
    </div>
  );

  return (
    <>
      <div className="px-6 pt-6"><Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-6"><div><h2 className="font-semibold">Uren acties</h2><p className="text-sm text-muted-foreground">Maak facturen per periode of beheer gefactureerde uren veilig.</p></div><div className="flex flex-col sm:flex-row gap-2"><Button onClick={openPeriod}><CalendarRange className="h-4 w-4 mr-2" />Factuur maken per periode</Button><Button variant="outline" onClick={openManage}><RotateCcw className="h-4 w-4 mr-2" />Gefactureerde uren beheren</Button></div></CardContent></Card></div>
      <AdminTimeEntries />
      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Factuur maken per periode</DialogTitle></DialogHeader><div className="space-y-4"><FilterFields /><Card><CardHeader className="pb-2"><CardTitle className="text-base">Preview uren in periode</CardTitle></CardHeader><CardContent>{loading ? <div className="text-sm text-muted-foreground">Laden...</div> : !customerId || !fromDate || !toDate ? <div className="text-sm text-muted-foreground">Kies een klant en periode om de preview te tonen.</div> : invoiceableEntries.length === 0 ? <div className="text-sm text-muted-foreground">Geen factureerbare uren gevonden voor deze klant en periode.</div> : <div className="space-y-3"><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><div><div className="text-xs text-muted-foreground">Totaal uren</div><div className="font-bold">{totalHours}</div></div><div><div className="text-xs text-muted-foreground">Al gefactureerd</div><div className="font-bold">{invoicedHours}</div></div><div><div className="text-xs text-muted-foreground">Te factureren</div><div className="font-bold text-primary">{invoiceTotals.hours}</div></div><div><div className="text-xs text-muted-foreground">Regels</div><div className="font-bold">{invoiceTotals.count}</div></div><div><div className="text-xs text-muted-foreground">Incl. btw</div><div className="font-bold text-primary">{fmt(invoiceTotals.total)}</div></div></div><div className="max-h-48 overflow-y-auto border rounded-md divide-y">{invoiceableEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 p-2 text-sm"><div className="min-w-0"><div className="font-medium">{formatNlDate(entry.work_date)} - {entry.description}</div><div className="text-xs text-muted-foreground">{Number(entry.hours)} uur × {fmt(Number(entry.hourly_rate))} · status: {entry.status || "leeg"}</div></div><div className="font-medium whitespace-nowrap">{fmt(Number(entry.hours) * Number(entry.hourly_rate))}</div></div>)}</div></div>}</CardContent></Card></div><DialogFooter><Button variant="outline" onClick={() => setPeriodOpen(false)}>Annuleren</Button><Button onClick={createInvoice} disabled={creating || invoiceableEntries.length === 0}>{creating ? "Bezig..." : "Factuur aanmaken"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={manageOpen} onOpenChange={setManageOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Gefactureerde uren beheren</DialogTitle></DialogHeader><div className="space-y-4"><FilterFields /><Card><CardHeader className="pb-2"><CardTitle className="text-base">Gefactureerde uren in periode</CardTitle></CardHeader><CardContent>{loading ? <div className="text-sm text-muted-foreground">Laden...</div> : !customerId || !fromDate || !toDate ? <div className="text-sm text-muted-foreground">Kies een klant en periode.</div> : invoicedEntries.length === 0 ? <div className="text-sm text-muted-foreground">Geen gefactureerde uren gevonden.</div> : <div className="max-h-96 overflow-y-auto border rounded-md divide-y">{invoicedEntries.map((entry) => <div key={entry.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 text-sm"><div className="min-w-0"><div className="font-medium">{formatNlDate(entry.work_date)} - {entry.description}</div><div className="text-xs text-muted-foreground">{Number(entry.hours)} uur × {fmt(Number(entry.hourly_rate))} · {fmt(Number(entry.hours) * Number(entry.hourly_rate))}</div><div className="flex items-center gap-2 mt-1"><Badge>Gefactureerd</Badge>{entry.invoices?.invoice_number && <span className="text-xs text-primary">{entry.invoices.invoice_number}</span>}</div></div><div className="flex flex-col sm:flex-row gap-2"><Button size="sm" variant="outline" disabled={busyId === entry.id} onClick={() => undoInvoicing(entry)}><RotateCcw className="h-4 w-4 mr-2" />Ongedaan</Button><Button size="sm" variant="destructive" disabled={busyId === entry.id} onClick={() => deleteInvoicedEntry(entry)}><Trash2 className="h-4 w-4 mr-2" />Verwijderen</Button></div></div>)}</div>}<p className="text-xs text-muted-foreground mt-3">Let op: verwijderen haalt alleen de urenregel weg. De bestaande factuur blijft staan en moet je daarna controleren.</p></CardContent></Card></div><DialogFooter><Button variant="outline" onClick={() => setManageOpen(false)}>Sluiten</Button></DialogFooter></DialogContent></Dialog>
    </>
  );
};

export default AdminTimeEntriesWithPeriod;
