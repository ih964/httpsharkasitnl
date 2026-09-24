import { ArrowRight, CheckCircle2, ClipboardCheck, MessageSquareText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const outcomes = [
  "8 vragen over beveiliging, back-up, werkplekken en Microsoft 365",
  "Direct een indicatieve score en praktische verbeterpunten",
  "Gratis te gebruiken, zonder verplichte contactgegevens",
];

const steps = [
  { title: "1. Gratis online zelfcheck", text: "Beantwoord zelf 8 vragen. De uitkomst is een eerste indicatie, geen technische controle van je systemen." },
  { title: "2. Vrijblijvende kennismaking", text: "Bespreek je situatie, doelen en belangrijkste hulpvraag. We bepalen samen welke vervolgstap zinvol is." },
  { title: "3. Inventarisatie & voorstel", text: "Voor beheer, een technische controle of een project stemmen we eerst de scope af. Daarna ontvang je een voorstel dat past bij jouw omgeving en wensen." },
];

const ITCheckCTA = () => (
  <section className="py-16 sm:py-20 relative overflow-hidden">
    <div className="absolute inset-x-0 top-1/2 h-64 -translate-y-1/2 bg-primary/5 blur-[140px] pointer-events-none" />
    <div className="container px-4 sm:px-6 relative z-10">
      <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-6xl mx-auto rounded-3xl border border-primary/30 gradient-card p-6 sm:p-8 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-8 lg:gap-10 items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-[0.14em] uppercase mb-4"><ClipboardCheck className="w-4 h-4 flex-shrink-0" />Gratis online IT-zelfcheck</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-5">Ontdek waar je IT <span className="text-gradient">aandacht nodig heeft</span></h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-6">Krijg een eerste indruk van hoe jouw bedrijfs-IT is geregeld. Je antwoorden vormen de basis voor de uitslag; we bekijken hierbij niet de technische instellingen van je systemen.</p>
            <div className="space-y-3 mb-8">{outcomes.map((item) => <div key={item} className="flex items-start gap-3 text-muted-foreground"><CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" /><span>{item}</span></div>)}</div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <Button variant="hero" size="lg" className="h-auto min-h-12 whitespace-normal text-center" asChild><Link to="/it-check">Start gratis online zelfcheck<ArrowRight className="w-5 h-5 flex-shrink-0" /></Link></Button>
              <Button variant="outline" size="lg" className="h-auto min-h-12 whitespace-normal text-center" asChild><a href="/?aanvraag=kennismaking#contact">Plan een kennismaking</a></Button>
            </div>
            <a href="https://wa.me/31851249091?text=Hoi%20Harkas%20IT%2C%20ik%20wil%20graag%20mijn%20vraag%20bespreken." target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-5 text-sm text-muted-foreground hover:text-primary"><MessageSquareText className="w-4 h-4" />Liever via WhatsApp?</a>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {steps.map((step) => <div key={step.title} className="rounded-2xl bg-background/70 border border-border/50 p-5"><div className="flex items-start gap-4"><div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-5 h-5 text-primary" /></div><div className="min-w-0"><h3 className="font-semibold mb-1">{step.title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p></div></div></div>)}
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default ITCheckCTA;
