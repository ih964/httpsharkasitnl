import { ArrowRight, CheckCircle2, ClipboardCheck, MessageSquareText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const outcomes = [
  "Inzicht in je Microsoft 365-basis, MFA, accounts en rechten",
  "Concrete verbeterpunten voor werkplekken, support en beveiliging",
  "Advies of beheer, support, automatisering of een eenmalige check past",
];

const steps = [
  { title: "1. Korte intake", text: "Je vertelt waar je nu tegenaan loopt: accounts, laptops, mail, Teams, SharePoint, printers of support." },
  { title: "2. Praktische check", text: "We kijken naar je belangrijkste risico's, verbeterpunten en quick wins zonder ingewikkeld IT-jargon." },
  { title: "3. Duidelijk advies", text: "Je krijgt een eerlijk voorstel: eenmalig oplossen, maandelijks beheer of niets doen als dat beter past." },
];

const ITCheckCTA = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-x-0 top-1/2 h-64 -translate-y-1/2 bg-primary/5 blur-[140px] pointer-events-none" />
      <div className="container px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto rounded-3xl border border-primary/30 gradient-card p-8 md:p-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-wider uppercase mb-4">
                <ClipboardCheck className="w-4 h-4" />
                Gratis IT-check
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-5">
                Laat snel zien waar je IT <span className="text-gradient">sterker kan</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Ideaal voor ondernemers die twijfelen of Microsoft 365, werkplekken, rechten, support en beveiliging goed staan. Geen verkooppraatje, maar een praktische eerste check met duidelijke vervolgstappen.
              </p>
              <div className="space-y-3 mb-8">
                {outcomes.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/it-check" className="gap-3">
                    Start gratis IT-check
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="https://wa.me/31851249091" className="gap-3">
                    <MessageSquareText className="w-5 h-5" />
                    WhatsApp direct
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {steps.map((step) => (
                <div key={step.title} className="rounded-2xl bg-background/70 border border-border/50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ITCheckCTA;
