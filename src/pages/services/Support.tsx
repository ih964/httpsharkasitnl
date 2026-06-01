import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Check, KeyRound, Mail, MonitorCog, Users, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Microsoft 365 tenant inrichting of optimalisatie",
  "Entra ID gebruikers, groepen en rollen",
  "MFA, security defaults en Conditional Access basis",
  "Exchange Online, shared mailboxen en aliassen",
  "Teams en SharePoint basisstructuur",
  "Intune basis voor werkplekken en apparaten",
  "Onboarding en offboarding van medewerkers",
  "Remote support en praktisch beheer",
];

const setupSteps = [
  {
    icon: KeyRound,
    title: "Accounts & toegang",
    text: "Gebruikers, groepen, beheerrollen, MFA en veilige admin-accounts worden netjes ingericht.",
  },
  {
    icon: Mail,
    title: "E-mail & samenwerking",
    text: "Exchange Online, shared mailboxen, Teams, SharePoint en basisrechten worden overzichtelijk opgezet.",
  },
  {
    icon: MonitorCog,
    title: "Werkplekken & beheer",
    text: "Basis voor apparaten, updates, beveiliging, OneDrive en werkplekbeheer via Intune waar mogelijk.",
  },
  {
    icon: Lock,
    title: "Security basis",
    text: "MFA, rechten, DKIM/SPF/DMARC, adminbeveiliging en offboarding-proces worden meegenomen.",
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
              ← Terug naar diensten
            </Link>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Microsoft 365, Entra ID & <span className="text-gradient">IT-beheer</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Een veilige en overzichtelijke Microsoft-omgeving voor mkb-bedrijven: accounts, mail,
                  Teams, SharePoint, MFA, werkplekken en praktisch dagelijks beheer.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <Link to="/#contact" className="gap-3">
                    Vraag Microsoft 365 check aan
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
              
              <div className="gradient-card rounded-3xl p-8 border border-border/50">
                <h3 className="text-2xl font-semibold mb-6">Wat wij inrichten en beheren</h3>
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
              <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
                Veilige Microsoft-basis
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Voorkom losse accounts, onduidelijke rechten en onbeheerde apparaten</h2>
              <p className="text-muted-foreground leading-relaxed">
                Veel kleine bedrijven gebruiken Microsoft 365, maar hebben geen duidelijke inrichting. Harkas IT helpt
                met een praktische basis die veilig, beheerbaar en begrijpelijk blijft.
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
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl gradient-card border border-border/50">
                <Users className="w-8 h-8 text-primary mb-5" />
                <h2 className="text-2xl font-bold mb-4">Eenmalige inrichting</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Voor bedrijven die Microsoft 365 professioneel willen opzetten of hun bestaande omgeving willen laten nalopen.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>• Tenant- en domeincontrole</li>
                  <li>• Gebruikers, groepen en mailboxen</li>
                  <li>• MFA en basisbeveiliging</li>
                  <li>• Teams/SharePoint basisstructuur</li>
                  <li>• Oplevering met duidelijke afspraken</li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl gradient-card border border-border/50">
                <ShieldCheck className="w-8 h-8 text-primary mb-5" />
                <h2 className="text-2xl font-bold mb-4">Maandelijks beheer</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Voor bedrijven die geen eigen IT-afdeling hebben, maar wel een vaste IT-partner willen voor beheer en support.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>• Gebruikersbeheer en support</li>
                  <li>• Mailboxen, rechten en groepen</li>
                  <li>• Werkplekbeheer en Intune basis</li>
                  <li>• Security-checks en advies</li>
                  <li>• Duidelijke afspraken over meerwerk</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-secondary/30">
          <div className="container px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Wil je weten of je Microsoft 365 goed staat?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Vraag een korte Microsoft 365 & Entra ID check aan. Dan kijken we naar accounts, MFA, rechten, mail en basisbeveiliging.
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
