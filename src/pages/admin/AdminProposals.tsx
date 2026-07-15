import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Eye, FileText, MailCheck, Search, ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  classifyProposalValidity,
  formatProposalStatus,
  formatProposalValidity,
  getAllowedProposalTransitions,
  isProposalOutcomeStatus,
  type ProposalStatus,
  type ProposalValidity,
} from "@/lib/assessmentProposalOverview";

type ProposalLead = {
  company_name: string;
  contact_name: string;
  email: string;
  status: string;
  customer_id: string | null;
};

type ProposalRow = {
  id: string;
  lead_id: string;
  customer_id: string | null;
  title: string;
  status: ProposalStatus;
  subtotal: number;
  vat_total: number;
  total: number;
  valid_until: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  sent_to: string | null;
  follow_up_at: string | null;
  responded_at: string | null;
  updated_at: string;
  assessment_leads: ProposalLead | ProposalLead[] | null;
};

const proposalStatuses: Array<{ value: ProposalStatus; label: string }> = [
  { value: "draft", label: "Concept" },
  { value: "reviewed", label: "Gecontroleerd" },
  { value: "approved", label: "Goedgekeurd" },
  { value: "sent", label: "Verzonden" },
  { value: "accepted", label: "Geaccepteerd" },
  { value: "rejected", label: "Geweigerd" },
];

const internalStatusValues: ProposalStatus[] = ["draft", "reviewed", "approved"];

const validityFilters: Array<{ value: "all" | ProposalValidity; label: string }> = [
  { value: "all", label: "Alle geldigheid" },
  { value: "expired", label: "Verlopen" },
  { value: "expiring", label: "Binnen 7 dagen" },
  { value: "valid", label: "Geldig" },
  { value: "no-date", label: "Geen datum" },
];

const formatCurrency = (value: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
}).format(value);

const getLead = (proposal: ProposalRow): ProposalLead | null => {
  if (Array.isArray(proposal.assessment_leads)) return proposal.assessment_leads[0] ?? null;
  return proposal.assessment_leads;
};

