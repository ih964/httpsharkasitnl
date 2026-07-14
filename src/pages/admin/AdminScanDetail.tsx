import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Activity, ArrowLeft, Building2, CalendarClock, CheckCircle2, Mail, Phone, Save, ShieldAlert, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssessmentProposalCard from "@/components/admin/AssessmentProposalCard";
import { useToast } from "@/hooks/use-toast";
import { formatAssessmentActivity, type AssessmentActivityEvent } from "@/lib/assessmentActivity";

type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

type ScanDetail = {
  id: string;
  customer_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  employee_count: number | null;
  status: LeadStatus;
  notes: string | null;
  follow_up_at: string | null;
  consent_report: boolean;
  consent_marketing: boolean;
  source: string;
  created_at: string;
  assessment_runs: Array<{
    id: string;
    total_score: number;
    risk_level: "low" | "medium" | "high";
    category_scores: Record<string, number>;
    recommendations: Array<{
      category: string;
      question_id: string;
      recommendation: string;
      answer_score: number;
    }>;
    created_at: string;
  }>;
};

const statuses: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "Nieuw" },
  { value: "contacted", label: "Benaderd" },
  { value: "qualified", label: "Gekwalificeerd" },
  { value: "won", label: "Klant" },
  { value: "lost", label: "Verloren" },
];

