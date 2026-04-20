import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  Mail,
  FileText,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
}

interface Domain {
  id: string;
  domain_name: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  expiry_date: string;
  registrar: string | null;
  notes: string | null;
  auto_renew: boolean;
  status: "active" | "expiring" | "urgent" | "expired";
  reminder_1_month_sent_at: string | null;
  reminder_1_week_sent_at: string | null;
  action_required: boolean;
  action_status: "none" | "pending" | "extended" | "cancelled";
  renewal_price: number;
  last_invoiced_at: string | null;
}

interface FormState {
  domain_name: string;
  customer_id: string | "manual";
  customer_name: string;
  customer_email: string;
  expiry_date: string;
  auto_renew: boolean;
  renewal_price: string;
  registrar: string;
  notes: string;
}

const emptyForm: FormState = {
  domain_name: "",
  customer_id: "manual",
  customer_name: "",
  customer_email: "",
  expiry_date: "",
  auto_renew: false,
  renewal_price: "0",
  registrar: "",
  notes: "",
};

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function deriveStatus(iso: string): Domain["status"] {
  const d = daysUntil(iso);
  if (d < 0) return "expired";
  if (d <= 7) return "urgent";
  if (d <= 30) return "expiring";
  return "active";
}

function statusBadge(s: Domain["status"]) {
  switch (s) {
    case "active":
      return (
        <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20 border-0">
          Actief
        </Badge>
      );
    case "expiring":
      return (
        <Badge className="bg-orange-500/15 text-orange-500 hover:bg-orange-500/20 border-0">
          Verloopt binnenkort
        </Badge>
      );
    case "urgent":
      return (
        <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0">
          Urgent
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-muted text-muted-foreground border-0">Verlopen</Badge>
      );
  }
}

