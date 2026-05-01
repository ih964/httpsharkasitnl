import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Search, Plus, Eye, EyeOff, Copy, Pencil, Trash2, ShieldAlert, Wand2, ExternalLink } from "lucide-react";

interface VaultItem {
  id: string;
  title: string;
  category: string | null;
  website_url: string | null;
  username: string | null;
  encrypted_password: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  title: "",
  category: "",
  website_url: "",
  username: "",
  password: "",
  notes: "",
};

function generatePassword(length = 20) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

const AdminPasswords = () => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showPwInForm, setShowPwInForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("password_vault")
      .select("*")
      .order("title", { ascending: true });
    if (error) {
      toast({ title: "Fout bij laden", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as VaultItem[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryFilter !== "all" && (i.category ?? "") !== categoryFilter) return false;
      if (!q) return true;
      return [i.title, i.category, i.website_url, i.username, i.notes]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [items, search, categoryFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowPwInForm(false);
    setDialogOpen(true);
  };

  const openEdit = async (item: VaultItem) => {
    setEditing(item);
    setShowPwInForm(false);
    setForm({
      title: item.title,
      category: item.category ?? "",
      website_url: item.website_url ?? "",
      username: item.username ?? "",
      password: "",
      notes: item.notes ?? "",
    });
    setDialogOpen(true);
  };

  const encryptPassword = async (plain: string) => {
    const { data, error } = await supabase.functions.invoke("encrypt-password", { body: { password: plain } });
    if (error) throw error;
    return (data as { encrypted: string }).encrypted;
  };

  const decryptPassword = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("decrypt-password", { body: { id } });
    if (error) throw error;
    return (data as { password: string }).password;
  };

  const handleReveal = async (id: string) => {
    if (revealed[id]) {
      const next = { ...revealed }; delete next[id]; setRevealed(next); return;
    }
    setBusyId(id);
    try {
      const pw = await decryptPassword(id);
      setRevealed((r) => ({ ...r, [id]: pw }));
    } catch (e: any) {
      toast({ title: "Decryptie mislukt", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const handleCopyPassword = async (id: string) => {
    setBusyId(id);
    try {
      const pw = revealed[id] ?? await decryptPassword(id);
      await navigator.clipboard.writeText(pw);
      toast({ title: "Wachtwoord gekopieerd" });
    } catch (e: any) {
      toast({ title: "Kopiëren mislukt", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} gekopieerd` });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Titel verplicht", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        category: form.category.trim() || null,
        website_url: form.website_url.trim() || null,
        username: form.username.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        if (form.password) {
          payload.encrypted_password = await encryptPassword(form.password);
        }
        const { error } = await supabase.from("password_vault").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Bijgewerkt" });
      } else {
        if (!form.password) {
          toast({ title: "Wachtwoord verplicht", variant: "destructive" });
          setSaving(false); return;
        }
        payload.encrypted_password = await encryptPassword(form.password);
        const { error } = await supabase.from("password_vault").insert(payload);
        if (error) throw error;
        toast({ title: "Opgeslagen" });
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("password_vault").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verwijderd" });
      setItems((prev) => prev.filter((i) => i.id !== deleteId));
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold">Wachtwoorden</h1>
          <p className="text-muted-foreground">Veilige kluis voor credentials.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Nieuw wachtwoord</Button>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Alleen voor admins</AlertTitle>
        <AlertDescription>
          Wachtwoorden zijn server-side versleuteld (AES-GCM). Alleen ingelogde admins kunnen items bekijken of ontsleutelen.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op titel, categorie, website, username, notities..."
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle categorieën</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Laden...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">Geen wachtwoorden gevonden.</p>
          ) : (
            <div className="grid gap-3">
              {filtered.map((item) => (
                <Card key={item.id} className="border-border/60">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{item.title}</h3>
                          {item.category && <Badge variant="secondary">{item.category}</Badge>}
                        </div>
                        {item.website_url && (
                          <a href={item.website_url.startsWith("http") ? item.website_url : `https://${item.website_url}`}
                             target="_blank" rel="noreferrer"
                             className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            {item.website_url} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {item.username && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Gebruiker:</span>
                            <span className="font-mono">{item.username}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy(item.username!, "Gebruikersnaam")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Wachtwoord:</span>
                          <span className="font-mono">{revealed[item.id] ?? "••••••••••"}</span>
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.notes}</p>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => handleReveal(item.id)}>
                          {revealed[item.id] ? <><EyeOff className="h-4 w-4" /> Verbergen</> : <><Eye className="h-4 w-4" /> Tonen</>}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => handleCopyPassword(item.id)}>
                          <Copy className="h-4 w-4" /> Kopiëren
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Wachtwoord bewerken" : "Nieuw wachtwoord"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titel *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categorie</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="bv. Hosting" />
              </div>
              <div>
                <Label>Website URL</Label>
                <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Gebruikersnaam</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Label>Wachtwoord {editing && <span className="text-muted-foreground text-xs">(leeg laten = ongewijzigd)</span>}</Label>
              <div className="flex gap-2">
                <Input
                  type={showPwInForm ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowPwInForm((v) => !v)}>
                  {showPwInForm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setForm((f) => ({ ...f, password: generatePassword() })); setShowPwInForm(true); }}>
                  <Wand2 className="h-4 w-4" /> Genereer
                </Button>
              </div>
            </div>
            <div>
              <Label>Notities</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Opslaan..." : "Opslaan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wachtwoord verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>Deze actie kan niet ongedaan worden gemaakt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPasswords;
