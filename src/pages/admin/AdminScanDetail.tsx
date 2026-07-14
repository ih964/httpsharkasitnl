import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Mail, Phone, ShieldAlert, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

type ScanDetail = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  employee_count: number | null;
  status: LeadStatus;
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

export default function AdminScanDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const [lead, setLead] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!leadId) return;
      setLoading(true);
      const client = supabase as any;
      const { data, error } = await client
        .from("assessment_leads")
        .select("id,company_name,contact_name,email,phone,employee_count,status,consent_report,consent_marketing,source,created_at,assessment_runs(id,total_score,risk_level,category_scores,recommendations,created_at)")
        .eq("id", leadId)
        .single();

      if (error) {
        toast({ title: "Scan kon niet worden geladen", description: error.message, variant: "destructive" });
      } else {
        setLead(data as ScanDetail);
      }
      setLoading(false);
    };

    void load();
  }, [leadId, toast]);

  const updateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    const client = supabase as any;
    const { error } = await client.from("assessment_leads").update({ status }).eq("id", lead.id);
    if (error) {
      toast({ title: "Status niet opgeslagen", description: error.message, variant: "destructive" });
      return;
    }
    setLead({ ...lead, status });
    toast({ title: "Leadstatus bijgewerkt" });
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
        <Select value={lead.status} onValueChange={(value) => void updateStatus(value as LeadStatus)}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-5"><Building2 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Contactpersoon</p><p className="font-medium">{lead.contact_name}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Mail className="h-5 w-5 text-primary" /><div className="min-w-0"><p className="text-xs text-muted-foreground">E-mail</p><a href={`mailto:${lead.email}`} className="block truncate font-medium text-primary hover:underline">{lead.email}</a></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Phone className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Telefoon</p><p className="font-medium">{lead.phone ?? "Niet ingevuld"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Users className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Medewerkers</p><p className="font-medium">{lead.employee_count ?? "Onbekend"}</p></div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle>Scanresultaat</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><p className="text-sm text-muted-foreground">Totaalscore</p><p className="text-5xl font-bold">{run?.total_score ?? 0}<span className="text-xl text-muted-foreground">/100</span></p></div>
            <div><p className="text-sm text-muted-foreground">Risiconiveau</p><p className="mt-1 inline-flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4 text-primary" />{riskLabel(run?.risk_level)}</p></div>
            <div><p className="text-sm text-muted-foreground">Rapportverwerking</p><p className="font-medium">{lead.consent_report ? "Toegestaan" : "Niet toegestaan"}</p></div>
            <div><p className="text-sm text-muted-foreground">Commerciële opvolging</p><p className="font-medium">{lead.consent_marketing ? "Toegestaan" : "Niet toegestaan"}</p></div>
          </CardContent>
        </Card>

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
        </div>
      </div>
    </div>
  );
}
