import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const packages = [
  {
    name: "IT Start",
    price: "499",
    suffix: "p/m",
    description: "Voor kleine bedrijven die hun IT-support, Microsoft 365 en basisbeheer professioneel willen regelen.",
    features: [
      "Microsoft 365 basisbeheer",
      "Remote support",
      "4 supporturen per maand",
      "Gebruikersbeheer",
      "MFA/security basischeck",
      "Extra uren in overleg",
    ],
    popular: false,
  },
  {
    name: "IT Beheer Plus",
    price: "699",
    suffix: "p/m",
    description: "Voor bedrijven die naast support ook structureel werkplekbeheer en Microsoft 365-beheer willen.",
    features: [
      "Alles van IT Start",
      "Werkplekbeheer basis",
      "Teams/SharePoint ondersteuning",
      "Maandelijkse controle",
      "Onboarding/offboarding",
      "Vast aanspreekpunt",
    ],
    popular: true,
  },
  {
    name: "IT + Web",
    price: "999",
    suffix: "p/m",
    description: "Voor bedrijven die IT-beheer willen combineren met websitebeheer, formulieren en automatisering.",
    features: [
      "IT-beheer en support",
      "Websitebeheer",
      "Kleine websitewijzigingen",
      "Formulieren en workflows",
      "Domein/mail/hosting hulp",
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
            Duidelijke IT-basis, <span className="text-gradient">op maat uit te breiden</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            De pakketten hieronder zijn voorbeeldpakketten. Het definitieve voorstel stemmen we af op je aantal gebruikers, apparaten, Microsoft 365-omgeving, supportbehoefte en gewenste responstijd.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto mb-10 p-5 rounded-2xl gradient-card border border-primary/20 text-center">
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Maatwerk staat centraal:</strong> ieder bedrijf werkt anders. Daarom gebruiken we deze pakketten als startpunt en bepalen we samen wat echt nodig is.
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
                <a href="#contact">Bespreek pakket</a>
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
            Een eenmalige controle van je Microsoft 365 omgeving, gebruikers, MFA, rechten, mail, Teams, OneDrive en basisbeveiliging. Vanaf €349 ex btw. Daarna adviseren we welk pakket of maatwerkplan het beste past.
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