const riskLabel = (risk?: string) => risk === "high" ? "Hoog" : risk === "medium" ? "Middel" : "Laag";
const toLocalInputValue = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default function AdminScanDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const [lead, setLead] = useState<ScanDetail | null>(null);
  const [activities, setActivities] = useState<AssessmentActivityEvent[]>([]);
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const { toast } = useToast();

  const loadActivities = async (id: string) => {
    const client = supabase as any;
    const { data, error } = await client
      .from("assessment_audit_events")
      .select("id,event_type,metadata,created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) setActivities((data ?? []) as AssessmentActivityEvent[]);
  };

  useEffect(() => {
    const load = async () => {
      if (!leadId) return;
      setLoading(true);
      const client = supabase as any;
      const { data, error } = await client
        .from("assessment_leads")
        .select("id,customer_id,company_name,contact_name,email,phone,employee_count,status,notes,follow_up_at,consent_report,consent_marketing,source,created_at,assessment_runs(id,total_score,risk_level,category_scores,recommendations,created_at)")
        .eq("id", leadId)
        .single();

      if (error) {
        toast({ title: "Scan kon niet worden geladen", description: error.message, variant: "destructive" });
      } else {
        const result = data as ScanDetail;
        setLead(result);
        setNotes(result.notes ?? "");
        setFollowUpAt(toLocalInputValue(result.follow_up_at));
        await loadActivities(result.id);
      }
      setLoading(false);
    };

    void load();
  }, [leadId, toast]);

  const updateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    setSaving(true);
    const client = supabase as any;
    const { data, error } = await client.rpc("update_assessment_lead", {
      p_lead_id: lead.id,
      p_status: status,
      p_notes: null,
      p_follow_up_at: null,
      p_update_status: true,
      p_update_follow_up: false,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Status niet opgeslagen", description: error.message, variant: "destructive" });
      return;
    }

    const updated = (Array.isArray(data) ? data[0] : data) as ScanDetail | null;
    setLead(updated ? { ...lead, status: updated.status } : { ...lead, status });
    await loadActivities(lead.id);
    toast({ title: "Leadstatus bijgewerkt" });
  };

  const saveFollowUp = async () => {
    if (!lead) return;
    setSaving(true);
    const normalizedNotes = notes.trim() || null;
    const normalizedFollowUp = followUpAt ? new Date(followUpAt).toISOString() : null;
    const client = supabase as any;
    const { data, error } = await client.rpc("update_assessment_lead", {
      p_lead_id: lead.id,
      p_status: null,
      p_notes: normalizedNotes,
      p_follow_up_at: normalizedFollowUp,
      p_update_status: false,
      p_update_follow_up: true,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Opvolging niet opgeslagen", description: error.message, variant: "destructive" });
      return;
    }

    const updated = (Array.isArray(data) ? data[0] : data) as ScanDetail | null;
    setLead({
      ...lead,
      notes: updated?.notes ?? normalizedNotes,
      follow_up_at: updated?.follow_up_at ?? normalizedFollowUp,
    });
    await loadActivities(lead.id);
    toast({ title: "Opvolging opgeslagen" });
  };

  const convertToCustomer = async () => {
    if (!lead || lead.customer_id) return;
    if (!window.confirm(`Zet ${lead.company_name} om naar een klant? Bij een bestaand klantrecord met hetzelfde e-mailadres wordt die klant hergebruikt.`)) return;

    setConverting(true);
    const client = supabase as any;
    const { data, error } = await client.rpc("convert_assessment_lead_to_customer", {
      p_lead_id: lead.id,
    });
    setConverting(false);

    if (error) {
      toast({ title: "Omzetten naar klant is niet gelukt", description: error.message, variant: "destructive" });
      return;
    }

    const customerId = typeof data === "string" ? data : String(Array.isArray(data) ? data[0] : data ?? "");
    setLead({ ...lead, customer_id: customerId || null, status: "won" });
    await loadActivities(lead.id);
    toast({ title: "Lead omgezet naar klant", description: "Het klantrecord staat nu in het klantenoverzicht." });
  };

  if (loading) return <div className="flex min-h-[320px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!lead) return <div className="space-y-4"><p>Deze scanlead kon niet worden gevonden.</p><Link to="/admin/scans" className="text-primary hover:underline">Terug naar scans</Link></div>;

  const run = lead.assessment_runs?.[0];
  const categories = Object.entries(run?.category_scores ?? {});
  const recommendations = run?.recommendations ?? [];

  return (
    <div className="space-y-6">
      <Link to="/admin/scans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Terug naar scans</Link>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm text-muted-foreground">Scanlead</p>
          <h1 className="text-3xl font-heading font-bold">{lead.company_name}</h1>
          <p className="mt-1 text-muted-foreground">Ingediend op {new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(new Date(lead.created_at))}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <a href={`mailto:${lead.email}?subject=Uw%20IT%20Quick%20Scan`} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"><Mail className="h-4 w-4" /> E-mail</a>
          {lead.phone ? <a href={`tel:${lead.phone}`} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"><Phone className="h-4 w-4" /> Bellen</a> : null}
          {lead.customer_id ? (
            <Link to="/admin/customers" className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary"><CheckCircle2 className="h-4 w-4" /> Klant gekoppeld</Link>
          ) : (
            <button type="button" disabled={converting || saving} onClick={() => void convertToCustomer()} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"><UserPlus className="h-4 w-4" />{converting ? "Omzetten..." : "Omzetten naar klant"}</button>
          )}
          <Select disabled={saving || converting} value={lead.status} onValueChange={(value) => void updateStatus(value as LeadStatus)}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-5"><Building2 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Contactpersoon</p><p className="font-medium">{lead.contact_name}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Mail className="h-5 w-5 text-primary" /><div className="min-w-0"><p className="text-xs text-muted-foreground">E-mail</p><a href={`mailto:${lead.email}`} className="block truncate font-medium text-primary hover:underline">{lead.email}</a></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Phone className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Telefoon</p><p className="font-medium">{lead.phone ?? "Niet ingevuld"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Users className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Medewerkers</p><p className="font-medium">{lead.employee_count ?? "Onbekend"}</p></div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Scanresultaat</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div><p className="text-sm text-muted-foreground">Totaalscore</p><p className="text-5xl font-bold">{run?.total_score ?? 0}<span className="text-xl text-muted-foreground">/100</span></p></div>
              <div><p className="text-sm text-muted-foreground">Risiconiveau</p><p className="mt-1 inline-flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4 text-primary" />{riskLabel(run?.risk_level)}</p></div>
              <div><p className="text-sm text-muted-foreground">Rapportverwerking</p><p className="font-medium">{lead.consent_report ? "Toegestaan" : "Niet toegestaan"}</p></div>
              <div><p className="text-sm text-muted-foreground">Commerciële opvolging</p><p className="font-medium">{lead.consent_marketing ? "Toegestaan" : "Niet toegestaan"}</p></div>
              <div><p className="text-sm text-muted-foreground">Klantrecord</p><p className="font-medium">{lead.customer_id ? "Gekoppeld" : "Nog niet gekoppeld"}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Opvolging</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="followUpAt">Opvolgdatum</Label><Input id="followUpAt" type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="notes">Interne notities</Label><textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} rows={7} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" placeholder="Gesprek, behoefte, afgesproken vervolgstappen..." /></div>
              <button type="button" disabled={saving || converting} onClick={() => void saveFollowUp()} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Opslaan..." : "Opvolging opslaan"}</button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Scores per onderdeel</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {categories.map(([category, value]) => <div key={category} className="rounded-xl border p-4"><div className="flex justify-between font-medium"><span>{category}</span><span>{value}/100</span></div><div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} /></div></div>)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Aanbevelingen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recommendations.length === 0 ? <p className="text-muted-foreground">Geen aanbevelingen opgeslagen.</p> : recommendations.map((item, index) => <div key={`${item.question_id}-${index}`} className="rounded-xl bg-muted/50 p-4"><div className="flex items-start gap-3"><span className="font-bold text-primary">{index + 1}</span><div><p className="font-semibold">{item.category} · score {item.answer_score}/100</p><p className="mt-1 text-muted-foreground">{item.recommendation}</p></div></div></div>)}
            </CardContent>
          </Card>

          <AssessmentProposalCard
            companyName={lead.company_name}
            contactName={lead.contact_name}
            email={lead.email}
            totalScore={run?.total_score ?? 0}
            employeeCount={lead.employee_count}
            recommendations={recommendations}
          />

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Activiteiten</CardTitle></CardHeader>
            <CardContent>
              {activities.length === 0 ? <p className="text-muted-foreground">Nog geen activiteiten geregistreerd.</p> : <div className="space-y-4">{activities.map((event) => <div key={event.id} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" /><div><p className="font-medium">{formatAssessmentActivity(event)}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</p></div></div>)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
