import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Eye, FileCheck2, FileText, Search } from "lucide-react";
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
  updated_at: string;
  assessment_leads: ProposalLead | ProposalLead[] | null;
};

const proposalStatuses: Array<{ value: ProposalStatus; label: string }> = [
  { value: "draft", label: "Concept" },
  { value: "reviewed", label: "Gecontroleerd" },
  { value: "approved", label: "Goedgekeurd" },
];

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
      .select("id,lead_id,customer_id,title,status,subtotal,vat_total,total,valid_until,reviewed_at,approved_at,updated_at,assessment_leads(company_name,contact_name,email,status,customer_id)")
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

  const updateStatus = async (proposal: ProposalRow, status: ProposalStatus) => {
    if (proposal.status === status) return;
    setUpdatingId(proposal.id);
    const client = supabase as any;
    const { data, error } = await client.rpc("update_assessment_proposal_status", {
      p_proposal_id: proposal.id,
      p_status: status,
    });
    setUpdatingId(null);

    if (error) {
      toast({ title: "Offertestatus niet opgeslagen", description: error.message, variant: "destructive" });
      return;
    }

    const result = (Array.isArray(data) ? data[0] : data) as Partial<ProposalRow> | null;
    setProposals((current) => current.map((item) => item.id === proposal.id ? {
      ...item,
      status,
      reviewed_at: result?.reviewed_at ?? (status === "reviewed" || status === "approved" ? item.reviewed_at ?? new Date().toISOString() : null),
      approved_at: result?.approved_at ?? (status === "approved" ? new Date().toISOString() : null),
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
      ].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
      const matchesValidity = validityFilter === "all" || classifyProposalValidity(proposal.valid_until) === validityFilter;
      return matchesSearch && matchesStatus && matchesValidity;
    });
  }, [proposals, search, statusFilter, validityFilter]);

  const stats = useMemo(() => ({
    total: proposals.length,
    draft: proposals.filter((item) => item.status === "draft").length,
    reviewed: proposals.filter((item) => item.status === "reviewed").length,
    approved: proposals.filter((item) => item.status === "approved").length,
    expired: proposals.filter((item) => classifyProposalValidity(item.valid_until) === "expired").length,
    value: proposals.reduce((sum, item) => sum + Number(item.total || 0), 0),
  }), [proposals]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Offertes</h1>
        <p className="mt-1 text-muted-foreground">Beheer interne concepten, controles en goedkeuringen. Vanuit dit scherm wordt niets verstuurd.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Totaal</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Concept</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.draft}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><FileCheck2 className="h-4 w-4" />Gecontroleerd</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.reviewed}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Goedgekeurd</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.approved}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" />Verlopen</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.expired}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Totale waarde</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(stats.value)}</CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek offerte, bedrijf, contact of e-mail..." className="pl-9" />
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
              <div><p className="font-semibold">Offerteopslag is nog niet beschikbaar</p><p className="mt-1 max-w-xl text-sm text-muted-foreground">De editor en PDF werken wel. Voor dit centrale overzicht moeten de nog niet uitgevoerde offertemigraties eerst later expliciet worden goedgekeurd.</p></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground"><FileText className="h-10 w-10" /><p>Geen offertes gevonden voor deze filters.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Bedrijf</TableHead><TableHead>Offerte</TableHead><TableHead>Bedrag</TableHead><TableHead>Geldigheid</TableHead><TableHead>Bijgewerkt</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Bron</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((proposal) => {
                const lead = getLead(proposal);
                const validity = classifyProposalValidity(proposal.valid_until);
                return <TableRow key={proposal.id}>
                  <TableCell><div className="font-medium">{lead?.company_name ?? "Onbekend bedrijf"}</div><div className="text-xs text-muted-foreground">{lead?.contact_name ?? "Geen contact"}{lead?.customer_id ? " · klant" : " · lead"}</div></TableCell>
                  <TableCell><div className="font-medium">{proposal.title}</div><div className="text-xs text-muted-foreground">Excl. btw {formatCurrency(Number(proposal.subtotal))}</div></TableCell>
                  <TableCell className="font-semibold">{formatCurrency(Number(proposal.total))}</TableCell>
                  <TableCell>{proposal.valid_until ? <div className="inline-flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 text-primary" /><div><div>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(new Date(`${proposal.valid_until}T00:00:00`))}</div><div className={`text-xs ${validity === "expired" ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{formatProposalValidity(proposal.valid_until)}</div></div></div> : <span className="text-sm text-muted-foreground">Geen datum</span>}</TableCell>
                  <TableCell>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(proposal.updated_at))}</TableCell>
                  <TableCell><Select disabled={updatingId === proposal.id} value={proposal.status} onValueChange={(value) => void updateStatus(proposal, value as ProposalStatus)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{proposalStatuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></TableCell>
                  <TableCell className="text-right"><Link to={`/admin/scans/${proposal.lead_id}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"><Eye className="h-4 w-4" /> Open lead</Link></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
