import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, ShieldCheck, UserPlus, UsersRound } from "lucide-react";

type ModuleRole = "factuur_maker" | "tankprijzen";
type AccessRole = "admin" | ModuleRole;

type ManagedUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
};

const MODULES: Array<{ role: ModuleRole; label: string; description: string }> = [
  { role: "factuur_maker", label: "Factuur Maker", description: "Losse facturen maken en als PDF downloaden." },
  { role: "tankprijzen", label: "Tankprijzen", description: "Tankprijzenkaart voor Nederland, Duitsland en België." },
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
  const [rolesByUser, setRolesByUser] = useState<Record<string, AccessRole[]>>({});
  const [draftRoles, setDraftRoles] = useState<Record<string, ModuleRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRoles, setNewRoles] = useState<ModuleRole[]>(["factuur_maker", "tankprijzen"]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: managed, error: managedError }, { data: roleRows, error: rolesError }] = await Promise.all([
        supabase
          .from("managed_users")
          .select("user_id,email,display_name,created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("user_roles")
          .select("user_id,role"),
      ]);

      if (managedError) throw managedError;
      if (rolesError) throw rolesError;

      const grouped: Record<string, AccessRole[]> = {};
      for (const row of roleRows ?? []) {
        const role = row.role as AccessRole;
        grouped[row.user_id] = [...(grouped[row.user_id] ?? []), role];
      }

      const moduleDrafts: Record<string, ModuleRole[]> = {};
      for (const user of managed ?? []) {
        moduleDrafts[user.user_id] = (grouped[user.user_id] ?? []).filter(
          (role): role is ModuleRole => role === "factuur_maker" || role === "tankprijzen",
        );
      }

      setUsers((managed ?? []) as ManagedUser[]);
      setRolesByUser(grouped);
      setDraftRoles(moduleDrafts);
    } catch (error: any) {
      toast({
        title: "Gebruikers konden niet worden geladen",
        description: error?.message || "Controleer of de nieuwe Supabase-migratie is uitgevoerd.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleRole = (current: ModuleRole[], role: ModuleRole) =>
    current.includes(role) ? current.filter((item) => item !== role) : [...current, role];

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
    if (newRoles.length === 0) {
      toast({
        title: "Kies minimaal één module",
        description: "Een nieuw account moet toegang krijgen tot minstens één module.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
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

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert(newRoles.map((role) => ({ user_id: userId, role })));
      if (roleError) throw roleError;

      toast({
        title: "Gebruiker aangemaakt",
        description: data.session
          ? "Het account kan direct inloggen."
          : "Het account is aangemaakt. Als e-mailbevestiging aanstaat, moet de gebruiker eerst de bevestigingsmail openen.",
      });

      setDisplayName("");
      setEmail("");
      setPassword("");
      setNewRoles(["factuur_maker", "tankprijzen"]);
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
    if ((rolesByUser[user.user_id] ?? []).includes("admin")) return;

    setSavingUserId(user.user_id);
    try {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.user_id)
        .in("role", ["factuur_maker", "tankprijzen"]);
      if (deleteError) throw deleteError;

      const selected = draftRoles[user.user_id] ?? [];
      if (selected.length > 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(selected.map((role) => ({ user_id: user.user_id, role })));
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
    () => users.filter((user) => !(rolesByUser[user.user_id] ?? []).includes("admin")).length,
    [users, rolesByUser],
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading">Gebruikers & toegang</h1>
          <p className="text-muted-foreground">
            Maak accounts aan en bepaal per gebruiker welke Harkas IT-modules zichtbaar zijn.
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
                <Input
                  id="user-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Bijv. Yassin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">E-mail</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Tijdelijk wachtwoord</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimaal 8 tekens"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Modules</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODULES.map((module) => {
                  const active = newRoles.includes(module.role);
                  return (
                    <button
                      type="button"
                      key={module.role}
                      onClick={() => setNewRoles((current) => toggleRole(current, module.role))}
                      className={`rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {active && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span>
                          <span className="block font-semibold">{module.label}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{module.description}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
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
            <div className="space-y-3">
              {users.map((user) => {
                const roles = rolesByUser[user.user_id] ?? [];
                const isAdministrator = roles.includes("admin");
                const selected = draftRoles[user.user_id] ?? [];

                return (
                  <div key={user.user_id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

                      {isAdministrator ? (
                        <p className="text-sm text-muted-foreground">
                          Beheerders hebben automatisch toegang tot alle modules.
                        </p>
                      ) : (
                        <div className="flex flex-1 flex-col gap-3 lg:max-w-2xl">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {MODULES.map((module) => {
                              const active = selected.includes(module.role);
                              return (
                                <button
                                  type="button"
                                  key={module.role}
                                  onClick={() =>
                                    setDraftRoles((current) => ({
                                      ...current,
                                      [user.user_id]: toggleRole(current[user.user_id] ?? [], module.role),
                                    }))
                                  }
                                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                                >
                                  <span className={`grid h-4 w-4 place-items-center rounded border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                                    {active && <Check className="h-3 w-3" />}
                                  </span>
                                  {module.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => saveAccess(user)}
                              disabled={savingUserId === user.user_id}
                            >
                              {savingUserId === user.user_id && <Loader2 className="h-4 w-4 animate-spin" />}
                              Rechten opslaan
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
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
