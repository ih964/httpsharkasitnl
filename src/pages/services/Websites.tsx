import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Responsive website ontwerp",
  "E-commerce webshops",
  "Web applicaties op maat",
  "Mobile apps (iOS & Android)",
  "CMS integratie",
  "Hosting & onderhoud",
];

const Websites = () => {
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
                  <Globe className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Websites &{" "}
                  <span className="text-gradient">Apps</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Efficiënte digitale systemen die meer leads aantrekken, je winst vergroten en je bedrijf laten bloeien.
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
              <h2 className="text-3xl font-bold mb-6">Websites die resultaat leveren</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Een website is meer dan een digitaal visitekaartje. Het is jouw 24/7 verkoper die leads genereert en klanten overtuigt. Wij bouwen websites die niet alleen mooi zijn, maar ook converteren.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Of je nu een simpele bedrijfswebsite nodig hebt of een complexe web applicatie, wij hebben de expertise om jouw visie werkelijkheid te maken. Met de nieuwste technologieën zorgen we voor snelle, veilige en schaalbare oplossingen.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Na oplevering staan we klaar voor onderhoud en updates, zodat jouw digitale aanwezigheid altijd optimaal blijft functioneren.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Klaar voor een nieuwe website?</h2>
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

export default Websites;
