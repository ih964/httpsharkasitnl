import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Palette, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Logo ontwerp & huisstijl",
  "Visuele identiteit ontwikkeling",
  "Brand guidelines & styleguides",
  "Visitekaartjes & briefpapier",
  "Social media templates",
  "Presentatie templates",
];

const Branding = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
          
          <div className="container px-6 relative">
            <Link to="/#diensten" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
              ← Terug naar diensten
            </Link>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6">
                  <Palette className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Designs &{" "}
                  <span className="text-gradient">Branding</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  De eerste indruk telt. Wij creëren onvergetelijke visuele identiteiten die vertrouwen wekken en jouw merk laten opvallen.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <a href="#contact" className="gap-3">
                    Offerte aanvragen
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </Button>
              </div>
              
              <div className="gradient-card rounded-3xl p-8 border border-border/50">
                <h3 className="text-2xl font-semibold mb-6">Wat wij bieden</h3>
                <ul className="space-y-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 bg-secondary/30">
          <div className="container px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Waarom branding belangrijk is</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Een sterke merkidentiteit is de basis van elk succesvol bedrijf. Het gaat verder dan alleen een logo – het is de complete visuele taal waarmee je communiceert met je doelgroep.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Bij HARKAS IT begrijpen we dat elk bedrijf uniek is. Daarom ontwikkelen we op maat gemaakte brand identiteiten die perfect aansluiten bij jouw visie en doelgroep.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Van het eerste concept tot de definitieve uitwerking, wij begeleiden je door het hele proces om ervoor te zorgen dat jouw merk de aandacht krijgt die het verdient.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Klaar om jouw merk te laten groeien?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Neem contact met ons op voor een vrijblijvend gesprek over de mogelijkheden.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/#contact" className="gap-3">
                Neem contact op
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Branding;
