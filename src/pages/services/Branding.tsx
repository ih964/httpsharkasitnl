import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Palette, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Professionele online uitstraling",
  "Logo en basis-huisstijl advies",
  "Kleuren, typografie en visuele lijn",
  "Website stijlconsistentie",
  "Social profielen netjes afstemmen",
  "Praktische brand-richtlijnen",
];

const Branding = () => {
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
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6"><Palette className="w-8 h-8 text-primary-foreground" /></div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Online uitstraling & <span className="text-gradient">visuele basis</span></h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Een professionele website begint met een duidelijke visuele basis. Harkas IT helpt je uitstraling netjes, betrouwbaar en consistent te maken.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <Link to="/#contact" className="gap-3">Bespreek je uitstraling<ArrowRight className="w-5 h-5" /></Link>
                </Button>
              </div>
              <div className="gradient-card rounded-3xl p-8 border border-border/50">
                <h3 className="text-2xl font-semibold mb-6">Waarmee wij helpen</h3>
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
              <h2 className="text-3xl font-bold mb-6">Betrouwbaar en herkenbaar overkomen</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Voor veel ondernemers hoeft branding niet onnodig groot of ingewikkeld te zijn. Wat vooral telt: een duidelijke uitstraling, herkenbare kleuren, nette teksten en een website die vertrouwen wekt.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                We stemmen je visuele basis af op je website, contactmomenten en online profielen. Zo voelt je bedrijf professioneler zonder dat je direct een compleet brandingtraject nodig hebt.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Branding blijft bij Harkas IT ondersteunend aan je website en digitale omgeving, niet de hoofdpropositie.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Wil je professioneler overkomen?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">We kijken graag mee naar je website, logo, kleuren en online uitstraling.</p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/#contact" className="gap-3">Neem contact op<ArrowRight className="w-5 h-5" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Branding;
