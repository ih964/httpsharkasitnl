import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Smartphone, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Content creatie & planning",
  "Community management",
  "Instagram & Facebook beheer",
  "LinkedIn strategie",
  "TikTok marketing",
  "Analytics & rapportages",
];

const SocialMedia = () => {
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
                  <Smartphone className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Social{" "}
                  <span className="text-gradient">Media</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Strategisch beheer van je social media kanalen voor maximale betrokkenheid en merkbekendheid.
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
              <h2 className="text-3xl font-bold mb-6">Bouw een sterk online merk</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Social media is de plek waar je doelgroep dagelijks actief is. Met de juiste strategie en content kun je hier een sterke band opbouwen met je (potentiële) klanten.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Wij nemen het complete social media beheer uit handen: van het bedenken van content tot het plaatsen en reageren op comments. Zo blijf jij consistent aanwezig zonder dat het ten koste gaat van je tijd.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Met een mix van organische content en betaalde campagnes zorgen we voor maximale zichtbaarheid en engagement. Maandelijkse rapportages geven inzicht in de resultaten.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Klaar om social media serieus aan te pakken?</h2>
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

export default SocialMedia;
