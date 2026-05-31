import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Save } from "lucide-react";
import AdminInvoices from "./AdminInvoices";

type InvoiceLite = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  status: string;
  total: number;
};

type CustomerLite = {
  id: string;
  name: string;
  company_name: string | null;
};

const statusOptions = [
  { value: "concept", label: "Concept" },
  { value: "verzonden", label: "Verzonden" },
  { value: "betaald", label: "Betaald" },
  { value: "vervallen", label: "Vervallen" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);

const AdminInvoicesWithStatus = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceLite[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [search, setSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("concept");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [invoiceRes, customerRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, customer_id, invoice_date, status, total")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.from("customers").select("id, name, company_name"),
    ]);

    if (invoiceRes.error) {
      toast({ title: "Facturen laden mislukt", description: invoiceRes.error.message, variant: "destructive" });
    } else {
      setInvoices((invoiceRes.data ?? []).map((i: any) => ({ ...i, total: Number(i.total) })));
    }

    if (!customerRes.error) setCustomers((customerRes.data ?? []) as CustomerLite[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const customerMap = useMemo(() => {
    return Object.fromEntries(customers.map((c) => [c.id, c.name + (c.company_name ? ` (${c.company_name})` : "")]));
  }, [customers]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((invoice) => {
      const customerName = invoice.customer_id ? (customerMap[invoice.customer_id] ?? "") : "";
      return invoice.invoice_number.toLowerCase().includes(q) || customerName.toLowerCase().includes(q);
    });
  }, [invoices, search, customerMap]);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;

  const chooseInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const invoice = invoices.find((item) => item.id === invoiceId);
    setSelectedStatus(invoice?.status ?? "concept");
  };

  const saveStatus = async () => {
    if (!selectedInvoiceId) {
      toast({ title: "Selecteer eerst een factuur", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: selectedStatus })
        .eq("id", selectedInvoiceId);

      if (error) throw new Error(error.message);

      await supabase.from("activity_logs").insert({
        type: "invoice_status_updated",
        reference_id: selectedInvoiceId,
        description: `Factuurstatus gewijzigd naar ${selectedStatus}`,
      });

      toast({ title: "Status bijgewerkt" });
      await load();
    } catch (error: any) {
      toast({ title: "Status wijzigen mislukt", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="border-primary/30 bg-primary/5 mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="font-semibold">Snel factuurstatus wijzigen</h2>
              <p className="text-sm text-muted-foreground">
                Kies een factuur en zet de status direct op Concept, Verzonden, Betaald of Vervallen.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Vernieuwen
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Zoek factuurnummer of klant..."
            />
            <Select value={selectedInvoiceId} onValueChange={chooseInvoice}>
              <SelectTrigger className="lg:col-span-2">
                <SelectValue placeholder="Selecteer factuur" />
              </SelectTrigger>
              <SelectContent>
                {filteredInvoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} · {invoice.customer_id ? customerMap[invoice.customer_id] ?? "—" : "—"} · {formatCurrency(invoice.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Nieuwe status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {selectedInvoice ? (
                <span>
                  Geselecteerd: <strong>{selectedInvoice.invoice_number}</strong> · huidige status: <Badge variant="secondary">{selectedInvoice.status}</Badge>
                </span>
              ) : (
                "Geen factuur geselecteerd."
              )}
            </div>
            <Button onClick={saveStatus} disabled={saving || !selectedInvoiceId}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Opslaan..." : "Status opslaan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AdminInvoices />
    </>
  );
};

export default AdminInvoicesWithStatus;
