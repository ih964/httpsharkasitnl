import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { ArrowLeft, ArrowRight, Download, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieConsent from "@/components/CookieConsent";
import { applyPageSeo } from "@/lib/pageSeo";

type Category = "Beveiliging" | "Back-up" | "Werkplekken" | "Microsoft 365";
type Question = {
  id: string;
  category: Category;
  question: string;
  explanation: string;
  recommendation: string;
};

const questions: Question[] = [
  { id: "mfa", category: "Beveiliging", question: "Is multifactorauthenticatie verplicht voor alle zakelijke accounts?", explanation: "MFA beperkt de impact van gestolen wachtwoorden.", recommendation: "Maak MFA verplicht voor alle gebruikers en beheerders." },
  { id: "updates", category: "Beveiliging", question: "Worden beveiligingsupdates centraal beheerd en gecontroleerd?", explanation: "Verouderde software bevat vaak bekende kwetsbaarheden.", recommendation: "Richt centraal patchbeheer in met periodieke rapportage." },
  { id: "backup", category: "Back-up", question: "Is er een onafhankelijke back-up van belangrijke bedrijfsgegevens?", explanation: "Synchronisatie via OneDrive is niet hetzelfde als een aparte back-up.", recommendation: "Maak een onafhankelijke back-up van Microsoft 365 en kritieke data." },
  { id: "restore", category: "Back-up", question: "Wordt getest of gegevens daadwerkelijk teruggezet kunnen worden?", explanation: "Een back-up is pas betrouwbaar wanneer herstel aantoonbaar werkt.", recommendation: "Plan vaste hersteltests en documenteer de resultaten." },
  { id: "management", category: "Werkplekken", question: "Worden zakelijke laptops en computers centraal beheerd?", explanation: "Centraal beheer maakt beveiliging en ondersteuning beter controleerbaar.", recommendation: "Breng alle zakelijke apparaten onder centraal werkplekbeheer." },
  { id: "encryption", category: "Werkplekken", question: "Zijn zakelijke laptops versleuteld?", explanation: "Versleuteling beschermt data bij verlies of diefstal.", recommendation: "Activeer en controleer schijfversleuteling op alle laptops." },
  { id: "leavers", category: "Microsoft 365", question: "Worden accounts van vertrekkende medewerkers direct geblokkeerd?", explanation: "Oude accounts kunnen onnodig toegang houden tot bedrijfsdata.", recommendation: "Gebruik een vaste in- en uitdienstprocedure." },
  { id: "sharing", category: "Microsoft 365", question: "Is extern delen van bestanden en Teams bewust ingericht?", explanation: "Ongecontroleerde deel-links kunnen langdurig toegang geven.", recommendation: "Beperk extern delen en controleer gasten en deel-links periodiek." },
];

const options = [
  { label: "Ja, volledig geregeld", value: 100 },
  { label: "Gedeeltelijk geregeld", value: 50 },
  { label: "Nee of onbekend", value: 0 },
];

const categories: Category[] = ["Beveiliging", "Back-up", "Werkplekken", "Microsoft 365"];

export default function ITQuickScan() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    applyPageSeo({
      title: "Gratis IT Quick Scan | Harkas IT",
      description: "Ontvang direct een indicatieve IT-score met concrete verbeterpunten.",
    });
  }, []);

  const current = questions[step];
  const answered = Object.keys(answers).length;
  const score = useMemo(() => Math.round(questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0) / questions.length), [answers]);
  const categoryScores = useMemo(() => categories.map((category) => {
    const items = questions.filter((q) => q.category === category);
    const value = Math.round(items.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0) / items.length);
    return { category, value };
  }), [answers]);
  const priorities = useMemo(() => questions.filter((q) => (answers[q.id] ?? 0) < 100).sort((a, b) => (answers[a.id] ?? 0) - (answers[b.id] ?? 0)).slice(0, 5), [answers]);
  const label = score >= 80 ? "Goed op weg" : score >= 60 ? "Aandacht nodig" : "Verhoogd risico";
  const progress = finished ? 100 : Math.round((answered / questions.length) * 100);

  const next = () => {
    if (answers[current.id] === undefined) return;
    if (step === questions.length - 1) {
      setFinished(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else setStep((value) => value + 1);
  };

  const download = () => {
    const pdf = new jsPDF();
    let y = 20;
    pdf.setFontSize(20);
    pdf.text("Harkas IT - IT Quick Scan", 20, y);
    y += 12;
    pdf.setFontSize(12);
    pdf.text(`Indicatieve score: ${score}/100 - ${label}`, 20, y);
    y += 10;
    pdf.setFontSize(9);
    pdf.text("Deze quick scan is een indicatie en geen technische audit of penetratietest.", 20, y);
    y += 14;
    pdf.setFontSize(14);
    pdf.text("Scores per onderdeel", 20, y);
    y += 9;
    pdf.setFontSize(11);
    categoryScores.forEach((item) => { pdf.text(`${item.category}: ${item.value}/100`, 24, y); y += 7; });
    y += 6;
    pdf.setFontSize(14);
    pdf.text("Belangrijkste verbeterpunten", 20, y);
    y += 9;
    pdf.setFontSize(10);
    priorities.forEach((item, index) => {
      const lines = pdf.splitTextToSize(`${index + 1}. ${item.recommendation}`, 165);
      pdf.text(lines, 24, y);
      y += lines.length * 6 + 3;
    });
    pdf.text("Bespreek de uitslag via info@harkasit.nl of 085 124 9091.", 20, y + 5);
    pdf.save("Harkas-IT-Quick-Scan.pdf");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <section className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-7 w-7" /></div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Gratis IT Quick Scan</p>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Hoe goed is jouw bedrijfs-IT geregeld?</h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-lg">Beantwoord 8 praktische vragen en ontvang direct een score en concrete verbeterpunten.</p>
            </div>

            <div className="mb-6 rounded-full bg-muted p-1"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>

            {!finished ? (
              <div className="rounded-3xl border bg-card p-6 shadow-sm md:p-10">
                <div className="mb-7 flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{current.category}</span>
                  <span className="text-sm text-muted-foreground">Vraag {step + 1} van {questions.length}</span>
                </div>
                <h2 className="text-2xl font-semibold md:text-3xl">{current.question}</h2>
                <p className="mt-3 text-muted-foreground">{current.explanation}</p>
                <div className="mt-8 grid gap-3">
                  {options.map((option) => {
                    const selected = answers[current.id] === option.value;
                    return <button key={option.label} type="button" onClick={() => setAnswers((old) => ({ ...old, [current.id]: option.value }))} className={`rounded-2xl border p-4 text-left font-medium transition ${selected ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-muted/50"}`}>{option.label}</button>;
                  })}
                </div>
                <div className="mt-8 flex justify-between gap-3">
                  <button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 font-medium disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Vorige</button>
                  <button type="button" disabled={answers[current.id] === undefined} onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-40">{step === questions.length - 1 ? "Bekijk uitslag" : "Volgende"}<ArrowRight className="h-4 w-4" /></button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-3xl border bg-card p-7 text-center shadow-sm md:p-10">
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">Jouw indicatieve IT-score</p>
                  <div className="mt-3 text-6xl font-bold">{score}<span className="text-2xl text-muted-foreground">/100</span></div>
                  <p className="mt-3 text-xl font-semibold">{label}</p>
                  <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Dit resultaat is een eerste indicatie. Voor een betrouwbaar advies is controle van de technische omgeving nodig.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {categoryScores.map((item) => <div key={item.category} className="rounded-2xl border bg-card p-5"><div className="flex justify-between font-semibold"><span>{item.category}</span><span>{item.value}/100</span></div><div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${item.value}%` }} /></div></div>)}
                </div>
                <div className="rounded-3xl border bg-card p-6 md:p-8">
                  <h2 className="text-2xl font-bold">Belangrijkste verbeterpunten</h2>
                  <div className="mt-5 space-y-4">{priorities.length ? priorities.map((item, index) => <div key={item.id} className="flex gap-4 rounded-2xl bg-muted/50 p-4"><span className="font-bold text-primary">{index + 1}</span><div><p className="font-semibold">{item.category}</p><p className="text-muted-foreground">{item.recommendation}</p></div></div>) : <p className="text-muted-foreground">Alle onderdelen zijn positief beantwoord. Laat de instellingen periodiek technisch controleren.</p>}</div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={download} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Download PDF-rapport</button>
                  <a href="mailto:info@harkasit.nl?subject=Adviesgesprek%20IT%20Quick%20Scan" className="inline-flex flex-1 items-center justify-center rounded-xl border px-5 py-3 font-semibold">Plan een gratis adviesgesprek</a>
                  <button type="button" onClick={() => { setAnswers({}); setStep(0); setFinished(false); }} className="rounded-xl border px-5 py-3 font-semibold">Opnieuw</button>
                </div>
              </div>
            )}
            <p className="mt-6 text-center text-xs text-muted-foreground">De scan slaat in deze eerste versie geen antwoorden of persoonsgegevens op.</p>
          </div>
        </section>
      </main>
      <Footer /><WhatsAppButton /><CookieConsent />
    </div>
  );
}
