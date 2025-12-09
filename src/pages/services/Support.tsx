import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "IT helpdesk & support",
  "Strategisch IT advies",
  "Systeembeheer & monitoring",
  "Software implementatie",
  "Training & workshops",
  "SLA overeenkomsten",
];

const Support = () => {
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
                  <BarChart3 className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Support &{" "}
                  <span className="text-gradient">Consultancy</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Professionele IT ondersteuning en strategisch advies voor al uw technische vraagstukken.
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
              <h2 className="text-3xl font-bold mb-6">Betrouwbare IT partner</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                IT is de ruggengraat van moderne bedrijven. Wanneer er iets misgaat, kan dat direct impact hebben op je productiviteit en omzet. Daarom is betrouwbare IT support essentieel.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Wij bieden zowel reactieve support als proactief beheer. Dit betekent dat we niet alleen problemen oplossen, maar ze ook voorkomen door continue monitoring en onderhoud.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Naast technische support bieden we ook strategisch advies. We helpen je de juiste IT-beslissingen te nemen die passen bij je bedrijfsdoelen en budget.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Klaar voor betrouwbare IT support?</h2>
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

export default Support;
