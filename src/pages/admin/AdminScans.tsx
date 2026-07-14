import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CalendarClock, Eye, Search, ShieldCheck } from "lucide-react";
import { classifyFollowUp, formatFollowUpLabel, type FollowUpBucket } from "@/lib/assessmentFollowUp";

interface ScanLead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  employee_count: number | null;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  consent_marketing: boolean;
  follow_up_at: string | null;
  created_at: string;
  assessment_runs: Array<{
    id: string;
    total_score: number;
    risk_level: "low" | "medium" | "high";
    category_scores: Record<string, number>;
    created_at: string;
  }>;
}

const statuses = [
  { value: "new", label: "Nieuw" },
  { value: "contacted", label: "Benaderd" },
  { value: "qualified", label: "Gekwalificeerd" },
  { value: "won", label: "Klant" },
  { value: "lost", label: "Verloren" },
] as const;

const followUpFilters: Array<{ value: "all" | FollowUpBucket; label: string }> = [
  { value: "all", label: "Alle opvolging" },
  { value: "overdue", label: "Te laat" },
  { value: "today", label: "Vandaag" },
  { value: "upcoming", label: "Binnen 7 dagen" },
  { value: "later", label: "Later" },
  { value: "unscheduled", label: "Niet gepland" },
];

const riskLabel = (risk?: string) => risk === "high" ? "Hoog" : risk === "medium" ? "Middel" : "Laag";

export default function AdminScans() {
  const [leads, setLeads] = useState<ScanLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState<"all" | FollowUpBucket>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const client = supabase as any;
    const { data, error } = await client
      .from("assessment_leads")
      .select("id,company_name,contact_name,email,phone,employee_count,status,consent_marketing,follow_up_at,created_at,assessment_runs(id,total_score,risk_level,category_scores,created_at)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Scans konden niet worden geladen", description: error.message, variant: "destructive" });
    else setLeads((data ?? []) as ScanLead[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (id: string, status: ScanLead["status"]) => {
    setUpdatingId(id);
    const client = supabase as any;
    const { error } = await client.rpc("update_assessment_lead", {
      p_lead_id: id,
      p_status: status,
      p_notes: null,
      p_follow_up_at: null,
      p_update_status: true,
      p_update_follow_up: false,
    });
    setUpdatingId(null);
    if (error) {
      toast({ title: "Status niet opgeslagen", description: error.message, variant: "destructive" });
      return;
    }
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, status } : lead));
    toast({ title: "Leadstatus bijgewerkt" });
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch = !query || [lead.company_name, lead.contact_name, lead.email, lead.phone ?? ""].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesFollowUp = followUpFilter === "all" || classifyFollowUp(lead.follow_up_at) === followUpFilter;
      return matchesSearch && matchesStatus && matchesFollowUp;
    });
  }, [leads, search, statusFilter, followUpFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((lead) => lead.status === "new").length,
    overdue: leads.filter((lead) => classifyFollowUp(lead.follow_up_at) === "overdue").length,
    today: leads.filter((lead) => classifyFollowUp(lead.follow_up_at) === "today").length,
    upcoming: leads.filter((lead) => classifyFollowUp(lead.follow_up_at) === "upcoming").length,
  }), [leads]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">IT-scans & leads</h1>
        <p className="mt-1 text-muted-foreground">Beheer scanresultaten en commerciële opvolging vanuit één overzicht.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Totaal</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Nieuwe leads</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.new}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" />Te laat</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.overdue}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vandaag</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.today}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Binnen 7 dagen</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.upcoming}</CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek bedrijf, contact of e-mail..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alle statussen</SelectItem>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={followUpFilter} onValueChange={(value) => setFollowUpFilter(value as "all" | FollowUpBucket)}>
          <SelectTrigger className="w-full lg:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{followUpFilters.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex h-40 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-b-2 border-primary" /></div> : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground"><ShieldCheck className="h-10 w-10" /><p>Geen scanleads gevonden voor deze filters.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Bedrijf</TableHead><TableHead>Contact</TableHead><TableHead>Score</TableHead><TableHead>Risico</TableHead><TableHead>Opvolging</TableHead><TableHead>Datum</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Details</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((lead) => {
                const run = lead.assessment_runs?.[0];
                const followUpBucket = classifyFollowUp(lead.follow_up_at);
                return <TableRow key={lead.id}>
                  <TableCell><div className="font-medium">{lead.company_name}</div><div className="text-xs text-muted-foreground">{lead.employee_count ? `${lead.employee_count} medewerkers` : "Omvang onbekend"}</div></TableCell>
                  <TableCell><div>{lead.contact_name}</div><a className="text-xs text-primary hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a></TableCell>
                  <TableCell className="font-semibold">{run ? `${run.total_score}/100` : "—"}</TableCell>
                  <TableCell>{run ? riskLabel(run.risk_level) : "—"}</TableCell>
                  <TableCell>{lead.follow_up_at ? <div><span className="inline-flex items-center gap-1 text-sm"><CalendarClock className="h-4 w-4 text-primary" />{new Intl.DateTimeFormat("nl-NL", { dateStyle: "short", timeStyle: "short" }).format(new Date(lead.follow_up_at))}</span><div className={`mt-1 text-xs ${followUpBucket === "overdue" ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{formatFollowUpLabel(lead.follow_up_at)}</div></div> : <span className="text-sm text-muted-foreground">Niet gepland</span>}</TableCell>
                  <TableCell>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lead.created_at))}</TableCell>
                  <TableCell><Select disabled={updatingId === lead.id} value={lead.status} onValueChange={(value) => void updateStatus(lead.id, value as ScanLead["status"])}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select></TableCell>
                  <TableCell className="text-right"><Link to={`/admin/scans/${lead.id}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"><Eye className="h-4 w-4" /> Bekijk</Link></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
