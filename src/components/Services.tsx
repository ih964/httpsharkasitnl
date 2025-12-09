import { Palette, Globe, Megaphone, TrendingUp, Smartphone, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const services = [
  {
    icon: Palette,
    title: "Designs & Branding",
    description: "De eerste indruk telt. Maak het onvergetelijk en bouw aan een merk dat vertrouwen wekt.",
    link: "#branding",
  },
  {
    icon: Globe,
    title: "Websites & Apps",
    description: "Efficiënte systemen die meer leads aantrekken, je winst vergroten en je bedrijf laten bloeien.",
    link: "#websites",
  },
  {
    icon: Megaphone,
    title: "Advertentie Marketing",
    description: "Complete groei-combinatie met website, webshop of app + advertentie marketing.",
    link: "#marketing",
  },
  {
    icon: TrendingUp,
    title: "SEO Optimalisatie",
    description: "Verbeter je online zichtbaarheid en bereik meer potentiële klanten organisch.",
    link: "#seo",
  },
  {
    icon: Smartphone,
    title: "Social Media",
    description: "Strategisch beheer van je social media kanalen voor maximale betrokkenheid.",
    link: "#social",
  },
  {
    icon: BarChart3,
    title: "Support & Consultancy",
    description: "Professionele ondersteuning en advies voor al uw IT-vraagstukken.",
    link: "#support",
  },
];

const Services = () => {
  return (
    <section id="diensten" className="py-24 relative">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      
      <div className="container px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            Onze Diensten
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Wij doen het werk,{" "}
            <span className="text-gradient">jij ziet het resultaat</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Van branding tot marketing, wij hebben alles in huis om jouw bedrijf te laten groeien.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group relative p-8 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-glow animate-fade-up"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-7 h-7 text-primary-foreground" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                {service.title}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {service.description}
              </p>

              {/* Link */}
              <a
                href={service.link}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all duration-300"
              >
                Meer informatie
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Button variant="hero" size="lg" asChild>
            <a href="#contact" className="gap-3">
              Wat heb je nodig?
              <ArrowRight className="w-5 h-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;
