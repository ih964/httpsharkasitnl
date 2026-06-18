import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Technische basiscontrole",
  "SEO-titels en meta descriptions",
  "Lokale vindbaarheid",
  "Google bedrijfsprofiel advies",
  "Website structuur en content",
  "Praktische verbeterpunten",
];

const SEO = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
          <div className="container px-6 relative">
            <Link to="/#diensten" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">← Terug naar diensten</Link>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6"><TrendingUp className="w-8 h-8 text-primary-foreground" /></div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Online vindbaarheid & <span className="text-gradient">SEO-basis</span></h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Een goede website moet ook gevonden en begrepen worden. Harkas IT helpt met een praktische SEO-basis zonder loze beloftes.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <Link to="/#contact" className="gap-3">Laat je site controleren<ArrowRight className="w-5 h-5" /></Link>
                </Button>
              </div>
              <div className="gradient-card rounded-3xl p-8 border border-border/50">
                <h3 className="text-2xl font-semibold mb-6">Wat wij nalopen</h3>
                <ul className="space-y-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-primary" /></div><span className="text-muted-foreground">{feature}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-secondary/30">
          <div className="container px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Eerst de basis goed zetten</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                SEO hoeft niet direct een groot traject te zijn. Vaak begint het met duidelijke pagina’s, goede titels, logische structuur, snelle laadtijd en teksten die aansluiten op wat klanten zoeken.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Harkas IT kijkt vooral praktisch: wat staat goed, wat ontbreekt en welke verbeteringen leveren snel duidelijkheid op voor bezoekers en zoekmachines.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Online vindbaarheid is ondersteunend aan je website, IT-diensten en digitale groei. Geen vage beloftes, maar concrete verbeterpunten.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Wil je weten waar je website beter vindbaar kan worden?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Vraag een praktische website- en vindbaarheidscheck aan.</p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/#contact" className="gap-3">Vraag check aan<ArrowRight className="w-5 h-5" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SEO;