export default function AdminProposals() {
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProposalStatus>("all");
  const [validityFilter, setValidityFilter] = useState<"all" | ProposalValidity>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const client = supabase as any;
    const { data, error } = await client
      .from("assessment_proposal_drafts")
      .select("id,lead_id,customer_id,title,status,subtotal,vat_total,total,valid_until,reviewed_at,approved_at,sent_at,sent_to,follow_up_at,responded_at,updated_at,assessment_leads(company_name,contact_name,email,status,customer_id)")
      .order("updated_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
      setProposals([]);
    } else {
      setProposals((data ?? []) as ProposalRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateInternalStatus = async (proposal: ProposalRow, status: ProposalStatus) => {
    if (proposal.status === status || !internalStatusValues.includes(status)) return;
    setUpdatingId(proposal.id);
    const client = supabase as any;
    const { data, error } = await client.rpc("update_assessment_proposal_lifecycle", {
      p_proposal_id: proposal.id,
      p_status: status,
      p_sent_to: null,
      p_follow_up_at: null,
      p_response_note: null,
    });
    setUpdatingId(null);

    if (error) {
      toast({ title: "Offertestatus niet opgeslagen", description: error.message, variant: "destructive" });
      return;
    }

    const result = (Array.isArray(data) ? data[0] : data) as Partial<ProposalRow> | null;
    setProposals((current) => current.map((item) => item.id === proposal.id ? {
      ...item,
      ...result,
      status,
      updated_at: result?.updated_at ?? new Date().toISOString(),
    } : item));
    toast({ title: `Offerte gemarkeerd als ${formatProposalStatus(status).toLowerCase()}` });
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return proposals.filter((proposal) => {
      const lead = getLead(proposal);
      const matchesSearch = !query || [
        proposal.title,
        lead?.company_name ?? "",
        lead?.contact_name ?? "",
        lead?.email ?? "",
        proposal.sent_to ?? "",
      ].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
      const matchesValidity = validityFilter === "all" || classifyProposalValidity(proposal.valid_until) === validityFilter;
      return matchesSearch && matchesStatus && matchesValidity;
    });
  }, [proposals, search, statusFilter, validityFilter]);

  const stats = useMemo(() => ({
    total: proposals.length,
    draft: proposals.filter((item) => item.status === "draft").length,
    approved: proposals.filter((item) => item.status === "approved").length,
    sent: proposals.filter((item) => item.status === "sent").length,
    accepted: proposals.filter((item) => item.status === "accepted").length,
    rejected: proposals.filter((item) => item.status === "rejected").length,
    value: proposals.reduce((sum, item) => sum + Number(item.total || 0), 0),
  }), [proposals]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Offertes</h1>
        <p className="mt-1 text-muted-foreground">Beheer interne controle, handmatige verzending, opvolging en klantreacties. Vanuit dit scherm wordt niets automatisch verstuurd.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Totaal</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Concept</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.draft}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Goedgekeurd</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.approved}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><MailCheck className="h-4 w-4" />Verzonden</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.sent}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><ThumbsUp className="h-4 w-4" />Geaccepteerd</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.accepted}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><ThumbsDown className="h-4 w-4" />Geweigerd</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.rejected}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Totale waarde</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(stats.value)}</CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek offerte, bedrijf, contact, e-mail of ontvanger..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | ProposalStatus)}>
          <SelectTrigger className="w-full lg:w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alle statussen</SelectItem>{proposalStatuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={validityFilter} onValueChange={(value) => setValidityFilter(value as "all" | ProposalValidity)}>
          <SelectTrigger className="w-full lg:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{validityFilters.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-b-2 border-primary" /></div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-600" />
              <div><p className="font-semibold">Offerteopslag is nog niet beschikbaar</p><p className="mt-1 max-w-xl text-sm text-muted-foreground">De editor en PDF werken wel. Voor dit centrale overzicht en de lifecycle moeten de nog niet uitgevoerde offertemigraties eerst later expliciet worden goedgekeurd.</p></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground"><FileText className="h-10 w-10" /><p>Geen offertes gevonden voor deze filters.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Bedrijf</TableHead><TableHead>Offerte</TableHead><TableHead>Bedrag</TableHead><TableHead>Status</TableHead><TableHead>Opvolging</TableHead><TableHead>Geldigheid</TableHead><TableHead className="text-right">Acties</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((proposal) => {
                const lead = getLead(proposal);
                const validity = classifyProposalValidity(proposal.valid_until);
                const allowedInternal = proposalStatuses.filter((item) =>
                  internalStatusValues.includes(item.value) && getAllowedProposalTransitions(proposal.status).includes(item.value),
                );
                return <TableRow key={proposal.id}>
                  <TableCell><div className="font-medium">{lead?.company_name ?? "Onbekend bedrijf"}</div><div className="text-xs text-muted-foreground">{lead?.contact_name ?? "Geen contact"}{lead?.customer_id ? " · klant" : " · lead"}</div></TableCell>
                  <TableCell><div className="font-medium">{proposal.title}</div><div className="text-xs text-muted-foreground">Bijgewerkt {new Intl.DateTimeFormat("nl-NL", { dateStyle: "short", timeStyle: "short" }).format(new Date(proposal.updated_at))}</div></TableCell>
                  <TableCell><div className="font-semibold">{formatCurrency(Number(proposal.total))}</div><div className="text-xs text-muted-foreground">Excl. btw {formatCurrency(Number(proposal.subtotal))}</div></TableCell>
                  <TableCell>{proposal.status === "sent" || isProposalOutcomeStatus(proposal.status) ? <div><div className="font-medium">{formatProposalStatus(proposal.status)}</div>{proposal.sent_to ? <div className="text-xs text-muted-foreground">{proposal.sent_to}</div> : null}</div> : <Select disabled={updatingId === proposal.id} value={proposal.status} onValueChange={(value) => void updateInternalStatus(proposal, value as ProposalStatus)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{allowedInternal.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>}</TableCell>
                  <TableCell>{proposal.status === "sent" ? proposal.follow_up_at ? <div className="inline-flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 text-primary" /><div>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(proposal.follow_up_at))}</div></div> : <span className="text-sm text-muted-foreground">Niet gepland</span> : proposal.responded_at ? <span className="text-sm">Reactie {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(new Date(proposal.responded_at))}</span> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{proposal.valid_until ? <div className="inline-flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 text-primary" /><div><div>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(new Date(`${proposal.valid_until}T00:00:00`))}</div><div className={`text-xs ${validity === "expired" ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{formatProposalValidity(proposal.valid_until)}</div></div></div> : <span className="text-sm text-muted-foreground">Geen datum</span>}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Link to={`/admin/offertes/${proposal.id}`} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Eye className="h-4 w-4" /> Open offerte</Link><Link to={`/admin/scans/${proposal.lead_id}`} className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Bronlead</Link></div></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
