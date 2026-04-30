import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { Link } from "react-router-dom";

type Customer = { id: string; name: string; company_name: string | null };
type TimeEntry = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  work_date: string;
  description: string;
  hours: number;
  hourly_rate: number;
  status: string;
  invoice_id: string | null;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  invoices?: { invoice_number: string } | null;
};

const round2 = (v: number) => Math.round(v * 100) / 100;
const fmt = (v: number) => `€ ${round2(v).toFixed(2).replace(".", ",")}`;
const months = [
  "Januari","Februari","Maart","April","Mei","Juni",
  "Juli","Augustus","September","Oktober","November","December"
];
const dayNames = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];

const calcHoursFromTimes = (start: string, end: string, breakMin: number) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm) - (breakMin || 0);
  return mins > 0 ? round2(mins / 60) : 0;
};

const AdminTimeEntries = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [view, setView] = useState<string>("agenda");

  // Filters
  const today = new Date();
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(String(today.getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(today.getFullYear()));
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [form, setForm] = useState({
    customer_id: "",
    work_date: new Date().toISOString().slice(0, 10),
    description: "",
    start_time: "",
    end_time: "",
    break_minutes: "0",
    hours: "",
    hourly_rate: "75",
    status: "concept",
  });

  const loadData = async () => {
    setLoading(true);
    const [e, c] = await Promise.all([
      supabase.from("time_entries").select("*, invoices(invoice_number)").order("work_date", { ascending: true }),
      supabase.from("customers").select("id, name, company_name").order("name"),
    ]);
    if (e.error) toast({ title: "Fout", description: e.error.message, variant: "destructive" });
    else setEntries((e.data as any) || []);
    if (!c.error) setCustomers(c.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Auto-calc hours from times
  useEffect(() => {
    if (form.start_time && form.end_time) {
      const h = calcHoursFromTimes(form.start_time, form.end_time, parseFloat(form.break_minutes) || 0);
      setForm((f) => ({ ...f, hours: String(h) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_time, form.end_time, form.break_minutes]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterCustomer !== "all" && e.customer_id !== filterCustomer) return false;
      const d = new Date(e.work_date);
      if (filterYear !== "all" && d.getFullYear() !== parseInt(filterYear)) return false;
      if (filterMonth !== "all" && d.getMonth() + 1 !== parseInt(filterMonth)) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      return true;
    });
  }, [entries, filterCustomer, filterMonth, filterYear, filterStatus]);

  // Stats current month (always)
  const stats = useMemo(() => {
    const now = new Date();
    const cm = entries.filter((e) => {
      const d = new Date(e.work_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const hoursThisMonth = cm.reduce((s, e) => s + Number(e.hours), 0);
    const revenueThisMonth = cm.reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0);
    const openHours = entries.filter((e) => e.status === "concept").reduce((s, e) => s + Number(e.hours), 0);
    const invoicedHours = entries.filter((e) => e.status === "gefactureerd").reduce((s, e) => s + Number(e.hours), 0);
    return {
      hoursThisMonth: round2(hoursThisMonth),
      revenueThisMonth: round2(revenueThisMonth),
      openHours: round2(openHours),
      invoicedHours: round2(invoicedHours),
    };
  }, [entries]);

  // Totals: selection if any, else filtered
  const totals = useMemo(() => {
    const selectionActive = selected.size > 0;
    const list = selectionActive
      ? entries.filter((e) => selected.has(e.id))
      : filtered;
    const hours = list.reduce((s, e) => s + Number(e.hours), 0);
    const subtotal = list.reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0);
    const vat = subtotal * 0.21;
    return {
      selectionActive,
      count: list.length,
      hours: round2(hours),
      subtotal: round2(subtotal),
      vat: round2(vat),
      total: round2(subtotal + vat),
    };
  }, [filtered, selected, entries]);

  // Build month days for agenda
  const monthDays = useMemo(() => {
    if (filterMonth === "all" || filterYear === "all") return [];
    const year = parseInt(filterYear);
    const month = parseInt(filterMonth) - 1;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days: { date: string; dayName: string; isWeekend: boolean; entries: TimeEntry[] }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const dt = new Date(year, month, d);
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEntries = filtered.filter((e) => e.work_date === iso);
      days.push({
        date: iso,
        dayName: dayNames[dt.getDay()],
        isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
        entries: dayEntries,
      });
    }
    return days;
  }, [filtered, filterMonth, filterYear]);

  const openNew = (date?: string) => {
    setEditing(null);
    setForm({
      customer_id: filterCustomer !== "all" ? filterCustomer : "",
      work_date: date || new Date().toISOString().slice(0, 10),
      description: "",
      start_time: "",
      end_time: "",
      break_minutes: "0",
      hours: "",
      hourly_rate: "75",
      status: "concept",
    });
    setDialogOpen(true);
  };

  const openEdit = (e: TimeEntry) => {
    setEditing(e);
    setForm({
      customer_id: e.customer_id || "",
      work_date: e.work_date,
      description: e.description,
      start_time: e.start_time || "",
      end_time: e.end_time || "",
      break_minutes: String(e.break_minutes || 0),
      hours: String(e.hours),
      hourly_rate: String(e.hourly_rate),
      status: e.status,
    });
    setDialogOpen(true);
  };

  const saveEntry = async () => {
    if (!form.description.trim() || !form.hours || !form.hourly_rate) {
      toast({ title: "Vul alle verplichte velden", variant: "destructive" });
      return;
    }
    const customer = customers.find((c) => c.id === form.customer_id);
    const payload = {
      customer_id: form.customer_id || null,
      customer_name: customer ? (customer.company_name || customer.name) : null,
      work_date: form.work_date,
      description: form.description.trim(),
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      break_minutes: round2(parseFloat(form.break_minutes) || 0),
      hours: round2(parseFloat(form.hours)),
      hourly_rate: round2(parseFloat(form.hourly_rate)),
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from("time_entries").update(payload).eq("id", editing.id)
      : await supabase.from("time_entries").insert(payload);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Urenregel bijgewerkt" : "Urenregel toegevoegd" });
    setDialogOpen(false);
    loadData();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Verwijder deze urenregel?")) return;
    const { error } = await supabase.from("time_entries").delete().eq("id", id);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Verwijderd" });
    loadData();
  };

  const toggleSel = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleDay = (dayEntries: TimeEntry[]) => {
    const eligible = dayEntries.filter((e) => e.status !== "gefactureerd");
    const allSelected = eligible.length > 0 && eligible.every((e) => selected.has(e.id));
    const n = new Set(selected);
    if (allSelected) eligible.forEach((e) => n.delete(e.id));
    else eligible.forEach((e) => n.add(e.id));
    setSelected(n);
  };
  const selectAllVisible = () => {
    const eligible = filtered.filter((e) => e.status !== "gefactureerd");
    setSelected(new Set(eligible.map((e) => e.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const deleteSelection = async () => {
    const sel = entries.filter((e) => selected.has(e.id));
    if (sel.length === 0) return;
    if (sel.some((e) => e.status === "gefactureerd")) {
      toast({ title: "Selectie bevat gefactureerde regels", description: "Verwijder eerst de selectie van gefactureerde uren.", variant: "destructive" });
      return;
    }
    if (!confirm(`Verwijder ${sel.length} urenregel(s)?`)) return;
    const { error } = await supabase.from("time_entries").delete().in("id", sel.map((e) => e.id));
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${sel.length} regel(s) verwijderd` });
    clearSelection();
    loadData();
  };

  const createInvoiceFromSelection = async () => {
    const sel = entries.filter((e) => selected.has(e.id));
    if (sel.length === 0) {
      toast({ title: "Geen uren geselecteerd", variant: "destructive" });
      return;
    }
    if (sel.some((e) => e.status === "gefactureerd" || e.invoice_id)) {
      toast({ title: "Selectie bevat al gefactureerde uren", variant: "destructive" });
      return;
    }
    const customerIds = new Set(sel.map((e) => e.customer_id || "none"));
    if (customerIds.size > 1) {
      toast({ title: "Selecteer alleen uren van één klant", variant: "destructive" });
      return;
    }
    const customerId = sel[0].customer_id;
    if (!customerId) {
      toast({ title: "Geselecteerde uren hebben geen klant", description: "Koppel eerst een klant aan deze uren.", variant: "destructive" });
      return;
    }

    setCreatingInvoice(true);
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      const { data: numData, error: numErr } = await supabase.rpc("generate_invoice_number", { p_year: year });
      if (numErr || !numData) throw new Error(numErr?.message || "Kon factuurnummer niet genereren");

      const { data: settings } = await supabase.from("settings").select("payment_terms").maybeSingle();
      const terms = settings?.payment_terms ?? 30;
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + terms);

      const subtotal = round2(sel.reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0));
      const vat_total = round2(subtotal * 0.21);
      const total = round2(subtotal + vat_total);

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: numData,
          customer_id: customerId,
          invoice_date: today.toISOString().slice(0, 10),
          due_date: dueDate.toISOString().slice(0, 10),
          status: "concept",
          source_type: "generated",
          invoice_year: year,
          invoice_month: month,
          subtotal,
          vat_total,
          total,
        })
        .select()
        .single();
      if (invErr || !inv) throw new Error(invErr?.message || "Kon factuur niet aanmaken");

      const items = sel.map((e) => {
        const sub = round2(Number(e.hours) * Number(e.hourly_rate));
        return {
          invoice_id: inv.id,
          description: `${new Date(e.work_date).toLocaleDateString("nl-NL")} - ${e.description}`,
          quantity: Number(e.hours),
          price: Number(e.hourly_rate),
          vat_percentage: 21,
          subtotal: sub,
        };
      });
      const { error: itErr } = await supabase.from("invoice_items").insert(items);
      if (itErr) throw new Error(itErr.message);

      const { error: upErr } = await supabase
        .from("time_entries")
        .update({ status: "gefactureerd", invoice_id: inv.id })
        .in("id", sel.map((e) => e.id));
      if (upErr) throw new Error(upErr.message);

      await supabase.from("activity_logs").insert({
        type: "invoice_created_from_hours",
        reference_id: inv.id,
        description: `Factuur ${numData} aangemaakt uit ${sel.length} urenregel(s)`,
      });

      toast({ title: "Factuur aangemaakt", description: `Factuurnummer ${numData}` });
      clearSelection();
      loadData();
    } catch (err: any) {
      toast({ title: "Fout bij factuur aanmaken", description: err.message, variant: "destructive" });
    } finally {
      setCreatingInvoice(false);
    }
  };

  const years = Array.from(new Set(entries.map((e) => new Date(e.work_date).getFullYear())))
    .sort((a, b) => b - a);
  if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());

  // Month total (always for filtered month, regardless of selection)
  const monthTotal = useMemo(() => {
    const hours = filtered.reduce((s, e) => s + Number(e.hours), 0);
    const amount = filtered.reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0);
    return { hours: round2(hours), amount: round2(amount) };
  }, [filtered]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold">Urenregistratie</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filterMonth !== "all" && filterYear !== "all"
              ? `${months[parseInt(filterMonth) - 1]} ${filterYear} — ${monthTotal.hours} uur · ${fmt(monthTotal.amount)}`
              : `${monthTotal.hours} uur · ${fmt(monthTotal.amount)}`}
          </p>
        </div>
        <Button onClick={() => openNew()}><Plus className="h-4 w-4 mr-2" />Urenregel toevoegen</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Uren deze maand</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.hoursThisMonth}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Omzet deze maand</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(stats.revenueThisMonth)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open uren</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.openHours}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Gefactureerde uren</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.invoicedHours}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={filterCustomer} onValueChange={setFilterCustomer}>
            <SelectTrigger><SelectValue placeholder="Klant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle klanten</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company_name || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger><SelectValue placeholder="Maand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle maanden</SelectItem>
              {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger><SelectValue placeholder="Jaar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle jaren</SelectItem>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="concept">Concept</SelectItem>
              <SelectItem value="gefactureerd">Gefactureerd</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={selectAllVisible}>Selecteer alle zichtbare</Button>
          {selected.size > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={clearSelection}>Selectie wissen</Button>
              <Badge variant="secondary">{selected.size} geselecteerd</Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={selected.size === 0}
            onClick={deleteSelection}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Verwijder selectie
          </Button>
          <Button
            disabled={selected.size === 0 || creatingInvoice}
            onClick={createInvoiceFromSelection}
          >
            <FileText className="h-4 w-4 mr-2" />
            {creatingInvoice ? "Bezig..." : `Factuur maken (${selected.size})`}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="table">Tabel</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          {filterMonth === "all" || filterYear === "all" ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Selecteer een specifieke maand en jaar om de agendaweergave te tonen.
            </CardContent></Card>
          ) : loading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Laden...</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthDays.map((day) => {
                const d = new Date(day.date);
                const dayHours = day.entries.reduce((s, e) => s + Number(e.hours), 0);
                const dayAmount = day.entries.reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0);
                const eligible = day.entries.filter((e) => e.status !== "gefactureerd");
                const allSel = eligible.length > 0 && eligible.every((e) => selected.has(e.id));
                const isEmpty = day.entries.length === 0;
                return (
                  <Card
                    key={day.date}
                    className={`${day.isWeekend ? "bg-muted/30" : ""} ${isEmpty ? "opacity-70" : ""}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {eligible.length > 0 && (
                            <Checkbox
                              checked={allSel}
                              onCheckedChange={() => toggleDay(day.entries)}
                            />
                          )}
                          <div>
                            <div className="font-semibold">{d.getDate()} {months[d.getMonth()]}</div>
                            <div className="text-xs text-muted-foreground">{day.dayName}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openNew(day.date)} title="Uren toevoegen">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {!isEmpty && (
                        <div className="text-xs text-muted-foreground pt-1">
                          {round2(dayHours)} uur · {fmt(dayAmount)}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      {isEmpty ? (
                        <div className="text-xs text-muted-foreground italic py-2">Geen uren geregistreerd</div>
                      ) : (
                        <div className="space-y-2">
                          {day.entries.map((e) => {
                            const invoiced = e.status === "gefactureerd";
                            const amount = round2(Number(e.hours) * Number(e.hourly_rate));
                            return (
                              <div key={e.id} className="flex items-start gap-2 p-2 rounded-md border bg-card">
                                <Checkbox
                                  checked={selected.has(e.id)}
                                  disabled={invoiced}
                                  onCheckedChange={() => toggleSel(e.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium">{e.customer_name || "Geen klant"}</span>
                                    {invoiced ? (
                                      <Badge variant="default" className="text-[10px] py-0 h-4">Gefactureerd</Badge>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">{e.description}</div>
                                  <div className="text-xs mt-1">
                                    {e.start_time && e.end_time && (
                                      <span className="text-muted-foreground mr-2">
                                        {e.start_time.slice(0,5)}-{e.end_time.slice(0,5)}
                                        {e.break_minutes > 0 && ` (-${e.break_minutes}min)`}
                                      </span>
                                    )}
                                    <span className="font-medium">{Number(e.hours)}u</span>
                                    <span className="text-muted-foreground"> · {fmt(amount)}</span>
                                  </div>
                                  {e.invoice_id && e.invoices?.invoice_number && (
                                    <Link to="/admin/invoices" className="text-xs text-primary hover:underline">
                                      {e.invoices.invoice_number}
                                    </Link>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(e)} disabled={invoiced}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteEntry(e.id)} disabled={invoiced}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Start/Eind/Pauze</TableHead>
                    <TableHead className="text-right">Uren</TableHead>
                    <TableHead className="text-right">Tarief</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Factuur</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Laden...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Geen urenregels gevonden</TableCell></TableRow>
                  ) : (
                    filtered.map((e) => {
                      const invoiced = e.status === "gefactureerd";
                      const amount = round2(Number(e.hours) * Number(e.hourly_rate));
                      return (
                        <TableRow key={e.id}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(e.id)}
                              disabled={invoiced}
                              onCheckedChange={() => toggleSel(e.id)}
                            />
                          </TableCell>
                          <TableCell>{new Date(e.work_date).toLocaleDateString("nl-NL")}</TableCell>
                          <TableCell>{e.customer_name || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {e.start_time && e.end_time
                              ? `${e.start_time.slice(0,5)}-${e.end_time.slice(0,5)}${e.break_minutes > 0 ? ` / ${e.break_minutes}min` : ""}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">{Number(e.hours)}</TableCell>
                          <TableCell className="text-right">{fmt(Number(e.hourly_rate))}</TableCell>
                          <TableCell className="text-right">{fmt(amount)}</TableCell>
                          <TableCell>
                            {invoiced ? <Badge variant="default">Gefactureerd</Badge> : <Badge variant="secondary">Concept</Badge>}
                          </TableCell>
                          <TableCell>
                            {e.invoice_id && e.invoices?.invoice_number ? (
                              <Link to="/admin/invoices" className="text-primary hover:underline">
                                {e.invoices.invoice_number}
                              </Link>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(e)} disabled={invoiced}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteEntry(e.id)} disabled={invoiced}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Totals bar */}
      <Card className="sticky bottom-4 shadow-lg border-primary/40">
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground mb-2">
            {totals.selectionActive
              ? `Totaal van ${totals.count} geselecteerde regel(s)`
              : `Totaal van ${totals.count} zichtbare regel(s)`}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><div className="text-sm text-muted-foreground">Totaal uren</div><div className="text-xl font-bold">{totals.hours}</div></div>
            <div><div className="text-sm text-muted-foreground">Totaal excl. btw</div><div className="text-xl font-bold">{fmt(totals.subtotal)}</div></div>
            <div><div className="text-sm text-muted-foreground">BTW 21%</div><div className="text-xl font-bold">{fmt(totals.vat)}</div></div>
            <div><div className="text-sm text-muted-foreground">Totaal incl. btw</div><div className="text-xl font-bold text-primary">{fmt(totals.total)}</div></div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Urenregel bewerken" : "Urenregel toevoegen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Klant / Werkgever</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Kies klant" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum</Label>
              <Input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
            </div>
            <div>
              <Label>Omschrijving</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Starttijd</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <Label>Eindtijd</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
              <div>
                <Label>Pauze (min)</Label>
                <Input type="number" min="0" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aantal uren</Label>
                <Input type="number" step="0.25" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                {form.start_time && form.end_time && (
                  <p className="text-xs text-muted-foreground mt-1">Auto berekend uit tijden</p>
                )}
              </div>
              <div>
                <Label>Uurtarief (€)</Label>
                <Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concept">Concept</SelectItem>
                  <SelectItem value="gefactureerd">Gefactureerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={saveEntry}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTimeEntries;
