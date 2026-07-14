import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Download, Eye, FileCheck2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { previewAssessmentQuotePdf, downloadAssessmentQuotePdf } from "@/lib/assessmentQuotePdf";
import { buildAssessmentProposalDelivery } from "@/lib/assessmentProposalDelivery";
import { formatProposalStatus, formatProposalValidity, type ProposalStatus } from "@/lib/assessmentProposalOverview";
import type { AssessmentQuoteLine } from "@/lib/assessmentQuote";

type ProposalLead = {
  company_name: string;
  contact_name: string;
  email: string;
  customer_id: string | null;
};

type StoredLine = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_percentage: 0 | 9 | 21;
};

type ProposalDetail = {
  id: string;
  lead_id: string;
  customer_id: string | null;
  title: string;
  introduction: string | null;
  notes: string | null;
  line_items: StoredLine[];
  valid_until: string | null;
  status: ProposalStatus;
  subtotal: number;
  vat_total: number;
  total: number;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  assessment_leads: ProposalLead | ProposalLead[] | null;
};

const statuses: Array<{ value: ProposalStatus; label: string }> = [
  { value: "draft", label: "Concept" },
  { value: "reviewed", label: "Gecontroleerd" },
  { value: "approved", label: "Goedgekeurd" },
];

const currency = (value: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
}).format(value);

const getLead = (proposal: ProposalDetail): ProposalLead | null => {
  if (Array.isArray(proposal.assessment_leads)) return proposal.assessment_leads[0] ?? null;
  return proposal.assessment_leads;
};

const toQuoteLines = (items: StoredLine[]): AssessmentQuoteLine[] => items.map((item, index) => ({
  id: item.id || `proposal-line-${index + 1}`,
  description: item.description,
  quantity: Number(item.quantity),
  unitPrice: Number(item.unit_price),
  vatPercentage: Number(item.vat_percentage) as 0 | 9 | 21,
}));

