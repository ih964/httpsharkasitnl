import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Smartphone, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Google bedrijfsprofiel basis",
  "LinkedIn profielbasis",
  "Consistente contactgegevens",
  "Website en profielen koppelen",
  "Praktische contentideeën",
  "Basisadvies voor online aanwezigheid",
];

const SocialMedia = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
          <div className="container px-6 relative">
            <Link to="/#diensten" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">Terug naar diensten</Link>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6"><Smartphone className="w-8 h-8 text-primary-foreground" /></div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Online aanwezigheid en <span className="text-gradient">profielbasis</span></h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">Zorg dat je bedrijf online betrouwbaar en consistent overkomt. Harkas IT helpt met de praktische basis van je online profielen.</p>
                <Button variant="hero" size="lg" asChild><Link to="/#contact" className="gap-3">Bespreek online basis<ArrowRight className="w-5 h-5" /></Link></Button>
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
              <h2 className="text-3xl font-bold mb-6">Consistent zichtbaar zonder gedoe</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">Je website, Google profiel, LinkedIn en andere online plekken moeten hetzelfde verhaal vertellen. Dat wekt vertrouwen en voorkomt verwarring bij klanten.</p>
              <p className="text-muted-foreground mb-6 leading-relaxed">Harkas IT helpt vooral met de praktische basis: goede profielteksten, juiste contactgegevens, koppelingen naar je website en eenvoudige contentideeën.</p>
              <p className="text-muted-foreground leading-relaxed">Online aanwezigheid blijft ondersteunend. De kern blijft betrouwbare IT, support en digitale oplossingen.</p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Wil je online professioneler overkomen?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">We kijken mee naar je website, profielen en contactpunten.</p>
            <Button variant="hero" size="lg" asChild><Link to="/#contact" className="gap-3">Neem contact op<ArrowRight className="w-5 h-5" /></Link></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SocialMedia;
