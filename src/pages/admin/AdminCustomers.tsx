import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  vat_number: string | null;
  kvk_number: string | null;
  notes: string | null;
}

const emptyForm = {
  name: "", company_name: "", email: "", phone: "",
  address: "", postal_code: "", city: "",
  vat_number: "", kvk_number: "", notes: "",
};

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from("customers").select("*").order("name");
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); }
    else setCustomers(data ?? []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Naam is verplicht", variant: "destructive" }); return; }

    const payload = {
      name: form.name,
      company_name: form.company_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      postal_code: form.postal_code || null,
      city: form.city || null,
      vat_number: form.vat_number || null,
      kvk_number: form.kvk_number || null,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("customers").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Klant bijgewerkt" });
    } else {
      const { error } = await supabase.from("customers").insert(payload);
      if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Klant aangemaakt" });
    }

    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchCustomers();
  };

  const handleEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      company_name: c.company_name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      postal_code: c.postal_code ?? "",
      city: c.city ?? "",
      vat_number: c.vat_number ?? "",
      kvk_number: c.kvk_number ?? "",
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Klant verwijderen?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Klant verwijderd" });
    fetchCustomers();
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold">Klanten</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nieuwe klant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Klant bewerken" : "Nieuwe klant"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Bedrijfsnaam</Label>
                  <Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Telefoon</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Plaats</Label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>BTW-nummer</Label>
                  <Input value={form.vat_number} onChange={e => setForm({ ...form, vat_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>KVK-nummer</Label>
                  <Input value={form.kvk_number} onChange={e => setForm({ ...form, kvk_number: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={handleSave}>{editingId ? "Opslaan" : "Aanmaken"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoeken..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6">Geen klanten gevonden.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefoon</TableHead>
                  <TableHead>Plaats</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.company_name ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.city ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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

export default AdminCustomers;