function actionBadge(s: Domain["action_status"]) {
  switch (s) {
    case "pending":
      return (
        <Badge className="bg-orange-500/15 text-orange-500 border-0">
          Actie vereist
        </Badge>
      );
    case "extended":
      return (
        <Badge className="bg-green-500/15 text-green-500 border-0">Verlengd</Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-muted text-muted-foreground border-0">Opgezegd</Badge>
      );
    default:
      return <span className="text-muted-foreground text-xs">—</span>;
  }
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const formatDateNl = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const round2 = (n: number) => Math.round(n * 100) / 100;

const AdminDomains = () => {
  const { toast } = useToast();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [dRes, cRes] = await Promise.all([
      supabase.from("domains").select("*").order("expiry_date", { ascending: true }),
      supabase.from("customers").select("id, name, email").order("name"),
    ]);
    if (dRes.error) {
      toast({ title: "Fout bij laden", description: dRes.error.message, variant: "destructive" });
    } else {
      setDomains((dRes.data ?? []) as Domain[]);
    }
    if (cRes.data) setCustomers(cRes.data as Customer[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return domains.filter((d) => {
      const status = deriveStatus(d.expiry_date);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (search && !d.domain_name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [domains, search, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (d: Domain) => {
    setEditingId(d.id);
    setForm({
      domain_name: d.domain_name,
      customer_id: d.customer_id ?? "manual",
      customer_name: d.customer_name ?? "",
      customer_email: d.customer_email ?? "",
      expiry_date: d.expiry_date,
      auto_renew: d.auto_renew,
      renewal_price: String(d.renewal_price ?? 0),
      registrar: d.registrar ?? "",
      notes: d.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.domain_name.trim() || !form.expiry_date) {
      toast({
        title: "Verplichte velden",
        description: "Domeinnaam en afloopdatum zijn verplicht.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);

    const customer = customers.find((c) => c.id === form.customer_id);
    const payload = {
      domain_name: form.domain_name.trim().toLowerCase(),
      customer_id: form.customer_id === "manual" ? null : form.customer_id,
      customer_name:
        form.customer_id === "manual"
          ? form.customer_name.trim() || null
          : customer?.name ?? null,
      customer_email:
        form.customer_id === "manual"
          ? form.customer_email.trim() || null
          : (customer?.email ?? (form.customer_email.trim() || null)),
      expiry_date: form.expiry_date,
      auto_renew: form.auto_renew,
      renewal_price: round2(parseFloat(form.renewal_price) || 0),
      registrar: form.registrar.trim() || null,
      notes: form.notes.trim() || null,
      status: deriveStatus(form.expiry_date),
    };

    const res = editingId
      ? await supabase.from("domains").update(payload).eq("id", editingId)
      : await supabase.from("domains").insert(payload);

    setSaving(false);
    if (res.error) {
      toast({ title: "Opslaan mislukt", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Domein bijgewerkt" : "Domein toegevoegd" });
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Domein "${name}" verwijderen?`)) return;
    const { error } = await supabase.from("domains").delete().eq("id", id);
    if (error) {
      toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Domein verwijderd" });
    fetchData();
  };

  const handleCancel = async (d: Domain) => {
    if (!confirm(`Domein "${d.domain_name}" markeren als opgezegd?`)) return;
    const { error } = await supabase
      .from("domains")
      .update({
        action_status: "cancelled",
        action_required: false,
      })
      .eq("id", d.id);
    if (error) {
      toast({ title: "Mislukt", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("activity_logs").insert({
      type: "domain_cancelled",
      description: `Domein ${d.domain_name} opgezegd`,
      reference_id: d.id,
    });
    toast({ title: "Gemarkeerd als opgezegd" });
    fetchData();
  };

  const handleExtend = async (d: Domain) => {
    if (!d.customer_id) {
      toast({
        title: "Klant vereist",
        description:
          "Koppel eerst een klant aan dit domein om automatisch een factuur te genereren.",
        variant: "destructive",
      });
      return;
    }
    if (!d.renewal_price || d.renewal_price <= 0) {
      toast({
        title: "Verlengprijs ontbreekt",
        description: "Stel een verlengprijs in voordat je verlengt.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Domein "${d.domain_name}" verlengen met 1 jaar en factuur aanmaken?`))
      return;

    setActionLoadingId(d.id);

    try {
      // 1. New expiry date (+1 year)
      const newExpiry = new Date(d.expiry_date + "T00:00:00");
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      const newExpiryIso = newExpiry.toISOString().slice(0, 10);

      // 2. Generate invoice number
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      const { data: invNum, error: invNumErr } = await supabase.rpc(
        "generate_invoice_number",
        { p_year: year },
      );
      if (invNumErr) throw invNumErr;

      const subtotal = round2(d.renewal_price);
      const vatTotal = round2(subtotal * 0.21);
      const total = round2(subtotal + vatTotal);

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invNum as string,
          customer_id: d.customer_id,
          invoice_date: today.toISOString().slice(0, 10),
          status: "concept",
          source_type: "generated",
          invoice_year: year,
          invoice_month: month,
          subtotal,
          vat_total: vatTotal,
          total,
        })
        .select("id")
        .single();
      if (invErr) throw invErr;

      // 3. Invoice item
      const { error: itemErr } = await supabase.from("invoice_items").insert({
        invoice_id: inv.id,
        description: `Verlenging domein ${d.domain_name} (1 jaar)`,
        quantity: 1,
        price: subtotal,
        vat_percentage: 21,
        subtotal,
      });
      if (itemErr) throw itemErr;

      // 4. Update domain
      const { error: domErr } = await supabase
        .from("domains")
        .update({
          expiry_date: newExpiryIso,
          status: "active",
          action_required: false,
          action_status: "extended",
          last_invoiced_at: new Date().toISOString(),
          reminder_1_month_sent_at: null,
          reminder_1_week_sent_at: null,
        })
        .eq("id", d.id);
      if (domErr) throw domErr;

      // 5. Activity log
      await supabase.from("activity_logs").insert({
        type: "domain_renewed",
        description: `Factuur ${invNum} aangemaakt voor domeinverlenging ${d.domain_name}`,
        reference_id: d.id,
      });

      toast({
        title: "Domein verlengd",
        description: `Factuur ${invNum} aangemaakt (${formatCurrency(total)})`,
      });
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Verlengen mislukt",
        description: e.message ?? "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" /> Domeinen
          </h1>
          <p className="text-muted-foreground text-sm">
            Beheer domeinen, herinneringen en verlengingen.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nieuw domein
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek domein..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="active">Actief</SelectItem>
              <SelectItem value="expiring">Verloopt binnenkort</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="expired">Verlopen</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Geen domeinen gevonden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domein</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Afloopdatum</TableHead>
                  <TableHead>Dagen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actie</TableHead>
                  <TableHead>Badges</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const status = deriveStatus(d.expiry_date);
                  const days = daysUntil(d.expiry_date);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.domain_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{d.customer_name ?? "—"}</div>
                        {d.customer_email && (
                          <div className="text-xs text-muted-foreground">
                            {d.customer_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatDateNl(d.expiry_date)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            days < 0
                              ? "text-muted-foreground"
                              : days <= 7
                              ? "text-destructive font-medium"
                              : days <= 30
                              ? "text-orange-500 font-medium"
                              : ""
                          }
                        >
                          {days < 0 ? `${Math.abs(days)}d verlopen` : `${days}d`}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(status)}</TableCell>
                      <TableCell>{actionBadge(d.action_status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {d.reminder_1_month_sent_at && (
                            <Badge variant="outline" className="text-[10px]">
                              <Mail className="h-3 w-3 mr-1" />1m
                            </Badge>
                          )}
                          {d.reminder_1_week_sent_at && (
                            <Badge variant="outline" className="text-[10px]">
                              <Mail className="h-3 w-3 mr-1" />1w
                            </Badge>
                          )}
                          {d.last_invoiced_at && (
                            <Badge variant="outline" className="text-[10px]">
                              <FileText className="h-3 w-3 mr-1" />
                              Gefactureerd
                            </Badge>
                          )}
                          {d.auto_renew && (
                            <Badge variant="outline" className="text-[10px]">
                              Auto
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleExtend(d)}
                            disabled={actionLoadingId === d.id}
                            title="Verlengen + factuur"
                          >
                            {actionLoadingId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(d)}
                            title="Opzeggen"
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(d.id, d.domain_name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Domein bewerken" : "Nieuw domein"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Domeinnaam *</Label>
              <Input
                value={form.domain_name}
                onChange={(e) => setForm({ ...form, domain_name: e.target.value })}
                placeholder="voorbeeld.nl"
              />
            </div>
            <div>
              <Label>Klant</Label>
              <Select
                value={form.customer_id}
                onValueChange={(v) => setForm({ ...form, customer_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Handmatig invullen</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.customer_id === "manual" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Klantnaam</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm({ ...form, customer_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Klant e-mail</Label>
                  <Input
                    type="email"
                    value={form.customer_email}
                    onChange={(e) =>
                      setForm({ ...form, customer_email: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Afloopdatum *</Label>
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) =>
                    setForm({ ...form, expiry_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Verlengprijs (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.renewal_price}
                  onChange={(e) =>
                    setForm({ ...form, renewal_price: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Registrar</Label>
              <Input
                value={form.registrar}
                onChange={(e) => setForm({ ...form, registrar: e.target.value })}
                placeholder="bv. TransIP, Vimexx"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto_renew"
                checked={form.auto_renew}
                onCheckedChange={(v) =>
                  setForm({ ...form, auto_renew: Boolean(v) })
                }
              />
              <Label htmlFor="auto_renew" className="cursor-pointer">
                Automatisch verlengen
              </Label>
            </div>
            <div>
              <Label>Notities</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDomains;
