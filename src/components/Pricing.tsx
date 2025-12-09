import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const packages = [
  {
    name: "Starter",
    price: "499",
    description: "Perfect voor startende ondernemers",
    features: [
      "Professionele website",
      "Responsive design",
      "Basis SEO setup",
      "24 uur oplevering",
      "1 maand support",
    ],
    popular: false,
  },
  {
    name: "Professional",
    price: "999",
    description: "Ideaal voor groeiende bedrijven",
    features: [
      "Alles van Starter",
      "Webshop functionaliteit",
      "Geavanceerde SEO",
      "Social media integratie",
      "3 maanden support",
      "Analytics dashboard",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Op maat",
    description: "Voor gevestigde organisaties",
    features: [
      "Alles van Professional",
      "Custom development",
      "Dedicated account manager",
      "Maandelijkse rapportages",
      "Onbeperkt support",
      "Prioriteit behandeling",
    ],
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section id="prijzen" className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[200px] pointer-events-none" />

      <div className="container px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            Pakketten
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Transparante <span className="text-gradient">prijzen</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Kies het pakket dat bij jouw bedrijf past. Geen verborgen kosten.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {packages.map((pkg, index) => (
            <div
              key={pkg.name}
              className={`relative p-8 rounded-2xl border transition-all duration-500 animate-fade-up ${
                pkg.popular
                  ? "gradient-card border-primary/50 shadow-glow scale-105"
                  : "bg-card border-border/50 hover:border-primary/30"
              }`}
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full gradient-primary text-sm font-semibold text-primary-foreground">
                    <Zap className="w-3 h-3" />
                    Populair
                  </span>
                </div>
              )}

              {/* Package info */}
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold mb-2">{pkg.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{pkg.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  {pkg.price !== "Op maat" && <span className="text-muted-foreground">€</span>}
                  <span className="text-4xl font-bold">{pkg.price}</span>
                  {pkg.price !== "Op maat" && <span className="text-muted-foreground">/project</span>}
                </div>
              </div>

              {/* Features */}
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

              {/* CTA */}
              <Button
                variant={pkg.popular ? "hero" : "outline"}
                className="w-full"
                asChild
              >
                <a href="#contact">Neem contact op</a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
