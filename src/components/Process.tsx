import { ArrowRight, CheckCircle2, ClipboardCheck, Lightbulb, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const steps = [
  {
    icon: ClipboardCheck,
    title: "1. Korte inventarisatie",
    text: "We kijken naar je huidige situatie: gebruikers, Microsoft 365, werkplekken, supportvragen, website en processen.",
  },
  {
    icon: Lightbulb,
    title: "2. Duidelijk advies",
    text: "Je krijgt eerlijk advies over wat beter, veiliger of slimmer kan. Geen onnodige oplossingen, maar wat echt past.",
  },
  {
    icon: Settings,
    title: "3. Uitvoering zonder gedoe",
    text: "We pakken de afgesproken acties op: support, inrichting, beheer, website-aanpassingen of automatisering.",
  },
  {
    icon: ShieldCheck,
    title: "4. Beheer en opvolging",
    text: "Na de eerste verbetering kunnen we blijven ondersteunen met beheer, support, controles en doorontwikkeling.",
  },
];

const Process = () => {
  return (
    <section id="werkwijze" className="py-24 relative overflow-hidden bg-secondary/20">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[180px] pointer-events-none" />
      <div className="container px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            Werkwijze
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Van vraag naar <span className="text-gradient">duidelijke oplossing</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Harkas IT werkt praktisch en overzichtelijk. Eerst begrijpen wat er speelt, daarna pas verbeteren wat echt waarde toevoegt.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="relative p-7 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500"
            >
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6">
                <step.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto mt-12 p-8 rounded-3xl gradient-card border border-primary/30"
        >
          <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold">Begin laagdrempelig met een IT-check</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Je hoeft niet direct een groot pakket te kiezen. We starten met inzicht en adviseren daarna pas wat logisch is.
              </p>
            </div>
            <Button variant="hero" size="lg" asChild>
              <a href="#contact" className="gap-3">
                Plan gratis IT-check
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Process;
