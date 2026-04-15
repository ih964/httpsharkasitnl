import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Pencil, Upload, Download, Eye, Loader2, Mail, FileDown } from "lucide-react";

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
  emailed_at: string | null;
  emailed_to: string | null;
  emailed_cc: string | null;
}

interface Customer {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  vat_number: string | null;
  kvk_number: string | null;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  vat_percentage: number;
}

const emptyItem: InvoiceItem = { description: "", quantity: 1, price: 0, vat_percentage: 21 };

const VatSelect = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const isCustom = value !== 21;
  const [mode, setMode] = useState<"21" | "custom">(isCustom ? "custom" : "21");

  const handleModeChange = (v: string) => {
    if (v === "21") {
      setMode("21");
      onChange(21);
    } else {
      setMode("custom");
    }
  };

  return (
    <div className="flex gap-1">
      <Select value={mode} onValueChange={handleModeChange}>
        <SelectTrigger className="h-10 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="21">21%</SelectItem>
          <SelectItem value="custom">Anders...</SelectItem>
        </SelectContent>
      </Select>
      {mode === "custom" && (
        <Input
          type="number"
          min="0"
          max="100"
          className="w-16 text-center text-xs"
          value={value}
          onChange={e => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
          placeholder="%"
        />
      )}
    </div>
  );
};

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
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("administratie@harkasit.nl");
  const [emailFromName, setEmailFromName] = useState("Harkas IT");
  const [emailFromEmail, setEmailFromEmail] = useState("administratie@harkasit.nl");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [exportYear, setExportYear] = useState<string>("all");
  const [exportMonth, setExportMonth] = useState<string>("all");
  const [exportStatus, setExportStatus] = useState<string>("all");
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
      supabase.from("customers").select("id, name, company_name, email, address, postal_code, city, vat_number, kvk_number").order("name"),
    ]);
    setInvoices(invRes.data?.map(i => ({ ...i, total: Number(i.total), subtotal: Number(i.subtotal), vat_total: Number(i.vat_total), damage_amount: Number(i.damage_amount) })) ?? []);
    setCustomers(custRes.data ?? []);
    setLoading(false);
  };

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name + (c.company_name ? ` (${c.company_name})` : "")]));

  const calcLineSubtotal = (item: InvoiceItem) => Math.round(item.quantity * item.price * 100) / 100;
  const calcLineVat = (item: InvoiceItem) => {
    const sub = calcLineSubtotal(item);
    return Math.round((sub * item.vat_percentage / 100) * 100) / 100;
  };
  const calcLineTotal = (item: InvoiceItem) => {
    return Math.round((calcLineSubtotal(item) + calcLineVat(item)) * 100) / 100;
  };

  const calcTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((s, i) => s + calcLineSubtotal(i), 0);
    const vatTotal = items.reduce((s, i) => s + calcLineVat(i), 0);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vat_total: Math.round(vatTotal * 100) / 100,
      total: Math.round((subtotal + vatTotal) * 100) / 100,
    };
  };

  const generatePdf = async (invoiceId: string) => {
    setGeneratingPdf(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id: invoiceId },
      });
      if (error) {
        console.error("PDF generation error:", error);
        throw error;
      }
      if (data?.error) {
        console.error("PDF generation server error:", data.error);
        throw new Error(data.error);
      }
      if (data?.pdf_path) {
        await supabase.from("invoices").update({ pdf_storage_path: data.pdf_path }).eq("id", invoiceId);
        await fetchData();
        return data.pdf_path;
      }
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast({ title: "PDF generatie mislukt", description: err.message || "Onbekende fout", variant: "destructive" });
    } finally {
      setGeneratingPdf(null);
    }
    return null;
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

    let invoiceId = editingId;

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
        subtotal: calcLineSubtotal(i),
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
      invoiceId = inv.id;

      const itemsPayload = formItems.filter(i => i.description).map(i => ({
        invoice_id: inv.id,
        description: i.description,
        quantity: i.quantity,
        price: i.price,
        vat_percentage: i.vat_percentage,
        subtotal: calcLineSubtotal(i),
      }));
      if (itemsPayload.length > 0) await supabase.from("invoice_items").insert(itemsPayload);

      await supabase.from("activity_logs").insert({ type: "invoice_created", reference_id: inv.id, description: `Factuur ${numData} aangemaakt` });
      toast({ title: `Factuur ${numData} aangemaakt` });
    }

    // Auto-generate PDF
    if (invoiceId) {
      await generatePdf(invoiceId);
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

  const openPdf = async (inv: Invoice, download = false) => {
    let path = inv.pdf_storage_path;
    if (!path) {
      // Auto-generate
      path = await generatePdf(inv.id);
      if (!path) return;
    }
    const { data, error } = await supabase.storage.from("invoices").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast({ title: "Fout bij openen PDF", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const openEmailDialog = (inv: Invoice) => {
    setEmailInvoice(inv);
    const cust = customers.find(c => c.id === inv.customer_id);
    setEmailTo(cust?.email || "");
    setEmailCc("administratie@harkasit.nl");
    setEmailFromName("Harkas IT");
    setEmailFromEmail("administratie@harkasit.nl");
    setEmailDialogOpen(true);
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateEmailForm = (): string | null => {
    if (!emailTo.trim()) return "Ontvanger e-mailadres is verplicht";
    if (!isValidEmail(emailTo.trim())) return "Ontvanger e-mailadres is ongeldig";
    if (!emailFromEmail.trim()) return "Afzender e-mailadres is verplicht";
    if (!isValidEmail(emailFromEmail.trim())) return "Afzender e-mailadres is ongeldig";
    if (emailCc.trim()) {
      const ccParts = emailCc.split(",").map(s => s.trim()).filter(s => s);
      for (const part of ccParts) {
        if (!isValidEmail(part)) return `Ongeldig CC e-mailadres: ${part}`;
      }
    }
    return null;
  };

  const handleSendEmail = async () => {
    if (!emailInvoice) return;
    const validationError = validateEmailForm();
    if (validationError) {
      toast({ title: "Validatiefout", description: validationError, variant: "destructive" });
      return;
    }
    setSendingEmail(true);
    try {
      if (!emailInvoice.pdf_storage_path) {
        await generatePdf(emailInvoice.id);
      }
      const { error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoice_id: emailInvoice.id,
          recipient_email: emailTo.trim(),
          cc_email: emailCc.trim() || undefined,
          from_name: emailFromName.trim() || undefined,
          from_email: emailFromEmail.trim() || undefined,
        },
      });
      if (error) throw error;
      toast({ title: "Factuur verzonden", description: `E-mail met PDF bijlage verstuurd naar ${emailTo}` });
      setEmailDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Fout bij verzenden", description: err.message, variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const exportCsv = () => {
    const exportFiltered = invoices.filter(i => {
      if (exportYear !== "all" && i.invoice_year !== parseInt(exportYear)) return false;
      if (exportMonth !== "all" && i.invoice_month !== parseInt(exportMonth)) return false;
      if (exportStatus !== "all" && i.status !== exportStatus) return false;
      return true;
    });

    const headers = ["invoice_number","invoice_date","due_date","customer_name","company_name","email","vat_number","kvk_number","status","source_type","subtotal","vat_total","total","final_total","damage_amount","emailed_at","notes"];
    const rows = exportFiltered.map(inv => {
      const cust = customers.find(c => c.id === inv.customer_id);
      const finalTotal = inv.has_damage && inv.damage_amount > 0
        ? Math.round((inv.total - inv.damage_amount) * 100) / 100
        : inv.total;
      return [
        inv.invoice_number,
        inv.invoice_date,
        inv.due_date || "",
        cust?.name || "",
        cust?.company_name || "",
        cust?.email || "",
        cust?.vat_number || "",
        cust?.kvk_number || "",
        inv.status,
        inv.source_type,
        inv.subtotal.toFixed(2),
        inv.vat_total.toFixed(2),
        inv.total.toFixed(2),
        finalTotal.toFixed(2),
        inv.damage_amount.toFixed(2),
        inv.emailed_at || "",
        inv.notes || "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ym = exportYear !== "all" ? exportYear : new Date().getFullYear();
    const mm = exportMonth !== "all" ? exportMonth.padStart(2, "0") : "alle";
    a.href = url;
    a.download = `invoices-${ym}-${mm}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV geëxporteerd" });
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
  const finalTotal = formHasDamage && formDamageAmount > 0
    ? Math.round((totals.total - formDamageAmount) * 100) / 100
    : totals.total;

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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

                {/* Invoice lines */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Factuurregels</Label>

                  {/* Desktop header */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b border-border pb-2 px-1">
                    <div className="col-span-4">Omschrijving</div>
                    <div className="col-span-1 text-center">Aantal</div>
                    <div className="col-span-2 text-right">Prijs p/st</div>
                    <div className="col-span-2 text-center">BTW</div>
                    <div className="col-span-2 text-right">Regeltotaal</div>
                    <div className="col-span-1 text-center">Actie</div>
                  </div>

                  <div className="space-y-2">
                    {formItems.map((item, i) => {
                      const lineSub = calcLineSubtotal(item);
                      const lineV = calcLineVat(item);
                      const lineT = calcLineTotal(item);

                      return (
                        <div key={i}>
                          {/* Desktop row */}
                          <div className="hidden md:grid grid-cols-12 gap-2 items-center py-1">
                            <div className="col-span-4">
                              <Input placeholder="Bijv. Website development" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} />
                            </div>
                            <div className="col-span-1">
                              <Input type="number" placeholder="1" className="text-center" value={item.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-2">
                              <Input type="number" placeholder="100.00" className="text-right" step="0.01" value={item.price} onChange={e => updateItem(i, "price", parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-2">
                              <VatSelect value={item.vat_percentage} onChange={v => updateItem(i, "vat_percentage", v)} />
                            </div>
                            <div className="col-span-2 text-right pr-1">
                              <p className="text-sm font-medium">{formatCurrency(lineSub)}</p>
                              <p className="text-[10px] text-muted-foreground">+BTW {formatCurrency(lineV)} = {formatCurrency(lineT)}</p>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <Button variant="ghost" size="icon" onClick={() => setFormItems(formItems.filter((_, idx) => idx !== i))} disabled={formItems.length === 1}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Mobile card */}
                          <div className="md:hidden border rounded-lg p-3 space-y-3 bg-muted/30">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-muted-foreground">Regel {i + 1}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormItems(formItems.filter((_, idx) => idx !== i))} disabled={formItems.length === 1}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Omschrijving</Label>
                              <Input placeholder="Bijv. Website development" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Aantal</Label>
                                <Input type="number" placeholder="1" value={item.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Prijs p/st</Label>
                                <Input type="number" placeholder="100.00" step="0.01" value={item.price} onChange={e => updateItem(i, "price", parseFloat(e.target.value) || 0)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">BTW</Label>
                                <VatSelect value={item.vat_percentage} onChange={v => updateItem(i, "vat_percentage", v)} />
                              </div>
                            </div>
                            <div className="text-right border-t pt-2 border-border">
                              <p className="text-sm font-medium">Subtotaal: {formatCurrency(lineSub)}</p>
                              <p className="text-xs text-muted-foreground">+BTW {formatCurrency(lineV)} = {formatCurrency(lineT)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

                {/* Totals */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-1.5 text-right">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotaal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>BTW</span>
                    <span>{formatCurrency(totals.vat_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Totaal</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                  {formHasDamage && formDamageAmount > 0 && (
                    <div className="flex justify-between text-sm text-destructive font-medium border-t border-border pt-1.5">
                      <span>Schade correctie</span>
                      <span>- {formatCurrency(Math.round(formDamageAmount * 100) / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-1">
                    <span>Eindtotaal</span>
                    <span>{formatCurrency(finalTotal)}</span>
                  </div>
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

      {/* CSV Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">SnelStart Export:</span>
            <Select value={exportYear} onValueChange={setExportYear}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Jaar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle jaren</SelectItem>
                {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={exportMonth} onValueChange={setExportMonth}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Maand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle maanden</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(2000, i).toLocaleString("nl-NL", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={exportStatus} onValueChange={setExportStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="concept">Concept</SelectItem>
                <SelectItem value="verzonden">Verzonden</SelectItem>
                <SelectItem value="betaald">Betaald</SelectItem>
                <SelectItem value="vervallen">Vervallen</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <FileDown className="h-4 w-4 mr-1" /> CSV Export
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <TableHead className="w-44"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.customer_id ? customerMap[inv.customer_id] ?? "—" : "—"}</TableCell>
                    <TableCell>{new Date(inv.invoice_date).toLocaleDateString("nl-NL")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColor[inv.status]}`}>{statusLabel[inv.status]}</span>
                        {inv.emailed_at && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            <Mail className="h-3 w-3 mr-0.5" /> Gemaild
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.source_type === "uploaded" ? "secondary" : "outline"}>
                        {inv.source_type === "uploaded" ? "Geüpload" : "Aangemaakt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.total)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPdf(inv)}
                          title="Preview"
                          disabled={generatingPdf === inv.id}
                        >
                          {generatingPdf === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPdf(inv, true)}
                          title="Download"
                          disabled={generatingPdf === inv.id}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmailDialog(inv)}
                          title="Factuur mailen"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
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

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Factuur mailen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {emailInvoice && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
                <p>Factuur: <strong>{emailInvoice.invoice_number}</strong></p>
                <p>Bedrag: <strong>{formatCurrency(emailInvoice.total)}</strong></p>
                <p className="text-xs mt-1">📎 PDF wordt als bijlage meegestuurd</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Ontvanger (aan)</Label>
              <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="klant@voorbeeld.nl" type="email" />
            </div>
            <div className="space-y-2">
              <Label>CC <span className="text-muted-foreground font-normal">(meerdere adressen scheiden met komma)</span></Label>
              <Input value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="admin@bedrijf.nl, boekhouder@bedrijf.nl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Afzender naam</Label>
                <Input value={emailFromName} onChange={e => setEmailFromName(e.target.value)} placeholder="Harkas IT" />
              </div>
              <div className="space-y-2">
                <Label>Afzender e-mail</Label>
                <Input value={emailFromEmail} onChange={e => setEmailFromEmail(e.target.value)} placeholder="administratie@harkasit.nl" type="email" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail || !emailTo.trim()}>
              {sendingEmail ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Verzenden...</> : <><Mail className="h-4 w-4 mr-1" /> Versturen</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvoices;
