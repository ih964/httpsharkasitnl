import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Eye, Search, ShieldCheck } from "lucide-react";

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

const riskLabel = (risk?: string) => risk === "high" ? "Hoog" : risk === "medium" ? "Middel" : "Laag";

export default function AdminScans() {
  const [leads, setLeads] = useState<ScanLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
    const client = supabase as any;
    const { error } = await client.from("assessment_leads").update({ status }).eq("id", id);
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
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((lead) => lead.status === "new").length,
    qualified: leads.filter((lead) => lead.status === "qualified").length,
    highRisk: leads.filter((lead) => lead.assessment_runs[0]?.risk_level === "high").length,
  }), [leads]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">IT-scans & leads</h1>
        <p className="mt-1 text-muted-foreground">Beheer scanresultaten en commerciële opvolging vanuit één overzicht.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Totaal</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Nieuwe leads</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.new}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Gekwalificeerd</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.qualified}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Hoog risico</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.highRisk}</CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek bedrijf, contact of e-mail..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Alle statussen" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alle statussen</SelectItem>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
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
                return <TableRow key={lead.id}>
                  <TableCell><div className="font-medium">{lead.company_name}</div><div className="text-xs text-muted-foreground">{lead.employee_count ? `${lead.employee_count} medewerkers` : "Omvang onbekend"}</div></TableCell>
                  <TableCell><div>{lead.contact_name}</div><a className="text-xs text-primary hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a></TableCell>
                  <TableCell className="font-semibold">{run ? `${run.total_score}/100` : "—"}</TableCell>
                  <TableCell>{run ? riskLabel(run.risk_level) : "—"}</TableCell>
                  <TableCell>{lead.follow_up_at ? <span className="inline-flex items-center gap-1 text-sm"><CalendarClock className="h-4 w-4 text-primary" />{new Intl.DateTimeFormat("nl-NL", { dateStyle: "short", timeStyle: "short" }).format(new Date(lead.follow_up_at))}</span> : <span className="text-sm text-muted-foreground">Niet gepland</span>}</TableCell>
                  <TableCell>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lead.created_at))}</TableCell>
                  <TableCell><Select value={lead.status} onValueChange={(value) => void updateStatus(lead.id, value as ScanLead["status"])}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select></TableCell>
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
