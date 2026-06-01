import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const packages = [
  {
    name: "IT Start",
    price: "499",
    suffix: "p/m",
    description: "Voor kleine bedrijven die hun Microsoft 365, gebruikersbeheer, support en basisbeveiliging goed geregeld willen hebben.",
    features: [
      "Microsoft 365 beheer",
      "Remote support",
      "4 supporturen per maand",
      "MFA/security basis",
      "Maandelijkse controle",
      "Extra uren op nacalculatie",
    ],
    popular: false,
  },
  {
    name: "IT + Website Beheer",
    price: "699",
    suffix: "p/m",
    description: "Voor bedrijven die naast IT-beheer ook hun website professioneel willen laten beheren.",
    features: [
      "Alles van IT Start",
      "Website onderhoud",
      "Kleine tekst- en beeldwijzigingen",
      "Domein/mail/hosting ondersteuning",
      "Maandelijkse verbeteringen",
      "Eén aanspreekpunt voor IT en web",
    ],
    popular: true,
  },
  {
    name: "Digitale Groei",
    price: "999",
    suffix: "p/m",
    description: "Voor bedrijven die IT, website, marketing en automatisering willen combineren.",
    features: [
      "IT-beheer",
      "Websitebeheer",
      "SEO basis",
      "Google bedrijfsprofiel",
      "Automatiseringen",
      "Periodiek advies",
    ],
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section id="prijzen" className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[200px] pointer-events-none" />

      <div className="container px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            Pakketten
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Start simpel, <span className="text-gradient">groei wanneer nodig</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Kies een duidelijke basis voor IT-beheer, websitebeheer en digitale groei. De pakketten hieronder zijn voorbeelden en indicaties.
            Het definitieve pakket maken we één-op-één op maat, afgestemd op de wensen, omgeving en voorkeuren van jouw bedrijf.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto mb-10 p-5 rounded-2xl gradient-card border border-primary/20 text-center">
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Maatwerk staat centraal:</strong> geen enkel bedrijf werkt hetzelfde. Daarom gebruiken we deze pakketten als startpunt,
            maar bepalen we samen wat echt nodig is: aantal gebruikers, apparaten, supportbehoefte, Microsoft 365-inrichting, beveiliging, websitebeheer en eventuele marketing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative p-8 rounded-2xl border transition-all duration-500 ${
                pkg.popular
                  ? "gradient-card border-primary/50 shadow-glow scale-105"
                  : "bg-card border-border/50 hover:border-primary/30"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full gradient-primary text-sm font-semibold text-primary-foreground">
                    <Zap className="w-3 h-3" />
                    Populair
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold mb-2">{pkg.name}</h3>
                <p className="text-muted-foreground text-sm mb-4 min-h-[60px]">{pkg.description}</p>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-muted-foreground text-sm">vanaf €</span>
                    <span className="text-4xl font-bold">{pkg.price}</span>
                    <span className="text-muted-foreground text-sm">{pkg.suffix}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">ex btw · voorbeeldpakket</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={pkg.popular ? "hero" : "outline"}
                className="w-full"
                asChild
              >
                <a href="#contact">Bespreek maatwerkpakket</a>
              </Button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto mt-10 p-8 rounded-2xl gradient-card border border-primary/30 text-center"
        >
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-3">
            Laagdrempelige instap
          </span>
          <h3 className="text-2xl md:text-3xl font-bold mb-3">Microsoft 365 & Werkplek Check</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Een eenmalige controle van je Microsoft 365 omgeving, gebruikers, MFA, rechten, mail,
            Teams, OneDrive en basisbeveiliging. Vanaf €349 ex btw. Daarna adviseren we welk pakket of maatwerkplan het beste past.
          </p>
          <Button variant="hero" asChild>
            <a href="#contact">Plan gratis IT-check</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;