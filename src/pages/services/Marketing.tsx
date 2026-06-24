import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Megaphone, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { applyPageSeo } from "@/lib/pageSeo";

const features = [
  "Formulieren automatisch verwerken",
  "E-mails omzetten naar acties of tickets",
  "Klantportalen en aanvraagflows",
  "Microsoft 365 workflows",
  "AI-ondersteuning voor processen",
  "Koppelingen tussen tools",
];

const Marketing = () => {
  useEffect(() => {
    applyPageSeo({
      title: "Automatisering & Slimmer Werken | Harkas IT",
      description: "Harkas IT helpt ondernemers met praktische automatisering, formulieren, workflows, klantportalen en Microsoft 365-processen.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
          <div className="container px-6 relative">
            <Link to="/#diensten" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
              Terug naar diensten
            </Link>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6">
                  <Megaphone className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Slimmer werken met <span className="text-gradient">automatisering</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Minder handmatig werk, betere opvolging en duidelijkere processen. Harkas IT helpt met praktische automatisering die past bij je bedrijf.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <Link to="/#contact" className="gap-3">
                    Bespreek automatisering
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
              <div className="gradient-card rounded-3xl p-8 border border-border/50">
                <h3 className="text-2xl font-semibold mb-6">Voorbeelden van automatisering</h3>
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

        <section className="py-20 bg-secondary/30">
          <div className="container px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Van losse handelingen naar slimme workflows</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Veel ondernemers verliezen tijd aan dezelfde terugkerende taken: aanvragen handmatig verwerken, e-mails opvolgen, klanten informeren of gegevens overtypen tussen systemen.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Harkas IT kijkt welke stappen slimmer kunnen. Denk aan formulieren, ticketflows, klantportalen, e-mailautomatisering, Microsoft 365-workflows en AI-ondersteuning.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We beginnen praktisch: eerst het proces begrijpen, daarna pas automatiseren wat echt waarde toevoegt.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Welke taak kost jou nu te veel tijd?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Vertel waar je in je proces tegenaan loopt. Dan kijken we welke automatisering logisch is.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/#contact" className="gap-3">
                Bespreek je proces
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
