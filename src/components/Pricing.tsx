import { ArrowRight, CheckCircle2, Code2, HeartPulse, MessageSquareText, ServerCog, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const pricingModels = [
  {
    icon: ServerCog,
    title: "Beheer & support",
    text: "Voor terugkerend IT-beheer maken we een maandvoorstel op basis van het aantal gebruikers en apparaten, de omgeving, gewenste bereikbaarheid en afgesproken dienstverlening.",
    items: ["Microsoft 365 & cloud", "Werkplek- en gebruikersbeheer", "Support- en serviceafspraken"],
  },
  {
    icon: Wrench,
    title: "Projecten & field services",
    text: "Installaties, migraties, hardware-uitrol en werkzaamheden op locatie worden begroot op basis van scope, locaties, planning en benodigde inzet.",
    items: ["Installaties op locatie", "Migraties & roll-outs", "Technische nazorg"],
  },
  {
    icon: Code2,
    title: "Software & digital",
    text: "Websites, webapps, portalen, automatisering en marketing verschillen per doel en complexiteit. Daarom ontvang je vooraf een voorstel met duidelijke deliverables.",
    items: ["Websites & webapps", "Automatisering & integraties", "Online marketing"],
  },
  {
    icon: HeartPulse,
    title: "Zorgtechnologie",
    text: "Bij medische techniek en zorgdomotica bepalen onder andere locatie, apparatuur, koppelingen, leveranciers en gewenste ondersteuning de omvang van de opdracht.",
    items: ["Medische randapparatuur", "Zorgdomotica", "Technische implementatie"],
  },
];

const priceFactors = [
  "Aantal gebruikers, apparaten en locaties",
  "Huidige IT-omgeving en benodigde migratie of inrichting",
  "Gewenste bereikbaarheid, responstijden en supportscope",
  "Projectomvang, planning en inzet op locatie",
  "Hardware, licenties en externe leveranciers indien van toepassing",
];

const Pricing = () => (
  <section id="prijzen" className="py-20 sm:py-24 relative overflow-hidden scroll-mt-24">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[180px] pointer-events-none" />
    <div className="container px-4 sm:px-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto text-center mb-12 sm:mb-14"
      >
        <span className="inline-block text-primary text-sm font-semibold tracking-[0.16em] uppercase mb-4">Offerte & prijsopbouw</span>
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Geen standaardpakket voor een <span className="text-gradient">niet-standaard organisatie.</span>
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
          Iedere organisatie heeft andere gebruikers, apparatuur, locaties en doelen. Daarom bespreken we eerst de situatie
          en ontvang je daarna een helder voorstel met scope, afspraken en kosten.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-6xl mx-auto">
        {pricingModels.map((model, index) => (
          <motion.article
            key={model.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: index * 0.05 }}
            className="rounded-3xl border border-border/50 bg-card/40 p-6 sm:p-8"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <model.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-3">{model.title}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">{model.text}</p>
            <div className="space-y-3">
              {model.items.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.article>
        ))}
      </div>

      <div className="max-w-6xl mx-auto mt-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="rounded-3xl border border-border/50 bg-card/30 p-6 sm:p-8">
          <span className="text-primary text-sm font-semibold tracking-[0.16em] uppercase">Wat bepaalt de offerte?</span>
          <h3 className="text-2xl sm:text-3xl font-bold mt-3 mb-6">Eerst begrijpen wat er echt nodig is.</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {priceFactors.map((factor) => (
              <div key={factor} className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-primary/25 bg-primary/5 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <span className="text-primary text-sm font-semibold tracking-[0.16em] uppercase">Kennismaken</span>
            <h3 className="text-2xl sm:text-3xl font-bold mt-3 mb-4">Vertel wat je nodig hebt.</h3>
            <p className="text-muted-foreground leading-relaxed mb-7">
              Een eerste kennismaking is vrijblijvend. Daarna bepalen we of een korte inventarisatie voldoende is of dat
              een uitgebreidere technische intake nodig is voor een goede offerte.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="hero" className="w-full h-auto min-h-12 whitespace-normal text-center" asChild>
              <a href="/?aanvraag=maatwerk#contact">Vraag een voorstel aan <ArrowRight className="w-4 h-4" /></a>
            </Button>
            <Button variant="outline" className="w-full h-auto min-h-12 whitespace-normal text-center" asChild>
              <a href="https://wa.me/31851249091?text=Hoi%20Harkas%20IT%2C%20ik%20wil%20graag%20mijn%20vraag%20bespreken.">
                <MessageSquareText className="w-4 h-4" /> Vraag via WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Pricing;
