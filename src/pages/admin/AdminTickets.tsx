import TicketConversation from "@/components/support/TicketConversation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SupportMailbox from "@/components/support/SupportMailbox";
import { useEffect, useMemo, useState } from "react";
import { supabase, portalSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Clock3,
  ExternalLink,
  LifeBuoy,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
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
  TicketStatus,
} from "@/lib/support";

import TicketHistory from "@/components/support/TicketHistory";
import SupportKnowledge from "@/components/support/SupportKnowledge";
import TicketMailStatus from "@/components/support/TicketMailStatus";
import {
  treatmentGroups,
  isOpenTicket,
  isOverdue,
  replyTemplates,
} from "@/lib/support";

type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
};
const selectStyle =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

export default function AdminTickets() {
  const { user } = useAuth();
  const ownAssignee = user?.email?.toLowerCase() ?? "";
  const [tab, setTab] = useState<
    "tickets" | "toegang" | "kennisbank" | "mailbox"
  >("tickets");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [access, setAccess] = useState<PortalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"alle" | TicketStatus>("alle");
  const [groupFilter, setGroupFilter] = useState("alle");
  const [queueFilter, setQueueFilter] = useState("open");
  const [sortOrder, setSortOrder] = useState("priority");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replying, setReplying] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [granting, setGranting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const names = useMemo(
    () =>
      Object.fromEntries(
        customers.map((c) => [c.id, c.company_name?.trim() || c.name]),
      ),
    [customers],
  );

  const reload = async () => {
    setLoading(true);
    setErrorText("");
    const [ticketResult, accessResult, customerResult] = await Promise.all([
      portalSupabase
        .from("support_tickets")
        .select("*")
        .order("last_activity_at", { ascending: false })
        .limit(500),
      portalSupabase
        .from("support_portal_access")
        .select("*")
        .order("customer_label"),
      supabase
        .from("customers")
        .select("id,name,company_name,email")
        .order("name"),
    ]);
    const failures = [
      ticketResult.error?.message,
      accessResult.error?.message,
      customerResult.error?.message,
    ].filter(Boolean);
    if (failures.length)
      setErrorText(
        "Niet alle supportgegevens konden worden opgehaald: " +
          failures.join("; "),
      );
    if (!ticketResult.error) {
      const rows = (ticketResult.data ?? []) as SupportTicket[];
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
    if (!accessResult.error)
      setAccess((accessResult.data ?? []) as PortalAccess[]);
    if (!customerResult.error) {
      const rows = (customerResult.data ?? []) as Customer[];
      setCustomers(rows);
      setNewCustomerId((current) => current || rows[0]?.id || "");
    }
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const loadMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    const { data, error } = await portalSupabase
      .from("support_ticket_messages")
      .select("id,ticket_id,author_id,sender_type,body,is_internal,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at");
    if (error)
      toast({
        title: "Reacties ophalen mislukt",
        description: error.message,
        variant: "destructive",
      });
    else setMessages((data ?? []) as TicketMessage[]);
    setLoadingMessages(false);
  };

  useEffect(() => {
    if (selected?.id) void loadMessages(selected.id);
  }, [selected?.id]);

  const openTicket = (ticket: SupportTicket) => {
    setSelected(ticket);
    setReply("");
    setIsInternal(false);
    setMessages([]);
  };

  const saveField = async (
    changes: Partial<
      Pick<
        SupportTicket,
        | "status"
        | "priority"
        | "assigned_to"
        | "treatment_group"
        | "due_at"
        | "sla_label"
      >
    >,
  ) => {
    if (!selected || savingTicket) return;
    setSavingTicket(true);
    const { data, error } = await portalSupabase
      .from("support_tickets")
      .update(changes)
      .eq("id", selected.id)
      .select("*")
      .single();
    setSavingTicket(false);
    if (error || !data) {
      toast({
        title: "Wijziging mislukt",
        description: error?.message,
        variant: "destructive",
      });
      return;
    }
    const updated = data as SupportTicket;
    // Any customer-visible field change (status, priority, assignee) queues mail for both parties.
    if (
      Object.entries(changes).some(
        ([field, next]) =>
          (selected as unknown as Record<string, unknown>)[field] !== next,
      )
    ) {
      void notifySupportChange(updated.id);
    }
    setSelected(updated);
    setTickets((list) => list.map((t) => (t.id === updated.id ? updated : t)));
    toast({ title: "Ticket bijgewerkt" });
  };

  const addReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !user || !reply.trim() || replying) return;
    setReplying(true);
    const { error } = await portalSupabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: selected.id,
        author_id: user.id,
        sender_type: "medewerker",
        body: reply.trim().slice(0, 10000),
        is_internal: isInternal,
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
    // Internal notes stay private and never cause a customer notification.
    if (!isInternal) void notifySupportChange(selected.id);
    setIsInternal(false);
    await Promise.all([loadMessages(selected.id), reload()]);
    toast({
      title: "Reactie opgeslagen",
      description: isInternal
        ? "Alleen zichtbaar voor medewerkers."
        : "Zichtbaar in het klantenportaal.",
    });
  };

  const addAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCustomerId || !newEmail.trim() || granting) return;
    const customer = customers.find((c) => c.id === newCustomerId);
    if (!customer) return;
    setGranting(true);
    const address = newEmail.trim().toLowerCase();
    const { error } = await portalSupabase
      .from("support_portal_access")
      .insert({
        customer_id: customer.id,
        customer_label: customer.company_name?.trim() || customer.name,
        email: address,
      });
    setGranting(false);
    if (error) {
      toast({
        title: "Toegang verlenen mislukt",
        description:
          error.code === "23505"
            ? "Dit e-mailadres heeft al toegang voor deze klant."
            : error.message,
        variant: "destructive",
      });
      return;
    }
    setNewEmail("");
    toast({
      title: "Toegang verleend",
      description: address + " kan met een inloglink tickets indienen.",
    });
    void reload();
  };

  const removeAccess = async (entry: PortalAccess) => {
    if (
      !window.confirm(
        "Toegang voor " +
          entry.email +
          " bij " +
          entry.customer_label +
          " intrekken?",
      )
    )
      return;
    setRemovingId(entry.id);
    const { error } = await portalSupabase
      .from("support_portal_access")
      .delete()
      .eq("id", entry.id);
    setRemovingId(null);
    if (error)
      toast({
        title: "Toegang intrekken mislukt",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Toegang ingetrokken" });
      void reload();
    }
  };

  const filtered = useMemo(
    () =>
      tickets
        .filter((t) => {
          if (groupFilter !== "alle" && t.treatment_group !== groupFilter)
            return false;
          if (queueFilter === "open" && !isOpenTicket(t)) return false;
          if (
            queueFilter === "unassigned" &&
            (!isOpenTicket(t) || t.assigned_to)
          )
            return false;
          if (
            queueFilter === "mine" &&
            (!isOpenTicket(t) ||
              !ownAssignee ||
              t.assigned_to?.toLowerCase() !== ownAssignee)
          )
            return false;
          if (queueFilter === "overdue" && !isOverdue(t)) return false;
          if (filter !== "alle" && t.status !== filter) return false;
          const haystack = [
            t.subject,
            ticketNumber(t.ticket_no),
            names[t.customer_id] ?? "",
            t.requester_email,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query.trim().toLowerCase());
        })
        .sort((a, b) => {
          if (sortOrder === "due")
            return (
              (a.due_at ? Date.parse(a.due_at) : Infinity) -
              (b.due_at ? Date.parse(b.due_at) : Infinity)
            );
          if (sortOrder === "priority") {
            const rank = { spoed: 0, hoog: 1, normaal: 2, laag: 3 };
            return (
              rank[a.priority] - rank[b.priority] ||
              Date.parse(a.created_at) - Date.parse(b.created_at)
            );
          }
          return (
            Date.parse(b.last_activity_at) - Date.parse(a.last_activity_at)
          );
        }),
    [
      tickets,
      filter,
      query,
      names,
      groupFilter,
      queueFilter,
      sortOrder,
      ownAssignee,
    ],
  );

  const count = (status: TicketStatus) =>
    tickets.filter((t) => t.status === status).length;

  return (
    <div className="mx-auto max-w-[1680px] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-primary">
            Servicedesk
          </p>
          <h1 className="font-heading text-2xl font-bold">Supporttickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Beheer meldingen en geef klanten beveiligde toegang tot hun eigen
            tickets.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void reload()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Verversen
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="/support" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Klantenportaal
            </a>
          </Button>
        </div>
      </div>
      {errorText && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" /> {errorText}
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <Button
          variant={tab === "tickets" ? "default" : "ghost"}
          onClick={() => setTab("tickets")}
        >
          <LifeBuoy className="mr-2 h-4 w-4" /> Meldingen
        </Button>
        <Button
          variant={tab === "toegang" ? "default" : "ghost"}
          onClick={() => setTab("toegang")}
        >
          <Users className="mr-2 h-4 w-4" /> Klanttoegang
        </Button>
        <Button
          variant={tab === "kennisbank" ? "default" : "ghost"}
          onClick={() => setTab("kennisbank")}
        >
          Kennisbank
        </Button>
        <Button
          variant={tab === "mailbox" ? "default" : "ghost"}
          onClick={() => setTab("mailbox")}
        >
          Mailbox & intake
        </Button>
      </div>

      {tab === "mailbox" && <SupportMailbox />}
      {tab === "kennisbank" && <SupportKnowledge isStaff />}
      {tab === "tickets" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["nieuw", "Nieuwe tickets"],
                ["in_behandeling", "In behandeling"],
                ["wacht_op_klant", "Wacht op klant"],
                ["opgelost", "Opgelost"],
              ] as [TicketStatus, string][]
            ).map(([status, label]) => (
              <button
                type="button"
                key={status}
                onClick={() => {
                  setQueueFilter("all");
                  setFilter((current) =>
                    current === status ? "alle" : status,
                  );
                }}
                className={
                  "flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2 text-left transition-colors hover:bg-muted/40 " +
                  (filter === status ? "border-primary" : "border-border")
                }
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  {label}
                </p>
                <p className="text-xl font-bold">{count(status)}</p>
              </button>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
            <Card className="min-w-0">
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center justify-between">
                  Ticketoverzicht{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {filtered.length}
                  </span>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    aria-label="Tickets zoeken"
                    className="pl-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Zoek op nummer, klant, onderwerp..."
                  />
                </div>
                <select
                  aria-label="Statusfilter"
                  className={selectStyle}
                  value={filter}
                  onChange={(e) => {
                    setQueueFilter("all");
                    setFilter(e.target.value as "alle" | TicketStatus);
                  }}
                >
                  <option value="alle">Alle statussen</option>
                  {Object.entries(ticketStatuses).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Werkvoorraad"
                  className={selectStyle}
                  value={queueFilter}
                  onChange={(e) => {
                    setQueueFilter(e.target.value);
                    setFilter("alle");
                  }}
                >
                  <option value="open">Open werkvoorraad</option>
                  <option value="mine">Mijn werkvoorraad</option>
                  <option value="unassigned">Nog niet toegewezen</option>
                  <option value="overdue">Streefdatum verstreken</option>
                  <option value="all">Alle meldingen</option>
                </select>
                <select
                  aria-label="Behandelgroepfilter"
                  className={selectStyle}
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                >
                  <option value="alle">Alle behandelgroepen</option>
                  {Object.entries(treatmentGroups).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Sortering"
                  className={selectStyle}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="priority">
                    Prioriteit, daarna oudste eerst
                  </option>
                  <option value="due">Streefdatum</option>
                  <option value="activity">Laatste activiteit</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Maximaal 500 recent actieve tickets. Streefdatums zijn
                  planningsdoelen; contractuele SLA's gelden alleen volgens
                  afspraak.
                </p>
              </CardHeader>
              <CardContent className="max-h-[65vh] space-y-2 overflow-auto">
                {loading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />{" "}
                    Laden...
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Geen tickets gevonden.
                  </p>
                ) : (
                  filtered.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openTicket(t)}
                      className={
                        "w-full rounded-xl border p-3 text-left transition hover:bg-muted/40 " +
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
                      <p className="text-sm font-semibold break-words">
                        {t.subject}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ticketPriorities[t.priority]} ·{" "}
                        {treatmentGroups[t.treatment_group]} ·{" "}
                        {t.assigned_to || "Niet toegewezen"}
                      </p>
                      {t.due_at && (
                        <p
                          className={
                            "mt-1 text-xs " +
                            (isOverdue(t)
                              ? "text-destructive font-semibold"
                              : "text-muted-foreground")
                          }
                        >
                          {isOverdue(t)
                            ? "Streefdatum verstreken: "
                            : "Streefdatum: "}
                          {formatTicketDate(t.due_at)}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{names[t.customer_id] ?? "Klant"}</span>
                        <span>·</span>
                        <span>{formatTicketDate(t.last_activity_at)}</span>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0">
              {!selected ? (
                <CardContent className="flex min-h-[360px] flex-col items-center justify-center text-center">
                  <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground" />
                  <h2 className="font-semibold">Selecteer een ticket</h2>
                  <p className="text-sm text-muted-foreground">
                    Hier kun je de melding oppakken en reageren.
                  </p>
                </CardContent>
              ) : (
                <>
                  <CardHeader className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-primary">
                        {ticketNumber(selected.ticket_no)}
                      </span>
                      <span
                        className={
                          "rounded-full px-2 py-1 text-xs font-medium " +
                          statusBadge[selected.status]
                        }
                      >
                        {ticketStatuses[selected.status]}
                      </span>
                    </div>
                    <CardTitle className="break-words">
                      {selected.subject}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {names[selected.customer_id] ?? "Klant"} ·{" "}
                      {selected.requester_email} ·{" "}
                      {formatTicketDate(selected.created_at)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
                      <aside
                        className="space-y-4 rounded-xl border bg-muted/20 p-4"
                        aria-label="Ticketgegevens"
                      >
                        <h3 className="text-sm font-semibold">
                          Ticketgegevens
                        </h3>
                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="admin-ticket-status">Status</Label>
                            <select
                              id="admin-ticket-status"
                              className={selectStyle}
                              disabled={savingTicket}
                              value={selected.status}
                              onChange={(e) =>
                                void saveField({
                                  status: e.target.value as TicketStatus,
                                })
                              }
                            >
                              {Object.entries(ticketStatuses).map(
                                ([key, label]) => (
                                  <option key={key} value={key}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="admin-ticket-priority">
                              Prioriteit
                            </Label>
                            <select
                              id="admin-ticket-priority"
                              className={selectStyle}
                              disabled={savingTicket}
                              value={selected.priority}
                              onChange={(e) =>
                                void saveField({
                                  priority: e.target.value as TicketPriority,
                                })
                              }
                            >
                              {Object.entries(ticketPriorities).map(
                                ([key, label]) => (
                                  <option key={key} value={key}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </div>
                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="ticket-group">Behandelgroep</Label>
                            <select
                              id="ticket-group"
                              disabled={savingTicket}
                              className={selectStyle}
                              value={selected.treatment_group}
                              onChange={(e) =>
                                void saveField({
                                  treatment_group: e.target.value,
                                })
                              }
                            >
                              {Object.entries(treatmentGroups).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ticket-due">
                              Streefdatum (lokale tijd)
                            </Label>
                            <Input
                              id="ticket-due"
                              type="datetime-local"
                              disabled={savingTicket}
                              key={selected.id + (selected.due_at ?? "")}
                              defaultValue={
                                selected.due_at
                                  ? new Date(
                                      Date.parse(selected.due_at) -
                                        new Date(
                                          selected.due_at,
                                        ).getTimezoneOffset() *
                                          60000,
                                    )
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              onBlur={(e) => {
                                if (
                                  e.target.value &&
                                  !Number.isFinite(
                                    new Date(e.target.value).getTime(),
                                  )
                                )
                                  return;
                                const value = e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : null;
                                if (
                                  value !==
                                  (selected.due_at
                                    ? new Date(selected.due_at).toISOString()
                                    : null)
                                )
                                  void saveField({ due_at: value });
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ticket-sla">
                            Serviceafspraak / SLA-referentie (optioneel)
                          </Label>
                          <Input
                            id="ticket-sla"
                            maxLength={160}
                            disabled={savingTicket}
                            key={selected.id + (selected.sla_label ?? "")}
                            defaultValue={selected.sla_label ?? ""}
                            placeholder="Alleen een daadwerkelijk overeengekomen afspraak"
                            onBlur={(e) => {
                              const v = e.target.value.trim() || null;
                              if (v !== selected.sla_label)
                                void saveField({ sla_label: v });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="admin-ticket-owner">
                            Behandelaar (optioneel)
                          </Label>
                          <Input
                            disabled={savingTicket}
                            maxLength={160}
                            id="admin-ticket-owner"
                            placeholder="Naam behandelaar"
                            key={selected.id + (selected.assigned_to ?? "")}
                            defaultValue={selected.assigned_to ?? ""}
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              if (next !== (selected.assigned_to ?? ""))
                                void saveField({ assigned_to: next || null });
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              savingTicket ||
                              !ownAssignee ||
                              selected.assigned_to === ownAssignee
                            }
                            onClick={() =>
                              void saveField({ assigned_to: ownAssignee })
                            }
                          >
                            Aan mij toewijzen
                          </Button>
                        </div>
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
                            <TabsTrigger value="history">Historie</TabsTrigger>{" "}
                            <TabsTrigger value="mail">E-mailstatus</TabsTrigger>
                          </TabsList>
                        </div>
                        <TabsContent value="conversation" className="space-y-4">
                          <TicketConversation
                            key={"conversation-" + selected.id}
                            ticket={selected}
                            messages={messages}
                            loading={loadingMessages}
                            userId={user?.id}
                            isStaff
                          />
                          <div className="border-t pt-3">
                            <form onSubmit={addReply} className="space-y-2">
                              <Label htmlFor="admin-ticket-reply">
                                Reactie toevoegen
                              </Label>
                              <select
                                aria-label="Standaardantwoord invoegen"
                                className={selectStyle}
                                value=""
                                onChange={(e) => {
                                  const text =
                                    replyTemplates[
                                      e.target
                                        .value as keyof typeof replyTemplates
                                    ];
                                  if (text)
                                    setReply((current) =>
                                      current ? current + "\n\n" + text : text,
                                    );
                                }}
                              >
                                <option value="">
                                  Voeg een standaardantwoord toe...
                                </option>
                                <option value="ontvangst">
                                  Ontvangst en onderzoek
                                </option>
                                <option value="informatie">
                                  Meer informatie nodig
                                </option>
                                <option value="leverancier">
                                  Wachten op leverancier
                                </option>
                                <option value="oplossing">
                                  Oplossing laten bevestigen
                                </option>
                              </select>
                              <p className="text-xs text-muted-foreground">
                                {isInternal
                                  ? "Alleen medewerkers zien deze notitie. Er wordt geen klantmail verstuurd."
                                  : "De klant ontvangt deze reactie ook per e-mail van support@harkasit.nl."}
                              </p>
                              <Textarea
                                id="admin-ticket-reply"
                                rows={3}
                                maxLength={10000}
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                placeholder={
                                  isInternal
                                    ? "Interne notitie, onzichtbaar voor de klant..."
                                    : "Typ je reactie voor de klant..."
                                }
                              />
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={isInternal}
                                    onCheckedChange={(value) =>
                                      setIsInternal(value === true)
                                    }
                                  />
                                  Interne notitie
                                </label>
                                <Button
                                  type="submit"
                                  disabled={!reply.trim() || replying}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  {replying
                                    ? "Opslaan..."
                                    : isInternal
                                      ? "Notitie opslaan"
                                      : "Reactie plaatsen"}
                                </Button>
                              </div>
                            </form>
                          </div>
                        </TabsContent>
                        <TabsContent value="attachments">
                          {user && (
                            <TicketAttachments
                              key={"attachments-" + selected.id}
                              ticketId={selected.id}
                              userId={user.id}
                              isStaff
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
                        <TabsContent value="mail">
                          <TicketMailStatus
                            key={"mail-" + selected.id}
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
      ) : tab === "toegang" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.3fr)]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" /> Klant toegang geven
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addAccess} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Alleen expliciet gekoppelde e-mailadressen kunnen tickets van
                  deze klant zien en indienen. Een klant logt in met een veilige
                  e-maillink.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="support-access-customer">Klant</Label>
                  <select
                    id="support-access-customer"
                    className={selectStyle}
                    required
                    value={newCustomerId}
                    onChange={(e) => {
                      setNewCustomerId(e.target.value);
                      const c = customers.find(
                        (item) => item.id === e.target.value,
                      );
                      setNewEmail(c?.email ?? "");
                    }}
                  >
                    <option value="">Kies een klant</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name?.trim() || c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-access-email">
                    E-mailadres van contactpersoon
                  </Label>
                  <Input
                    id="support-access-email"
                    type="email"
                    autoComplete="off"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="contact@klant.nl"
                  />
                </div>
                <Button
                  className="w-full"
                  type="submit"
                  disabled={!newCustomerId || granting || !newEmail.trim()}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />{" "}
                  {granting ? "Toegang opslaan..." : "Toegang verlenen"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  De klant kan daarna naar harkasit.nl/support en zelf een
                  inloglink aanvragen. Het e-mailadres wordt niet gebruikt om
                  toegang tot Harkas Admin te geven.
                </p>
              </form>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                Geautoriseerde contactpersonen{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {access.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{" "}
                  Laden...
                </p>
              ) : access.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Er zijn nog geen klantcontactpersonen gekoppeld. Geef hier de
                  eerste klant toegang.
                </p>
              ) : (
                access.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {entry.customer_label}
                      </p>
                      <p className="break-all text-sm text-muted-foreground">
                        {entry.email}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={"Toegang intrekken voor " + entry.email}
                      disabled={removingId === entry.id}
                      onClick={() => void removeAccess(entry)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
