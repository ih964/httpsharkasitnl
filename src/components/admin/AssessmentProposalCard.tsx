import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Copy, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AssessmentQuoteDraftCard from "@/components/admin/AssessmentQuoteDraftCard";
import { buildAssessmentProposal, type ProposalRecommendation } from "@/lib/assessmentProposal";

type AssessmentProposalCardProps = {
  companyName: string;
  contactName: string;
  email: string;
  totalScore: number;
  employeeCount: number | null;
  recommendations: ProposalRecommendation[];
};

const priorityLabel: Record<"direct" | "hoog" | "normaal", string> = {
  direct: "Direct oppakken",
  hoog: "Hoge prioriteit",
  normaal: "Normale prioriteit",
};

export default function AssessmentProposalCard({
  companyName,
  contactName,
  email,
  totalScore,
  employeeCount,
  recommendations,
}: AssessmentProposalCardProps) {
  const { leadId } = useParams<{ leadId: string }>();
  const [copied, setCopied] = useState(false);
  const proposal = useMemo(() => buildAssessmentProposal({
    companyName,
    contactName,
    totalScore,
    employeeCount,
    recommendations,
  }), [companyName, contactName, totalScore, employeeCount, recommendations]);

  const copyEmail = async () => {
    await navigator.clipboard.writeText(proposal.emailBody);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(proposal.subject)}&body=${encodeURIComponent(proposal.emailBody)}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conceptadvies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">{proposal.summary}</p>

          <div className="space-y-3">
            {proposal.scopeItems.length === 0 ? (
              <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Geen directe verbeterpunten uit de vragenlijst. Plan eventueel een periodieke technische controle.</p>
            ) : proposal.scopeItems.map((item, index) => (
              <div key={`${item.category}-${index}`} className="rounded-xl border p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold">{item.service}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.recommendation}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{priorityLabel[item.priority]}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-muted/40 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">E-mailconcept</p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{proposal.emailBody}</pre>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void copyEmail()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Gekopieerd" : "Kopieer e-mail"}
            </button>
            <a href={mailto} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <Mail className="h-4 w-4" /> Open in e-mail
            </a>
          </div>

          <p className="text-xs text-muted-foreground">Dit is een concept zonder prijs of toezegging. Controleer de tekst en voer eerst een technische intake uit voordat je een definitieve offerte verstuurt.</p>
        </CardContent>
      </Card>

      {leadId ? (
        <AssessmentQuoteDraftCard
          leadId={leadId}
          companyName={companyName}
          contactName={contactName}
          email={email}
          recommendations={recommendations}
        />
      ) : null}
    </div>
  );
}
