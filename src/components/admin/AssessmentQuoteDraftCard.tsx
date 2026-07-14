import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  calculateQuoteTotals,
  createSuggestedQuoteLines,
  toQuoteRpcLines,
  validateQuoteLines,
  type AssessmentQuoteLine,
} from "@/lib/assessmentQuote";
import { downloadAssessmentQuotePdf, previewAssessmentQuotePdf } from "@/lib/assessmentQuotePdf";

 type Recommendation = {
  question_id?: string;
  recommendation: string;
};

type StoredDraft = {
  id: string;
  title: string;
  introduction: string | null;
  notes: string | null;
  valid_until: string | null;
  line_items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    vat_percentage: 0 | 9 | 21;
  }>;
  subtotal: number;
  vat_total: number;
  total: number;
  updated_at: string;
};

type Props = {
  leadId: string;
  companyName: string;
  contactName: string;
  email: string;
  recommendations: Recommendation[];
  onSaved?: () => void | Promise<void>;
};

const formatCurrency = (value: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
}).format(value);

const defaultValidUntil = () => {
  const value = new Date();
  value.setDate(value.getDate() + 14);
  return value.toISOString().slice(0, 10);
};

const newLine = (): AssessmentQuoteLine => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatPercentage: 21,
});

export default function AssessmentQuoteDraftCard({
  leadId,
  companyName,
  contactName,
  email,
  recommendations,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(`Conceptvoorstel voor ${companyName}`);
  const [introduction, setIntroduction] = useState("Onderstaand voorstel is een concept en wordt na een technische intake definitief gemaakt.");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [lines, setLines] = useState<AssessmentQuoteLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const client = supabase as any;
      const { data, error } = await client
        .from("assessment_proposal_drafts")
        .select("id,title,introduction,notes,valid_until,line_items,subtotal,vat_total,total,updated_at")
        .eq("lead_id", leadId)
        .maybeSingle();

      if (error) {
        setStorageAvailable(false);
        const suggestions = createSuggestedQuoteLines(recommendations);
        setLines(suggestions.length ? suggestions : [newLine()]);
      } else if (data) {
        const draft = data as StoredDraft;
        setTitle(draft.title);
        setIntroduction(draft.introduction ?? "");
        setNotes(draft.notes ?? "");
        setValidUntil(draft.valid_until ?? "");
        setLines((draft.line_items ?? []).map((line, index) => ({
          id: line.id || `stored-${index + 1}`,
          description: line.description,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unit_price),
          vatPercentage: Number(line.vat_percentage) as 0 | 9 | 21,
        })));
        setSavedAt(draft.updated_at);
      } else {
        const suggestions = createSuggestedQuoteLines(recommendations);
        setLines(suggestions.length ? suggestions : [newLine()]);
      }
      setLoading(false);
    };

    void load();
  }, [leadId, recommendations]);

  const totals = useMemo(() => calculateQuoteTotals(lines), [lines]);

  const updateLine = <K extends keyof AssessmentQuoteLine>(id: string, key: K, value: AssessmentQuoteLine[K]) => {
    setLines((current) => current.map((line) => line.id === id ? { ...line, [key]: value } : line));
  };

  const getPdfInput = () => ({
    companyName,
    contactName,
    email,
    title,
    introduction,
    validUntil,
    notes: "",
    lines,
  });

  const openPdf = (mode: "preview" | "download") => {
    try {
      if (mode === "preview") previewAssessmentQuotePdf(getPdfInput());
      else downloadAssessmentQuotePdf(getPdfInput());
    } catch (error) {
      toast({
        title: "PDF kon niet worden gemaakt",
        description: error instanceof Error ? error.message : "Controleer de conceptofferte.",
        variant: "destructive",
      });
    }
  };

  const saveDraft = async () => {
    const validation = validateQuoteLines(lines);
    if (!validation.valid) {
      toast({ title: "Controleer de offertelijnen", description: validation.errors[0], variant: "destructive" });
      return;
    }
    if (title.trim().length < 3) {
      toast({ title: "Titel ontbreekt", description: "Vul een duidelijke titel voor het concept in.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const client = supabase as any;
    const { data, error } = await client.rpc("save_assessment_proposal_draft", {
      p_lead_id: leadId,
      p_title: title.trim(),
      p_introduction: introduction.trim() || null,
      p_line_items: toQuoteRpcLines(validation.lines),
      p_notes: notes.trim() || null,
      p_valid_until: validUntil || null,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Conceptofferte niet opgeslagen", description: error.message, variant: "destructive" });
      return;
    }

    const stored = (Array.isArray(data) ? data[0] : data) as StoredDraft | null;
    setLines(validation.lines);
    setStorageAvailable(true);
    setSavedAt(stored?.updated_at ?? new Date().toISOString());
    await onSaved?.();
    toast({ title: "Conceptofferte opgeslagen", description: "Er is niets verstuurd en de bedragen blijven intern concept." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Conceptofferte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          Bedragen worden uitsluitend handmatig ingevuld. Opslaan of een PDF maken verstuurt niets naar de klant en maakt geen factuur of betaling aan.
        </div>

        {!storageAvailable ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            De conceptopslag is nog niet beschikbaar in de gekoppelde database. De editor en PDF werken wel, maar opslaan vereist eerst de nieuwe migratie.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label htmlFor="proposalTitle">Titel</Label><Input id="proposalTitle" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} /></div>
          <div className="space-y-2"><Label htmlFor="validUntil">Geldig tot</Label><Input id="validUntil" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="proposalIntroduction">Inleiding voor de klant</Label><textarea id="proposalIntroduction" value={introduction} onChange={(event) => setIntroduction(event.target.value)} maxLength={3000} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
        </div>

        <div className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Concept laden...</p> : lines.map((line, index) => (
            <div key={line.id} className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[minmax(220px,1fr)_100px_140px_110px_auto] lg:items-end">
              <div className="space-y-2"><Label>Omschrijving {index + 1}</Label><Input value={line.description} onChange={(event) => updateLine(line.id, "description", event.target.value)} maxLength={240} /></div>
              <div className="space-y-2"><Label>Aantal</Label><Input type="number" min="0.01" max="10000" step="0.01" value={line.quantity} onChange={(event) => updateLine(line.id, "quantity", Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Prijs excl. btw</Label><Input type="number" min="0" max="1000000" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.id, "unitPrice", Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Btw</Label><select value={line.vatPercentage} onChange={(event) => updateLine(line.id, "vatPercentage", Number(event.target.value) as 0 | 9 | 21)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value={0}>0%</option><option value={9}>9%</option><option value={21}>21%</option></select></div>
              <button type="button" aria-label={`Verwijder regel ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="inline-flex h-10 w-10 items-center justify-center rounded-md border disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setLines((current) => [...current, newLine()])} disabled={lines.length >= 20} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"><Plus className="h-4 w-4" /> Regel toevoegen</button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="proposalNotes">Interne offertenotities</Label>
          <textarea id="proposalNotes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground">Deze interne notities worden bewust niet opgenomen in de PDF.</p>
        </div>

        <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
          <div className="flex justify-between"><span>Subtotaal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
          <div className="flex justify-between"><span>Btw</span><strong>{formatCurrency(totals.vatTotal)}</strong></div>
          <div className="flex justify-between border-t pt-2 text-base"><span>Totaal</span><strong>{formatCurrency(totals.total)}</strong></div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-xs text-muted-foreground">{savedAt ? `Laatst opgeslagen: ${new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(savedAt))}` : "Nog niet opgeslagen"}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={loading} onClick={() => openPdf("preview")} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"><Eye className="h-4 w-4" /> Bekijk PDF</button>
            <button type="button" disabled={loading} onClick={() => openPdf("download")} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"><Download className="h-4 w-4" /> Download PDF</button>
            <button type="button" disabled={saving || loading} onClick={() => void saveDraft()} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Opslaan..." : "Opslaan als concept"}</button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
