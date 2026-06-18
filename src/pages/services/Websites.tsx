import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Professionele bedrijfswebsites",
  "Landingspagina's en conversiepagina's",
  "Webapps en klantportalen",
  "Formulieren en aanvraagflows",
  "Harkas Web Builder oplossingen",
  "Hosting, domein en mail advies",
];

const Websites = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
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
                  Websites, webapps & <span className="text-gradient">automatisering</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Moderne websites en slimme digitale oplossingen die passen bij je bedrijf. Niet alleen mooi, maar praktisch, snel en gericht op resultaat.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <Link to="/#contact" className="gap-3">
                    Bespreek je website of webapp
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
              
              <div className="gradient-card rounded-3xl p-8 border border-border/50">
                <h3 className="text-2xl font-semibold mb-6">Wat wij bouwen en beheren</h3>
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
              <h2 className="text-3xl font-bold mb-6">Digitale oplossingen die je bedrijf vooruit helpen</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Een website moet meer doen dan er goed uitzien. De site moet duidelijk uitleggen wat je doet, vertrouwen wekken, contactaanvragen opleveren en goed werken op mobiel.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Harkas IT helpt met bedrijfswebsites, webapps, formulieren, klantportalen en slimme automatisering. Zo worden je website en processen onderdeel van je dagelijkse bedrijfsvoering.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Na oplevering kunnen we helpen met beheer, kleine wijzigingen, domein/mail/hosting-vragen en verdere verbeteringen.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Wil je een website die professioneel voelt én praktisch werkt?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Neem contact op voor een vrijblijvend gesprek over je website, webapp of automatiseringsidee.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/#contact" className="gap-3">
                Bespreek je idee
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
