import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Target, Award, Clock } from "lucide-react";

const values = [
  {
    icon: Users,
    title: "Klantgericht",
    description: "Jouw succes is ons succes. We denken mee en leveren oplossingen die écht werken.",
  },
  {
    icon: Target,
    title: "Resultaatgericht",
    description: "Geen praatjes, maar daden. We focussen op meetbare resultaten voor jouw bedrijf.",
  },
  {
    icon: Award,
    title: "Kwaliteit",
    description: "We leveren alleen werk waar we trots op zijn. Geen shortcuts, alleen kwaliteit.",
  },
  {
    icon: Clock,
    title: "Snelheid",
    description: "Met onze 24-uurs garantie bewijzen we dat snel en goed samen kunnen gaan.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero section */}
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
          
          <div className="container px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
                Over Ons
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Wij zijn <span className="text-gradient">Harkas IT</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Een jong en dynamisch IT-bedrijf dat gelooft in de kracht van digitale oplossingen. 
                Wij helpen ondernemers groeien met websites, apps en marketing die werken.
              </p>
            </div>
          </div>
        </section>

        {/* Story section */}
        <section className="py-20 relative">
          <div className="container px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Onze <span className="text-gradient">missie</span>
                </h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  Bij Harkas IT geloven we dat elk bedrijf, groot of klein, toegang verdient tot 
                  hoogwaardige digitale oplossingen. Daarom maken wij professionele websites, 
                  apps en marketing toegankelijk en betaalbaar.
                </p>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  Ons team combineert technische expertise met een passie voor ondernemen. 
                  We begrijpen de uitdagingen waar je als ondernemer tegenaan loopt en bieden 
                  oplossingen die écht impact maken op je bedrijfsresultaten.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <a href="/#contact" className="gap-3">
                    Neem contact op
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl gradient-card border border-border/50 text-center">
                  <p className="text-4xl font-bold text-gradient mb-2">100+</p>
                  <p className="text-muted-foreground">Tevreden klanten</p>
                </div>
                <div className="p-6 rounded-2xl gradient-card border border-border/50 text-center">
                  <p className="text-4xl font-bold text-gradient mb-2">24u</p>
                  <p className="text-muted-foreground">Snelle levering</p>
                </div>
                <div className="p-6 rounded-2xl gradient-card border border-border/50 text-center">
                  <p className="text-4xl font-bold text-gradient mb-2">5★</p>
                  <p className="text-muted-foreground">Gemiddelde score</p>
                </div>
                <div className="p-6 rounded-2xl gradient-card border border-border/50 text-center">
                  <p className="text-4xl font-bold text-gradient mb-2">24/7</p>
                  <p className="text-muted-foreground">Support</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values section */}
        <section className="py-20 relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
          
          <div className="container px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Onze <span className="text-gradient">kernwaarden</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Deze waarden vormen de basis van alles wat we doen
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 text-center group animate-fade-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <value.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-20 relative">
          <div className="container px-6">
            <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl gradient-card border border-border/50">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Klaar om <span className="text-gradient">samen te werken</span>?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Laten we bespreken hoe we jouw bedrijf naar het volgende niveau kunnen tillen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" asChild>
                  <a href="tel:+31851249091" className="gap-2">
                    Bel ons direct
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="/#contact" className="gap-2">
                    Stuur een bericht
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default About;
