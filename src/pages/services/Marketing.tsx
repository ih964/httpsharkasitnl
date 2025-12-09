import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Megaphone, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Google Ads campagnes",
  "Facebook & Instagram Ads",
  "LinkedIn advertenties",
  "Remarketing strategieën",
  "A/B testing & optimalisatie",
  "Conversie tracking",
];

const Marketing = () => {
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
                  <Megaphone className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Advertentie{" "}
                  <span className="text-gradient">Marketing</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Complete groei-combinatie met gerichte advertentiecampagnes die jouw ideale klanten bereiken en converteren.
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
              <h2 className="text-3xl font-bold mb-6">Bereik de juiste doelgroep</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Online adverteren is de snelste manier om zichtbaar te worden bij potentiële klanten. Maar zonder de juiste strategie kan het een dure gok zijn. Wij zorgen ervoor dat elke euro meetbaar resultaat oplevert.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Met data-gedreven campagnes op Google, Facebook, Instagram en LinkedIn bereiken we precies de mensen die interesse hebben in jouw producten of diensten. We optimaliseren continu om de beste resultaten te behalen.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Van het opzetten van campagnes tot het analyseren van resultaten, wij nemen het complete advertentiebeheer uit handen zodat jij je kunt focussen op je core business.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Klaar om te groeien met advertenties?</h2>
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

export default Marketing;
