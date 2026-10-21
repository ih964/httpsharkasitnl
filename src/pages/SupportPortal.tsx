import TicketConversation from "@/components/support/TicketConversation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TicketHistory from "@/components/support/TicketHistory";
import SupportKnowledge from "@/components/support/SupportKnowledge";
import { treatmentGroups } from "@/lib/support";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { portalSupabase } from "@/integrations/supabase/client";
import { applyPageSeo } from "@/lib/pageSeo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  ArrowLeft,
  LifeBuoy,
  Loader2,
  LogOut,
  Plus,
  Send,
  ShieldCheck,
} from "lucide-react";
import TicketAttachments from "@/components/support/TicketAttachments";
import { notifySupportChange } from "@/lib/supportNotify";
import {
  formatTicketDate,
  PortalAccess,
  statusBadge,
  SupportTicket,
  ticketCategories,
  TicketMessage,
  ticketNumber,
  ticketPriorities,
  ticketStatuses,
  TicketPriority,
} from "@/lib/support";

const inputStyle =
  "w-full rounded-lg border border-input bg-background p-2.5 text-sm";
const emptyForm = {
  subject: "",
  description: "",
  category: "it_beheer",
  priority: "normaal" as TicketPriority,
};

function portalGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export default function SupportPortal() {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const [greeting, setGreeting] = useState(portalGreeting);
  const displayName =
    [
      user?.user_metadata?.full_name,
      user?.user_metadata?.name,
      user?.user_metadata?.display_name,
      user?.user_metadata?.preferred_username,
    ]
      .find(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
      ?.trim() ||
    user?.email?.split("@")[0] ||
    "";

  useEffect(() => {
    const timer = window.setInterval(
      () => setGreeting(portalGreeting()),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const [email, setEmail] = useState("");
  const [loginMethod, setLoginMethod] = useState<"password" | "link">(
    "password",
  );
  const [password, setPassword] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [sendingLogin, setSendingLogin] = useState(false);
  const [loginSent, setLoginSent] = useState(false);
  const [accounts, setAccounts] = useState<PortalAccess[]>([]);
  const [accountId, setAccountId] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    applyPageSeo({
      title: "Klantenportaal & Support | Harkas IT",
      description:
        "Dien een supportmelding in en volg veilig de voortgang van jouw Harkas IT-ticket.",
    });
    let robots = document.querySelector(
      'meta[name="robots"]',
    ) as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex,nofollow";
    return () => {
      robots?.remove();
    };
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorText("");
    const { data, error } = await portalSupabase
      .from("support_portal_access")
      .select("id,customer_id,customer_label,email,created_at")
      .order("customer_label");
    if (error)
      setErrorText(
        "Het klantenportaal kan de toegangsrechten niet ophalen. Probeer het opnieuw.",
      );
    else {
      const rows = (data ?? []) as PortalAccess[];
      setAccounts(rows);
      setAccountId((current) =>
        rows.some((a) => a.customer_id === current)
          ? current
          : (rows[0]?.customer_id ?? ""),
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const loadTickets = useCallback(async (customerId: string, quiet = false) => {
    if (!customerId) return;
    if (!quiet) setLoading(true);
    const { data, error } = await portalSupabase
      .from("support_tickets")
      .select("*")
      .eq("customer_id", customerId)
      .order("last_activity_at", { ascending: false })
      .limit(200);
    if (error) {
      setErrorText("Tickets ophalen is niet gelukt: " + error.message);
    } else {
      const rows = (data ?? []) as SupportTicket[];
      setTickets(rows);
      setSelected(
        (current) =>
          rows.find(
            (t) =>
              t.id ===
              (current?.id ??
                new URLSearchParams(window.location.search).get("ticket")),
          ) ?? null,
      );
    }
    if (!quiet) setLoading(false);
  }, []);

  useEffect(() => {
    setTickets([]);
    setSelected(null);
    setMessages([]);
    if (accountId) void loadTickets(accountId);
  }, [accountId, loadTickets]);

  const loadMessages = useCallback(async (ticketId: string) => {
    setLoadingMessages(true);
    const { data, error } = await portalSupabase
      .from("support_ticket_messages")
      .select("id,ticket_id,author_id,sender_type,body,is_internal,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (error)
      toast({
        title: "Reacties ophalen mislukt",
        description: error.message,
        variant: "destructive",
      });
    else setMessages((data ?? []) as TicketMessage[]);
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (selected?.id) void loadMessages(selected.id);
  }, [selected?.id, selected?.last_activity_at, loadMessages]);

  useEffect(() => {
    if (!accountId) return;
    let busy = false;
    const refresh = async () => {
      if (document.hidden || busy) return;
      busy = true;
      try {
        await loadTickets(accountId, true);
      } finally {
        busy = false;
      }
    };
    const timer = window.setInterval(() => void refresh(), 15_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [accountId, loadTickets]);

  const openTicket = (ticket: SupportTicket) => {
    setSelected(ticket);
    setReply("");
    setMessages([]);
  };

  const requestLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;
    setSendingLogin(true);
    const { data: preparation, error: prepareError } =
      await portalSupabase.functions.invoke("support-prepare-login", {
        body: { email: address },
      });
    if (prepareError) {
      setSendingLogin(false);
      toast({
        title: "Inloglink aanvragen mislukt",
        description:
          "Inloggen voorbereiden mislukt. Probeer het later opnieuw of neem contact op met support@harkasit.nl.",
        variant: "destructive",
      });
      return;
    }
    if (preparation?.invited) {
      setSendingLogin(false);
      setLoginSent(true);
      return;
    }
    const { error } = await portalSupabase.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: window.location.origin + "/support",
        shouldCreateUser: false,
      },
    });
    setSendingLogin(false);
    if (error) {
      toast({
        title: "Inloglink aanvragen mislukt",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setLoginSent(true);
    }
  };

  const loginWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sendingLogin) return;
    setSendingLogin(true);
    try {
      const { error } = await portalSupabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      setPassword("");
    } catch {
      toast({
        title: "Inloggen niet gelukt",
        description:
          "Controleer je e-mailadres en wachtwoord, of gebruik een e-maillink.",
        variant: "destructive",
      });
    } finally {
      setSendingLogin(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || savingPassword) return;
    setPasswordError("");
    if (newPassword.length < 12) {
      setPasswordError("Gebruik minimaal 12 tekens.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("De wachtwoorden komen niet overeen.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await portalSupabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      toast({
        title: "Wachtwoord opgeslagen",
        description:
          "Je kunt voortaan met je e-mailadres en wachtwoord inloggen. De e-maillink blijft ook beschikbaar.",
      });
    } catch {
      setPasswordError(
        "Opslaan is niet gelukt. Gebruik een sterk, nieuw wachtwoord. Blijft dit gebeuren? Log opnieuw in via een e-maillink en probeer het nogmaals.",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !accountId || saving) return;
    if (form.subject.trim().length < 3 || form.description.trim().length < 10) {
      toast({
        title: "Meer informatie nodig",
        description:
          "Geef een onderwerp en beschrijving van minstens 10 tekens.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { data, error } = await portalSupabase
      .from("support_tickets")
      .insert({
        customer_id: accountId,
        created_by: user.id,
        requester_email: user.email?.toLowerCase() ?? "",
        subject: form.subject.trim().slice(0, 160),
        description: form.description.trim().slice(0, 10000),
        category: form.category,
        priority: form.priority,
        status: "nieuw",
      })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) {
      toast({
        title: "Ticket aanmaken mislukt",
        description: error?.message ?? "Probeer opnieuw.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Ticket aangemaakt",
      description: ticketNumber(data.ticket_no) + " is opgeslagen.",
    });
    void notifySupportChange(data.id);
    setNewOpen(false);
    setForm(emptyForm);
    await loadTickets(accountId);
    openTicket(data as SupportTicket);
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !user || !reply.trim() || replying) return;
    setReplying(true);
    const { error } = await portalSupabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: selected.id,
        author_id: user.id,
        sender_type: "klant",
        body: reply.trim().slice(0, 10000),
        is_internal: false,
      });
    setReplying(false);
    if (error) {
      toast({
        title: "Reactie niet opgeslagen",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setReply("");
    void notifySupportChange(selected.id);
    await Promise.all([loadMessages(selected.id), loadTickets(accountId)]);
    toast({ title: "Reactie toegevoegd" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex min-h-20 items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
              H
            </span>
            <span>
              <span className="block font-bold text-foreground">Harkas IT</span>
              <span className="block text-xs text-muted-foreground">
                Klantenportaal
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Website
              </Link>
            </Button>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPasswordOpen(true)}
              >
                Wachtwoord instellen
              </Button>
            )}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" /> Uitloggen
              </Button>
            )}
          </div>
        </div>
      </header>
      {user && (
        <Dialog
          open={passwordOpen}
          onOpenChange={(open) => {
            if (savingPassword) return;
            setPasswordOpen(open);
            setNewPassword("");
            setConfirmPassword("");
            setPasswordError("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Wachtwoord instellen of wijzigen</DialogTitle>
            </DialogHeader>
            <form onSubmit={savePassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Kies een wachtwoord voor {user.email}. Inloggen via e-mail
                blijft mogelijk.
              </p>
              <Input
                type="text"
                autoComplete="username"
                value={user.email ?? ""}
                readOnly
                className="sr-only"
                tabIndex={-1}
                aria-label="E-mailadres"
              />
              <div className="space-y-2">
                <Label htmlFor="new-password">Nieuw wachtwoord</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                />
                <p className="text-xs text-muted-foreground">
                  Minimaal 12 tekens. Gebruik bij voorkeur een unieke wachtzin.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Herhaal wachtwoord</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                />
              </div>
              {passwordError && (
                <p role="alert" className="text-sm text-destructive">
                  {passwordError}
                </p>
              )}
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "Opslaan..." : "Wachtwoord opslaan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
      <main className="container mx-auto max-w-[1680px] px-4 py-4">
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Harkas IT support
          </p>
          <h1 className="break-words font-heading text-2xl font-bold">
            {user
              ? `${greeting}${displayName ? `, ${displayName}` : ""}!`
              : "Jouw meldingen, altijd inzichtelijk."}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Meld een probleem, voeg een screenshot toe en volg de status. Je
            ziet uitsluitend tickets van organisaties waarvoor je toegang hebt.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Beveiligd
                inloggen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loginSent ? (
                <div className="space-y-3">
                  <p className="font-semibold">Controleer je e-mail</p>
                  <p className="text-sm text-muted-foreground">
                    We hebben een inloglink gestuurd naar {email.trim()}. Open
                    de link op dit apparaat. Bekijk eventueel ook je spamfolder.
                  </p>
                  <Button variant="outline" onClick={() => setLoginSent(false)}>
                    Ander e-mailadres
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={
                    loginMethod === "password"
                      ? loginWithPassword
                      : requestLogin
                  }
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={
                        loginMethod === "password" ? "default" : "outline"
                      }
                      aria-pressed={loginMethod === "password"}
                      disabled={sendingLogin}
                      onClick={() => {
                        setLoginMethod("password");
                        setPassword("");
                      }}
                    >
                      Met wachtwoord
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === "link" ? "default" : "outline"}
                      aria-pressed={loginMethod === "link"}
                      disabled={sendingLogin}
                      onClick={() => {
                        setLoginMethod("link");
                        setPassword("");
                      }}
                    >
                      Via e-maillink
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gebruik het e-mailadres waarvoor Harkas IT jouw organisatie
                    toegang heeft gegeven. Nog geen wachtwoord? Log in via een
                    e-maillink en kies daarna Wachtwoord instellen.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="portal-email">E-mailadres</Label>
                    <Input
                      id="portal-email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="naam@bedrijf.nl"
                    />
                  </div>
                  {loginMethod === "password" && (
                    <div className="space-y-2">
                      <Label htmlFor="portal-password">Wachtwoord</Label>
                      <Input
                        id="portal-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => {
                          setLoginMethod("link");
                          setPassword("");
                        }}
                      >
                        Wachtwoord vergeten of nog niet ingesteld?
                      </Button>
                    </div>
                  )}
                  {loginMethod === "link" && (
                    <p className="text-sm text-muted-foreground">
                      Met de persoonlijke e-maillink log je zonder wachtwoord
                      in. Daarna kun je via Wachtwoord instellen een nieuw
                      wachtwoord kiezen.
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={sendingLogin}
                  >
                    {sendingLogin
                      ? "Even geduld..."
                      : loginMethod === "password"
                        ? "Inloggen"
                        : "Stuur mij een inloglink"}
                  </Button>
                </form>
              )}
              <p className="mt-5 text-xs text-muted-foreground">
                Nog geen toegang? Mail{" "}
                <a className="underline" href="mailto:support@harkasit.nl">
                  support@harkasit.nl
                </a>
                .
              </p>
            </CardContent>
          </Card>
        ) : loading && accounts.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : errorText && accounts.length === 0 ? (
          <Card className="mx-auto max-w-lg">
            <CardContent className="space-y-3 pt-6">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p>{errorText}</p>
              <Button onClick={() => void loadAccounts()}>
                Opnieuw proberen
              </Button>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="mx-auto max-w-lg">
            <CardContent className="space-y-3 pt-6">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <h2 className="font-semibold text-lg">
                Nog geen klantenportaaltoegang
              </h2>
              <p className="text-sm text-muted-foreground">
                Je bent ingelogd als {user.email}, maar dit adres is nog niet
                gekoppeld aan een klant. Vraag Harkas IT om toegang.
              </p>
              {isAdmin && (
                <Button variant="outline" asChild>
                  <Link to="/admin/tickets">Naar ticketbeheer</Link>
                </Button>
              )}
              <a
                className="text-sm font-semibold text-primary underline"
                href="mailto:support@harkasit.nl"
              >
                Vraag toegang aan
              </a>
            </CardContent>
          </Card>
        ) : (
          <>
            <details className="mb-3 rounded-lg border px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">
                Kennisbank · zoek zelf een oplossing
              </summary>
              <div className="mt-3">
                <SupportKnowledge />
              </div>
            </details>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="portal-account"
                  className="text-sm font-semibold"
                >
                  Organisatie
                </label>
                <select
                  id="portal-account"
                  className={inputStyle}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.customer_id}>
                      {a.customer_label}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => setNewOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nieuw ticket
              </Button>
            </div>
            {errorText && (
              <p
                role="alert"
                className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {errorText}
              </p>
            )}
            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Mijn tickets</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {tickets.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[65vh] space-y-2 overflow-y-auto">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">
                      Tickets laden...
                    </p>
                  ) : tickets.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center">
                      <LifeBuoy className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                      <p className="font-semibold">Nog geen tickets</p>
                      <p className="text-sm text-muted-foreground">
                        Maak een ticket om hulp te vragen.
                      </p>
                    </div>
                  ) : (
                    tickets.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => openTicket(t)}
                        className={
                          "w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/40 " +
                          (selected?.id === t.id
                            ? "border-primary bg-primary/5"
                            : "border-border")
                        }
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-primary">
                            {ticketNumber(t.ticket_no)}
                          </span>
                          <span
                            className={
                              "rounded-full px-2 py-1 text-xs font-medium " +
                              statusBadge[t.status]
                            }
                          >
                            {ticketStatuses[t.status]}
                          </span>
                        </div>
                        <p className="font-semibold text-sm break-words">
                          {t.subject}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatTicketDate(t.last_activity_at)} ·{" "}
                          {ticketCategories[t.category] ?? "Overig"}
                        </p>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="min-w-0">
                {!selected ? (
                  <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                    <LifeBuoy className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-semibold">Selecteer een ticket</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Bekijk het gesprek en voeg eventueel extra informatie toe.
                    </p>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader>
                      <p className="text-sm font-semibold text-primary">
                        {ticketNumber(selected.ticket_no)}
                      </p>
                      <CardTitle className="break-words">
                        {selected.subject}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span
                          className={
                            "rounded-full px-2 py-1 " +
                            statusBadge[selected.status]
                          }
                        >
                          {ticketStatuses[selected.status]}
                        </span>
                        <span>
                          {ticketCategories[selected.category] ??
                            selected.category}
                        </span>
                        <span>
                          Prioriteit: {ticketPriorities[selected.priority]}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0">
                      <div className="grid items-start gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
                        <aside
                          className="space-y-4 rounded-xl border bg-muted/20 p-4"
                          aria-label="Ticketgegevens"
                        >
                          <h3 className="text-sm font-semibold">
                            Ticketgegevens
                          </h3>
                          <dl className="space-y-3 text-sm">
                            <div>
                              <dt className="text-xs text-muted-foreground">
                                Behandelgroep
                              </dt>
                              <dd className="mt-1 break-words font-medium">
                                {treatmentGroups[selected.treatment_group]}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">
                                Behandelaar
                              </dt>
                              <dd className="mt-1 break-words font-medium">
                                {selected.assigned_to || "Nog niet toegewezen"}
                              </dd>
                            </div>
                          </dl>
                          {selected.due_at && (
                            <p className="text-sm">
                              Streefdatum: {formatTicketDate(selected.due_at)}
                            </p>
                          )}
                          {selected.sla_label && (
                            <p className="text-sm">
                              Serviceafspraak: {selected.sla_label}
                            </p>
                          )}
                        </aside>
                        <Tabs
                          defaultValue="conversation"
                          key={"workspace-" + selected.id}
                          className="min-w-0"
                        >
                          <div className="overflow-x-auto border-b pb-2">
                            <TabsList className="w-max justify-start">
                              <TabsTrigger value="conversation">
                                Gesprek
                              </TabsTrigger>
                              <TabsTrigger value="attachments">
                                Bijlagen
                              </TabsTrigger>
                              <TabsTrigger value="history">
                                Historie
                              </TabsTrigger>
                            </TabsList>
                          </div>
                          <TabsContent
                            value="conversation"
                            className="space-y-4"
                          >
                            <TicketConversation
                              key={"conversation-" + selected.id}
                              ticket={selected}
                              messages={messages}
                              loading={loadingMessages}
                              userId={user?.id}
                            />
                            <div className="border-t pt-4">
                              {selected.status !== "gesloten" ? (
                                <form
                                  onSubmit={sendReply}
                                  className="space-y-2"
                                >
                                  <Label htmlFor="portal-reply">
                                    Aanvullende reactie
                                  </Label>
                                  <Textarea
                                    id="portal-reply"
                                    rows={3}
                                    maxLength={10000}
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    placeholder="Beschrijf wat je hebt geprobeerd of voeg informatie toe..."
                                  />
                                  <Button
                                    type="submit"
                                    disabled={replying || !reply.trim()}
                                  >
                                    <Send className="mr-2 h-4 w-4" />{" "}
                                    {replying
                                      ? "Opslaan..."
                                      : "Reactie versturen"}
                                  </Button>
                                </form>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Dit ticket is gesloten. Maak een nieuwe
                                  melding als je opnieuw hulp nodig hebt.
                                </p>
                              )}
                            </div>
                          </TabsContent>
                          <TabsContent value="attachments">
                            {user && (
                              <TicketAttachments
                                key={"attachments-" + selected.id}
                                ticketId={selected.id}
                                userId={user.id}
                                closed={selected.status === "gesloten"}
                              />
                            )}
                          </TabsContent>
                          <TabsContent value="history">
                            <TicketHistory
                              key={"history-" + selected.id}
                              ticketId={selected.id}
                              version={selected.updated_at}
                            />
                          </TabsContent>
                        </Tabs>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </>
        )}

        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuw supportticket</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={createTicket}>
              <div className="space-y-2">
                <Label htmlFor="ticket-subject">Onderwerp *</Label>
                <Input
                  id="ticket-subject"
                  required
                  minLength={3}
                  maxLength={160}
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  placeholder="Bijv. Outlook synchroniseert niet"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ticket-category">Categorie</Label>
                  <select
                    id="ticket-category"
                    className={inputStyle}
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  >
                    {Object.entries(ticketCategories).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket-priority">Urgentie</Label>
                  <select
                    id="ticket-priority"
                    className={inputStyle}
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        priority: e.target.value as TicketPriority,
                      }))
                    }
                  >
                    {Object.entries(ticketPriorities).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-desc">Omschrijving *</Label>
                <Textarea
                  id="ticket-desc"
                  required
                  minLength={10}
                  maxLength={10000}
                  rows={6}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Wat gaat er mis? Wanneer begon het? Wat heb je al geprobeerd?"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Na het aanmaken kun je screenshots of andere bijlagen toevoegen.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewOpen(false)}
                >
                  Annuleren
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Ticket opslaan..." : "Ticket aanmaken"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
