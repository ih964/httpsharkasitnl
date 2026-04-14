import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Pencil, Upload, Download, Eye } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  source_type: string;
  total: number;
  subtotal: number;
  vat_total: number;
  invoice_year: number;
  invoice_month: number;
  pdf_storage_path: string | null;
  original_filename: string | null;
  notes: string | null;
  has_damage: boolean;
  damage_amount: number;
  damage_description: string | null;
}

interface Customer {
  id: string;
  name: string;
  company_name: string | null;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  vat_percentage: number;
}

const emptyItem: InvoiceItem = { description: "", quantity: 1, price: 0, vat_percentage: 21 };

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDueDate, setFormDueDate] = useState("");
  const [formStatus, setFormStatus] = useState("concept");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [formHasDamage, setFormHasDamage] = useState(false);
  const [formDamageAmount, setFormDamageAmount] = useState(0);
  const [formDamageDescription, setFormDamageDescription] = useState("");

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNumber, setUploadNumber] = useState("");
  const [uploadCustomerId, setUploadCustomerId] = useState("");
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploadStatus, setUploadStatus] = useState("concept");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [invRes, custRes] = await Promise.all([
      supabase.from("invoices").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name, company_name").order("name"),
    ]);
    setInvoices(invRes.data?.map(i => ({ ...i, total: Number(i.total), subtotal: Number(i.subtotal), vat_total: Number(i.vat_total), damage_amount: Number(i.damage_amount) })) ?? []);
    setCustomers(custRes.data ?? []);
    setLoading(false);
  };

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name + (c.company_name ? ` (${c.company_name})` : "")]));

  const calcTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
    const vatTotal = items.reduce((s, i) => s + (i.quantity * i.price * i.vat_percentage / 100), 0);
    return { subtotal: Math.round(subtotal * 100) / 100, vat_total: Math.round(vatTotal * 100) / 100, total: Math.round((subtotal + vatTotal) * 100) / 100 };
  };

  const handleSave = async () => {
    const totals = calcTotals(formItems);
    const date = new Date(formDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const damageAmount = formHasDamage ? Math.round(Math.max(0, formDamageAmount) * 100) / 100 : 0;

    const damageFields = {
      has_damage: formHasDamage,
      damage_amount: damageAmount,
      damage_description: formHasDamage ? (formDamageDescription || null) : null,
    };

    if (editingId) {
      const { error } = await supabase.from("invoices").update({
        customer_id: formCustomerId || null,
        invoice_date: formDate,
        due_date: formDueDate || null,
        status: formStatus,
        invoice_year: year,
        invoice_month: month,
        notes: formNotes || null,
        ...totals,
        ...damageFields,
      }).eq("id", editingId);

      if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }

      await supabase.from("invoice_items").delete().eq("invoice_id", editingId);
      const itemsPayload = formItems.filter(i => i.description).map(i => ({
        invoice_id: editingId,
        description: i.description,
        quantity: i.quantity,
        price: i.price,
        vat_percentage: i.vat_percentage,
        subtotal: Math.round(i.quantity * i.price * 100) / 100,
      }));
      if (itemsPayload.length > 0) await supabase.from("invoice_items").insert(itemsPayload);

      await supabase.from("activity_logs").insert({ type: "invoice_updated", reference_id: editingId, description: `Factuur bijgewerkt` });
      toast({ title: "Factuur bijgewerkt" });
    } else {
      const { data: numData, error: numError } = await supabase.rpc("generate_invoice_number", { p_year: year });
      if (numError) { toast({ title: "Fout", description: numError.message, variant: "destructive" }); return; }

      const { data: inv, error } = await supabase.from("invoices").insert({
        invoice_number: numData,
        customer_id: formCustomerId || null,
        invoice_date: formDate,
        due_date: formDueDate || null,
        status: formStatus,
        source_type: "generated",
        invoice_year: year,
        invoice_month: month,
        notes: formNotes || null,
        ...totals,
        ...damageFields,
      }).select("id").single();

      if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }

      const itemsPayload = formItems.filter(i => i.description).map(i => ({
        invoice_id: inv.id,
        description: i.description,
        quantity: i.quantity,
        price: i.price,
        vat_percentage: i.vat_percentage,
        subtotal: Math.round(i.quantity * i.price * 100) / 100,
      }));
      if (itemsPayload.length > 0) await supabase.from("invoice_items").insert(itemsPayload);

      await supabase.from("activity_logs").insert({ type: "invoice_created", reference_id: inv.id, description: `Factuur ${numData} aangemaakt` });
      toast({ title: `Factuur ${numData} aangemaakt` });
    }

    resetForm();
    setDialogOpen(false);
    fetchData();
  };

  const handleEdit = async (inv: Invoice) => {
    setEditingId(inv.id);
    setFormCustomerId(inv.customer_id ?? "");
    setFormDate(inv.invoice_date);
    setFormDueDate(inv.due_date ?? "");
    setFormStatus(inv.status);
    setFormNotes(inv.notes ?? "");
    setFormHasDamage(inv.has_damage);
    setFormDamageAmount(inv.damage_amount);
    setFormDamageDescription(inv.damage_description ?? "");

    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    if (items && items.length > 0) {
      setFormItems(items.map(i => ({ description: i.description, quantity: Number(i.quantity), price: Number(i.price), vat_percentage: Number(i.vat_percentage) })));
    } else {
      setFormItems([{ ...emptyItem }]);
    }
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Factuur verwijderen?")) return;
    const { error } = await supabase.from("invoices").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    await supabase.from("activity_logs").insert({ type: "invoice_deleted", reference_id: id, description: "Factuur verwijderd (soft delete)" });
    toast({ title: "Factuur verwijderd" });
    fetchData();
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadNumber.trim()) {
      toast({ title: "Vul factuurnummer in en selecteer een PDF", variant: "destructive" });
      return;
    }
    setUploading(true);

    const filePath = `uploaded/${Date.now()}_${uploadFile.name}`;
    const { error: uploadError } = await supabase.storage.from("invoices").upload(filePath, uploadFile);
    if (uploadError) { toast({ title: "Upload fout", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }

    const date = new Date(uploadDate);
    const { data: inv, error } = await supabase.from("invoices").insert({
      invoice_number: uploadNumber,
      customer_id: uploadCustomerId || null,
      invoice_date: uploadDate,
      status: uploadStatus,
      source_type: "uploaded",
      invoice_year: date.getFullYear(),
      invoice_month: date.getMonth() + 1,
      pdf_storage_path: filePath,
      original_filename: uploadFile.name,
      uploaded_at: new Date().toISOString(),
      subtotal: 0, vat_total: 0, total: 0,
    }).select("id").single();

    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); setUploading(false); return; }

    await supabase.from("activity_logs").insert({ type: "invoice_uploaded", reference_id: inv.id, description: `Factuur ${uploadNumber} geüpload` });
    toast({ title: "Factuur geüpload" });
    setUploadDialogOpen(false);
    resetUploadForm();
    fetchData();
    setUploading(false);
  };

  const handleDownload = async (inv: Invoice) => {
    if (!inv.pdf_storage_path) { toast({ title: "Geen PDF beschikbaar", variant: "destructive" }); return; }
    const { data, error } = await supabase.storage.from("invoices").createSignedUrl(inv.pdf_storage_path, 60);
    if (error || !data?.signedUrl) { toast({ title: "Fout bij downloaden", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handlePreview = async (inv: Invoice) => {
    if (!inv.pdf_storage_path) { toast({ title: "Geen PDF beschikbaar", variant: "destructive" }); return; }
    const { data, error } = await supabase.storage.from("invoices").createSignedUrl(inv.pdf_storage_path, 60);
    if (error || !data?.signedUrl) { toast({ title: "Fout bij preview", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormCustomerId("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormDueDate("");
    setFormStatus("concept");
    setFormNotes("");
    setFormItems([{ ...emptyItem }]);
    setFormHasDamage(false);
    setFormDamageAmount(0);
    setFormDamageDescription("");
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadNumber("");
    setUploadCustomerId("");
    setUploadDate(new Date().toISOString().split("T")[0]);
    setUploadStatus("concept");
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...formItems];
    (newItems[index] as any)[field] = value;
    setFormItems(newItems);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") { setUploadFile(file); }
    else { toast({ title: "Alleen PDF bestanden toegestaan", variant: "destructive" }); }
  }, [toast]);

  // Filtering
  const years = [...new Set(invoices.map(i => i.invoice_year))].sort((a, b) => b - a);
  const filtered = invoices.filter(i => {
    if (filterYear !== "all" && i.invoice_year !== parseInt(filterYear)) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterSource !== "all" && i.source_type !== filterSource) return false;
    if (search) {
      const q = search.toLowerCase();
      const customerName = i.customer_id ? (customerMap[i.customer_id] ?? "").toLowerCase() : "";
      if (!i.invoice_number.toLowerCase().includes(q) && !customerName.includes(q)) return false;
    }
    return true;
  });

  const formatCurrency = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

  const statusLabel: Record<string, string> = { concept: "Concept", verzonden: "Verzonden", betaald: "Betaald", vervallen: "Vervallen" };
  const statusColor: Record<string, string> = {
    concept: "bg-muted text-muted-foreground",
    verzonden: "bg-primary/10 text-primary",
    betaald: "bg-green-500/10 text-green-500",
    vervallen: "bg-destructive/10 text-destructive",
  };

  const totals = calcTotals(formItems);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-heading font-bold">Facturen</h1>
        <div className="flex gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={o => { setUploadDialogOpen(o); if (!o) resetUploadForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Factuur uploaden</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("pdf-upload")?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploadFile ? uploadFile.name : "Sleep PDF hierheen of klik om te selecteren"}
                  </p>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }}
                  />
                </div>
                <div className="space-y-2"><Label>Factuurnummer *</Label><Input value={uploadNumber} onChange={e => setUploadNumber(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Klant</Label>
                  <Select value={uploadCustomerId} onValueChange={setUploadCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Datum</Label><Input type="date" value={uploadDate} onChange={e => setUploadDate(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={uploadStatus} onValueChange={setUploadStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concept">Concept</SelectItem>
                      <SelectItem value="verzonden">Verzonden</SelectItem>
                      <SelectItem value="betaald">Betaald</SelectItem>
                      <SelectItem value="vervallen">Vervallen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleUpload} disabled={uploading} className="w-full">{uploading ? "Uploaden..." : "Opslaan"}</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nieuwe factuur</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Factuur bewerken" : "Nieuwe factuur"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Klant</Label>
                    <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                      <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                      <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.company_name ? ` (${c.company_name})` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formStatus} onValueChange={setFormStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concept">Concept</SelectItem>
                        <SelectItem value="verzonden">Verzonden</SelectItem>
                        <SelectItem value="betaald">Betaald</SelectItem>
                        <SelectItem value="vervallen">Vervallen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Factuurdatum</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Vervaldatum</Label><Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} /></div>
                </div>

                <div className="space-y-2">
                  <Label>Regels</Label>
                  <div className="space-y-2">
                    {formItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5"><Input placeholder="Omschrijving" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} /></div>
                        <div className="col-span-2"><Input type="number" placeholder="Aantal" value={item.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} /></div>
                        <div className="col-span-2"><Input type="number" placeholder="Prijs" value={item.price} onChange={e => updateItem(i, "price", parseFloat(e.target.value) || 0)} /></div>
                        <div className="col-span-2"><Input type="number" placeholder="BTW %" value={item.vat_percentage} onChange={e => updateItem(i, "vat_percentage", parseFloat(e.target.value) || 0)} /></div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="icon" onClick={() => setFormItems(formItems.filter((_, idx) => idx !== i))} disabled={formItems.length === 1}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setFormItems([...formItems, { ...emptyItem }])}>
                      <Plus className="h-4 w-4 mr-1" /> Regel toevoegen
                    </Button>
                  </div>
                </div>

                {/* Schade correctie */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-damage"
                      checked={formHasDamage}
                      onCheckedChange={(checked) => setFormHasDamage(checked === true)}
                    />
                    <Label htmlFor="has-damage" className="cursor-pointer font-medium">Schade verrekenen</Label>
                  </div>
                  {formHasDamage && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label>Schadebedrag (€)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formDamageAmount}
                          onChange={e => setFormDamageAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        />
                        {formDamageAmount > totals.total && (
                          <p className="text-xs text-destructive">Schadebedrag is hoger dan het totaalbedrag</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Omschrijving schade</Label>
                        <Input
                          value={formDamageDescription}
                          onChange={e => setFormDamageDescription(e.target.value)}
                          placeholder="Beschrijf de schade..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-right">
                  <p className="text-sm text-muted-foreground">Subtotaal: {formatCurrency(totals.subtotal)}</p>
                  <p className="text-sm text-muted-foreground">BTW: {formatCurrency(totals.vat_total)}</p>
                  <p className="text-sm text-muted-foreground">Totaal: {formatCurrency(totals.total)}</p>
                  {formHasDamage && formDamageAmount > 0 && (
                    <>
                      <p className="text-sm text-destructive font-medium">Schade correctie: - {formatCurrency(Math.round(formDamageAmount * 100) / 100)}</p>
                      <div className="border-t border-border pt-1 mt-1">
                        <p className="text-lg font-bold">Eindtotaal: {formatCurrency(Math.round((totals.total - formDamageAmount) * 100) / 100)}</p>
                      </div>
                    </>
                  )}
                  {(!formHasDamage || formDamageAmount === 0) && (
                    <p className="text-lg font-bold">Eindtotaal: {formatCurrency(totals.total)}</p>
                  )}
                </div>

                <div className="space-y-2"><Label>Notities</Label><Input value={formNotes} onChange={e => setFormNotes(e.target.value)} /></div>

                <Button onClick={handleSave} className="w-full">{editingId ? "Opslaan" : "Factuur aanmaken"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Zoek op nummer of klant..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Jaar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle jaren</SelectItem>
            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="concept">Concept</SelectItem>
            <SelectItem value="verzonden">Verzonden</SelectItem>
            <SelectItem value="betaald">Betaald</SelectItem>
            <SelectItem value="vervallen">Vervallen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Bron" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle bronnen</SelectItem>
            <SelectItem value="generated">Aangemaakt</SelectItem>
            <SelectItem value="uploaded">Geüpload</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6">Geen facturen gevonden.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bron</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.customer_id ? customerMap[inv.customer_id] ?? "—" : "—"}</TableCell>
                    <TableCell>{new Date(inv.invoice_date).toLocaleDateString("nl-NL")}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor[inv.status]}`}>{statusLabel[inv.status]}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.source_type === "uploaded" ? "secondary" : "outline"}>
                        {inv.source_type === "uploaded" ? "Geüpload" : "Aangemaakt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.total)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {inv.pdf_storage_path && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handlePreview(inv)} title="Preview"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(inv)} title="Download"><Download className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvoices;
