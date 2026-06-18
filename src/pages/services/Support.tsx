import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Check, KeyRound, Mail, MonitorCog, Users, Lock, LifeBuoy, Laptop } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "IT-beheer en dagelijkse support",
  "Microsoft 365 beheer en optimalisatie",
  "Gebruikers, groepen en mailboxen",
  "Teams, SharePoint en OneDrive ondersteuning",
  "Werkplekbeheer voor laptops en apparaten",
  "MFA, rechten en basisbeveiliging",
  "Onboarding en offboarding van medewerkers",
  "Remote support en duidelijke opvolging",
];

const setupSteps = [
  {
    icon: LifeBuoy,
    title: "Support die snel schakelt",
    text: "Hulp bij dagelijkse IT-vragen, storingen, e-mail, Teams, printers, scanners en werkplekproblemen.",
  },
  {
    icon: KeyRound,
    title: "Microsoft 365 beheer",
    text: "Gebruikers, mailboxen, Teams, SharePoint, OneDrive, rechten en veilige toegang overzichtelijk geregeld.",
  },
  {
    icon: MonitorCog,
    title: "Werkplekken & apparaten",
    text: "Ondersteuning bij laptops, instellingen, updates, basisbeveiliging en apparaatbeheer waar mogelijk.",
  },
  {
    icon: Lock,
    title: "Veilige basis",
    text: "MFA, rechten, accountbeheer en praktische security-checks worden meegenomen in de aanpak.",
  },
];

const serviceBlocks = [
  {
    icon: Users,
    title: "Eenmalige IT-check",
    text: "Voor bedrijven die hun huidige Microsoft 365, werkplekken, rechten en basisbeveiliging willen laten controleren.",
    points: ["Korte inventarisatie", "Microsoft 365 basiscontrole", "Werkplek- en supportadvies", "Duidelijke verbeterpunten"],
  },
  {
    icon: ShieldCheck,
    title: "Maandelijks IT-beheer",
    text: "Voor bedrijven die geen eigen IT-afdeling hebben, maar wel een vaste IT-partner willen voor beheer en support.",
    points: ["Gebruikersbeheer", "Remote support", "Werkplekbeheer", "Maandelijkse controle"],
  },
  {
    icon: Laptop,
    title: "Werkplek & remote support",
    text: "Voor praktische hulp bij laptops, accounts, e-mail, printers, scanners en dagelijkse werkplekproblemen.",
    points: ["Remote meekijken", "Nieuwe werkplekken", "Printer/scanner hulp", "Heldere opvolging"],
  },
];

const Support = () => {
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
                  <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  IT-beheer, Microsoft 365 & <span className="text-gradient">remote support</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Harkas IT helpt ondernemers met dagelijkse IT-support, veilige Microsoft 365-inrichting, werkplekbeheer en duidelijke opvolging zonder onnodig gedoe.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="hero" size="lg" asChild>
                    <Link to="/#contact" className="gap-3">
                      Plan gratis IT-check
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <a href="tel:+31851249091">Bel 085 124 9091</a>
                  </Button>
                </div>
              </div>
              <div className="gradient-card rounded-3xl p-8 border border-border/50">
                <h3 className="text-2xl font-semibold mb-6">Waarmee wij helpen</h3>
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
            <div className="max-w-3xl mx-auto text-center mb-12">
              <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">Aanpak</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Van losse IT-problemen naar een beheerbare basis</h2>
              <p className="text-muted-foreground leading-relaxed">
                Veel kleine bedrijven gebruiken Microsoft 365 en losse apparaten, maar missen structuur. Harkas IT helpt met een praktische basis die veilig, duidelijk en beheersbaar blijft.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {setupSteps.map((step) => (
                <div key={step.title} className="p-6 rounded-2xl gradient-card border border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-6">
            <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
              {serviceBlocks.map((block) => (
                <div key={block.title} className="p-8 rounded-2xl gradient-card border border-border/50">
                  <block.icon className="w-8 h-8 text-primary mb-5" />
                  <h2 className="text-2xl font-bold mb-4">{block.title}</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{block.text}</p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {block.points.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-secondary/30">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Wil je weten waar jouw IT beter kan?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Plan een gratis IT-check. We kijken naar je huidige situatie en geven eerlijk advies over wat beter, veiliger of slimmer kan.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/#contact" className="gap-3">
                Plan gratis IT-check
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