export default function AdminProposalDetail() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!proposalId) return;
      setLoading(true);
      const client = supabase as any;
      const { data, error } = await client
        .from("assessment_proposal_drafts")
        .select("id,lead_id,customer_id,title,introduction,notes,line_items,valid_until,status,subtotal,vat_total,total,reviewed_at,approved_at,created_at,updated_at,assessment_leads(company_name,contact_name,email,customer_id)")
        .eq("id", proposalId)
        .single();

      if (error) {
        toast({ title: "Offerte kon niet worden geladen", description: error.message, variant: "destructive" });
        setProposal(null);
      } else {
        setProposal(data as ProposalDetail);
      }
      setLoading(false);
    };

    void load();
  }, [proposalId, toast]);

  const lead = proposal ? getLead(proposal) : null;
  const lines = useMemo(() => toQuoteLines(proposal?.line_items ?? []), [proposal]);
  const delivery = useMemo(() => buildAssessmentProposalDelivery({
    companyName: lead?.company_name ?? "",
    contactName: lead?.contact_name ?? "",
    email: lead?.email ?? "",
    title: proposal?.title ?? "",
    total: Number(proposal?.total ?? 0),
    validUntil: proposal?.valid_until ?? null,
    status: proposal?.status ?? "draft",
  }), [lead, proposal]);

  const pdfInput = proposal && lead ? {
    companyName: lead.company_name,
    contactName: lead.contact_name,
    email: lead.email,
    title: proposal.title,
    introduction: proposal.introduction ?? "",
    validUntil: proposal.valid_until ?? "",
    notes: "",
    lines,
  } : null;

  const runPdfAction = (action: "preview" | "download") => {
    if (!pdfInput) return;
    try {
      if (action === "preview") previewAssessmentQuotePdf(pdfInput);
      else downloadAssessmentQuotePdf(pdfInput);
    } catch (error) {
      toast({ title: "PDF kon niet worden gemaakt", description: error instanceof Error ? error.message : "Controleer de offertegegevens.", variant: "destructive" });
    }
  };

  const updateStatus = async (status: ProposalStatus) => {
    if (!proposal || proposal.status === status) return;
    setUpdating(true);
    const client = supabase as any;
    const { data, error } = await client.rpc("update_assessment_proposal_status", {
      p_proposal_id: proposal.id,
      p_status: status,
    });
    setUpdating(false);

    if (error) {
      toast({ title: "Offertestatus niet opgeslagen", description: error.message, variant: "destructive" });
      return;
    }

    const updated = (Array.isArray(data) ? data[0] : data) as Partial<ProposalDetail> | null;
    setProposal({
      ...proposal,
      status,
      reviewed_at: updated?.reviewed_at ?? proposal.reviewed_at,
      approved_at: updated?.approved_at ?? (status === "approved" ? new Date().toISOString() : null),
      updated_at: updated?.updated_at ?? new Date().toISOString(),
    });
    toast({ title: `Offerte gemarkeerd als ${formatProposalStatus(status).toLowerCase()}` });
  };

  const copyEmail = async () => {
    if (!delivery.valid) {
      toast({ title: "E-mailconcept niet compleet", description: delivery.errors[0], variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(delivery.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex min-h-[320px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!proposal || !lead) return <div className="space-y-4"><p>Deze offerte kon niet worden gevonden.</p><Link to="/admin/offertes" className="text-primary hover:underline">Terug naar offertes</Link></div>;

  return (
    <div className="space-y-6">
      <Link to="/admin/offertes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Terug naar offertes</Link>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm text-muted-foreground">Conceptofferte voor {lead.company_name}</p>
          <h1 className="text-3xl font-heading font-bold">{proposal.title}</h1>
          <p className="mt-1 text-muted-foreground">Laatst bijgewerkt op {new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(new Date(proposal.updated_at))}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={() => runPdfAction("preview")} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"><Eye className="h-4 w-4" /> Bekijk PDF</button>
          <button type="button" onClick={() => runPdfAction("download")} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"><Download className="h-4 w-4" /> Download PDF</button>
          <Select disabled={updating} value={proposal.status} onValueChange={(value) => void updateStatus(value as ProposalStatus)}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{statuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 font-semibold">{formatProposalStatus(proposal.status)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Geldigheid</p><p className="mt-1 font-semibold">{formatProposalValidity(proposal.valid_until)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Subtotaal</p><p className="mt-1 font-semibold">{currency(Number(proposal.subtotal))}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Totaal incl. btw</p><p className="mt-1 text-xl font-bold">{currency(Number(proposal.total))}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><CardTitle>Offerte-inhoud</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {proposal.introduction ? <p className="text-sm leading-6 text-muted-foreground">{proposal.introduction}</p> : null}
            <div className="space-y-3">{lines.map((line, index) => <div key={line.id} className="rounded-xl border p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="font-medium">{index + 1}. {line.description}</p><p className="mt-1 text-sm text-muted-foreground">{line.quantity} × {currency(line.unitPrice)} · {line.vatPercentage}% btw</p></div><p className="font-semibold">{currency(line.quantity * line.unitPrice)}</p></div></div>)}</div>
            <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-muted/40 p-4 text-sm"><div className="flex justify-between"><span>Subtotaal</span><strong>{currency(Number(proposal.subtotal))}</strong></div><div className="flex justify-between"><span>Btw</span><strong>{currency(Number(proposal.vat_total))}</strong></div><div className="flex justify-between border-t pt-2 text-base"><span>Totaal</span><strong>{currency(Number(proposal.total))}</strong></div></div>
            <Link to={`/admin/scans/${proposal.lead_id}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Open bronlead</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Klantmail voorbereiden</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!delivery.approvedForSending ? <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">De offerte moet eerst de status <strong>Goedgekeurd</strong> hebben voordat de klantmail kan worden geopend.</div> : null}
            <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Onderwerp</p><p className="mt-1 text-sm font-medium">{delivery.subject}</p></div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-4 font-sans text-sm leading-6">{delivery.body}</pre>
            <div className="rounded-xl border p-4 text-xs text-muted-foreground">{delivery.attachmentReminder}</div>
            <button type="button" onClick={() => void copyEmail()} className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Gekopieerd" : "Kopieer e-mail"}</button>
            {delivery.valid && delivery.approvedForSending ? <a href={delivery.mailto} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Mail className="h-4 w-4" /> Open in e-mail</a> : <button type="button" disabled className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50"><FileCheck2 className="h-4 w-4" /> Eerst goedkeuren</button>}
            <p className="text-xs text-muted-foreground">Er wordt niets automatisch verzonden en de PDF wordt niet automatisch toegevoegd.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
