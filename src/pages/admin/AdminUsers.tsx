import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ModuleKey } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator,
  Check,
  Clock,
  FileText,
  Fuel,
  Globe,
  KeyRound,
  LayoutDashboard,
  Loader2,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

type ManagedUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
};

const MODULES: Array<{
  key: ModuleKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "dashboard", label: "Dashboard", description: "Overzicht van klanten, facturen, omzet en domeinen.", icon: LayoutDashboard },
  { key: "invoices", label: "Facturen", description: "Facturen bekijken, beheren, PDF maken en verzenden.", icon: FileText },
  { key: "factuur_maker", label: "Factuur Maker", description: "Losse factuur maken en direct als PDF downloaden.", icon: ReceiptText },
  { key: "customers", label: "Klanten", description: "Klantgegevens bekijken, toevoegen en wijzigen.", icon: Users },
  { key: "domains", label: "Domeinen", description: "Domeinen, verlengingen en bijbehorende facturatie beheren.", icon: Globe },
  { key: "time_entries", label: "Uren", description: "Urenregistratie en facturatie vanuit uren.", icon: Clock },
  { key: "passwords", label: "Wachtwoorden", description: "Toegang tot de beveiligde wachtwoordkluis.", icon: KeyRound },
  { key: "tankprijzen", label: "Tankprijzen", description: "Tankprijzenkaart voor Nederland, Duitsland en België.", icon: Fuel },
  { key: "btw_overzicht", label: "BTW overzicht", description: "BTW- en factuuroverzichten bekijken.", icon: Calculator },
  { key: "settings", label: "Instellingen", description: "Bedrijfs-, factuur- en brandinginstellingen beheren.", icon: Settings },
];

const provisioningClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [draftModules, setDraftModules] = useState<Record<string, ModuleKey[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newModules, setNewModules] = useState<ModuleKey[]>(["factuur_maker", "tankprijzen"]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: managed, error: managedError },
        { data: adminRows, error: adminError },
        { data: moduleRows, error: moduleError },
      ] = await Promise.all([
        supabase
          .from("managed_users")
          .select("user_id,email,display_name,created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin"),
        supabase
          .from("user_module_access")
          .select("user_id,module_key"),
      ]);

      if (managedError) throw managedError;
      if (adminError) throw adminError;
      if (moduleError) throw moduleError;

      const nextAdminIds = new Set((adminRows ?? []).map((row) => row.user_id));
      const grouped: Record<string, ModuleKey[]> = {};
      for (const row of moduleRows ?? []) {
        grouped[row.user_id] = [...(grouped[row.user_id] ?? []), row.module_key as ModuleKey];
      }

      setUsers((managed ?? []) as ManagedUser[]);
      setAdminIds(nextAdminIds);
      setDraftModules(grouped);
    } catch (error: any) {
      toast({
        title: "Gebruikers konden niet worden geladen",
        description:
          error?.message?.includes("managed_users") || error?.message?.includes("user_module_access")
            ? "Voer in Supabase SQL Editor eerst 20260926184000_all_module_access.sql uit."
            : error?.message || "Voer eerst de nieuwste Supabase-toegangsmigratie uit.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleModule = (current: ModuleKey[], module: ModuleKey) =>
    current.includes(module) ? current.filter((item) => item !== module) : [...current, module];

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || password.length < 8) {
      toast({
        title: "Controleer de gegevens",
        description: "Gebruik een geldig e-mailadres en een tijdelijk wachtwoord van minimaal 8 tekens.",
        variant: "destructive",
      });
      return;
    }

    if (newModules.length === 0) {
      toast({
        title: "Kies minimaal één module",
        description: "Een nieuw account moet toegang krijgen tot minstens één module.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const [{ error: managedCheck }, { error: accessCheck }] = await Promise.all([
        supabase.from("managed_users").select("user_id", { head: true, count: "exact" }),
        supabase.from("user_module_access").select("user_id", { head: true, count: "exact" }),
      ]);

      if (managedCheck || accessCheck) {
        throw new Error(
          "Gebruikersbeheer is nog niet geactiveerd in Supabase. Voer eerst de migratie 20260926184000_all_module_access.sql uit in de SQL Editor.",
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await provisioningClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/login`,
          data: { display_name: displayName.trim() || cleanEmail.split("@")[0] },
        },
      });

      if (error) throw error;
      if (!data.user?.id) throw new Error("Supabase heeft geen gebruiker-ID teruggegeven.");

      const userId = data.user.id;

      const { error: profileError } = await supabase
        .from("managed_users")
        .upsert({
          user_id: userId,
          email: cleanEmail,
          display_name: displayName.trim() || cleanEmail.split("@")[0],
        });
      if (profileError) throw profileError;

      const { error: moduleError } = await supabase
        .from("user_module_access")
        .insert(newModules.map((module_key) => ({ user_id: userId, module_key })));
      if (moduleError) throw moduleError;

      toast({
        title: "Gebruiker aangemaakt",
        description: data.session
          ? "Het account kan direct inloggen."
          : "Het account is aangemaakt. Als e-mailbevestiging aanstaat, moet de gebruiker eerst de bevestigingsmail openen.",
      });

      setDisplayName("");
      setEmail("");
      setPassword("");
      setNewModules(["factuur_maker", "tankprijzen"]);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Gebruiker aanmaken mislukt",
        description: error?.message || "Er is een onbekende fout opgetreden.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const saveAccess = async (user: ManagedUser) => {
    if (adminIds.has(user.user_id)) return;

    setSavingUserId(user.user_id);
    try {
      const { error: deleteError } = await supabase
        .from("user_module_access")
        .delete()
        .eq("user_id", user.user_id);
      if (deleteError) throw deleteError;

      const selected = draftModules[user.user_id] ?? [];
      if (selected.length > 0) {
        const { error: insertError } = await supabase
          .from("user_module_access")
          .insert(selected.map((module_key) => ({ user_id: user.user_id, module_key })));
        if (insertError) throw insertError;
      }

      toast({
        title: "Toegang bijgewerkt",
        description: selected.length
          ? `${user.display_name || user.email} heeft nu toegang tot ${selected.length} module(s).`
          : `Alle moduletoegang voor ${user.display_name || user.email} is ingetrokken.`,
      });
      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Opslaan mislukt",
        description: error?.message || "De rechten konden niet worden bijgewerkt.",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const totalSharedUsers = useMemo(
    () => users.filter((user) => !adminIds.has(user.user_id)).length,
    [users, adminIds],
  );

  const moduleGrid = (
    selected: ModuleKey[],
    setSelected: (next: ModuleKey[]) => void,
  ) => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {MODULES.map((module) => {
        const active = selected.includes(module.key);
        const Icon = module.icon;
        return (
          <button
            type="button"
            key={module.key}
            onClick={() => setSelected(toggleModule(selected, module.key))}
            className={`rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50"}`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {active ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span>
                <span className="block font-semibold">{module.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{module.description}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading">Gebruikers & toegang</h1>
          <p className="text-muted-foreground">
            Kies per gebruiker exact welke onderdelen van het portaal zichtbaar en toegankelijk zijn.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <UsersRound className="mr-1.5 h-3.5 w-3.5" />
          {totalSharedUsers} externe gebruiker{totalSharedUsers === 1 ? "" : "s"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nieuwe gebruiker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="user-name">Naam</Label>
                <Input id="user-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Bijv. Yassin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">E-mail</Label>
                <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@voorbeeld.nl" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Tijdelijk wachtwoord</Label>
                <Input id="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimaal 8 tekens" minLength={8} required />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Label>Modules</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setNewModules(MODULES.map((item) => item.key))}>
                    Alles selecteren
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setNewModules([])}>
                    Alles wissen
                  </Button>
                </div>
              </div>
              {moduleGrid(newModules, setNewModules)}
            </div>

            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Gebruiker aanmaken
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bestaande gebruikers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gebruikers laden...
            </div>
          ) : users.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Nog geen gebruikers gevonden.</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const isAdministrator = adminIds.has(user.user_id);
                const selected = draftModules[user.user_id] ?? [];

                return (
                  <div key={user.user_id} className="rounded-xl border border-border p-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{user.display_name || user.email}</p>
                          {isAdministrator && (
                            <Badge className="gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Beheerder
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      {!isAdministrator && (
                        <Button
                          size="sm"
                          onClick={() => saveAccess(user)}
                          disabled={savingUserId === user.user_id}
                        >
                          {savingUserId === user.user_id && <Loader2 className="h-4 w-4 animate-spin" />}
                          Rechten opslaan
                        </Button>
                      )}
                    </div>

                    {isAdministrator ? (
                      <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        Beheerders hebben automatisch toegang tot alle modules en tot gebruikersbeheer.
                      </p>
                    ) : (
                      moduleGrid(selected, (next) =>
                        setDraftModules((current) => ({ ...current, [user.user_id]: next }))
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
