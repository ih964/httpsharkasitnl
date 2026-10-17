import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ClipboardCheck, KeyRound, Laptop, ShieldCheck, ShieldAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { applyPageSeo } from "@/lib/pageSeo";

const focusAreas = [
  {
    icon: KeyRound,
    title: "Identiteit & toegang",
    text: "Maak ongewenste toegang moeilijker met sterke accountbeveiliging en zorgvuldig rechtenbeheer.",
    points: ["MFA & Conditional Access", "Microsoft Entra ID", "Account- en rechtenbeheer"],
  },
  {
    icon: Laptop,
    title: "Werkplekken & apparaten",
    text: "Een veiliger fundament voor laptops en zakelijke apparaten binnen je organisatie.",
    points: ["Microsoft Intune", "Microsoft Defender", "Updates & security-instellingen"],
  },
  {
    icon: ShieldAlert,
    title: "Inzicht in cyberrisico's",
    text: "Breng kwetsbaarheden in de inrichting in beeld en werk aan praktische verbeterpunten.",
    points: ["Security quickscan", "Microsoft 365-beveiligingscontrole", "Prioriteiten & verbeteradvies"],
  },
  {
    icon: RotateCcw,
    title: "Continuïteit & herstel",
    text: "Bereid je beter voor op uitval, ransomware en het verlies van belangrijke gegevens.",
    points: ["Back-up & hersteladvies", "Basis voor incidentrespons", "Beheer- en controleafspraken"],
  },
];

const steps = [
  {
    number: "01",
    title: "Inventarisatie",
    text: "We bekijken je IT-omgeving, risico's en bestaande beveiligingsmaatregelen. Een uitgebreide scan spreken we vooraf af.",
  },
  {
    number: "02",
    title: "Gericht beveiligingsplan",
    text: "Je ontvangt concrete aanbevelingen, een prioritering en een voorstel voor de benodigde werkzaamheden.",
  },
  {
    number: "03",
    title: "Inrichting & beheer",
    text: "We helpen bij de afgesproken verbeteringen en kunnen periodiek onderhoud of controles vastleggen.",
  },
];

const Cybersecurity = () => {
  useEffect(() => {
    applyPageSeo({
      title: "Cybersecurity voor bedrijven | Microsoft 365 beveiliging | Harkas IT",
      description: "Harkas IT helpt bedrijven met cybersecurity, MFA, Conditional Access, Microsoft Defender, Intune, security quickscans en veilig Microsoft 365-beheer.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
          <div className="container px-5 sm:px-6 relative">
            <Link to="/#diensten" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
              Terug naar expertises
            </Link>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary font-semibold mb-6">
                  <ShieldCheck className="w-4 h-4" /> Cybersecurity
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Sterkere digitale beveiliging voor <span className="text-gradient">jouw organisatie.</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
                  Cyberdreigingen raken ook kleine en middelgrote bedrijven. Harkas IT helpt met praktische
                  bescherming van Microsoft 365, accounts, apparaten en bedrijfsgegevens. Geen ingewikkelde
                  plannen zonder uitvoering, maar verbeteringen die bij je omgeving passen.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  <Button variant="hero" size="lg" className="h-auto min-h-12 whitespace-normal text-center" asChild>
                    <a href="/?aanvraag=security#contact" className="gap-2">
                      Bespreek je beveiliging <ArrowRight className="w-5 h-5 shrink-0" />
                    </a>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <a href="mailto:info@harkasit.nl?subject=Cybersecurity%20aanvraag">Mail ons direct</a>
                  </Button>
                </div>
              </div>
              <div className="gradient-card rounded-3xl p-7 sm:p-9 border border-border/50">
                <ClipboardCheck className="w-10 h-10 text-primary mb-5" />
                <h2 className="text-2xl font-semibold mb-5">Wat een veilige basis vraagt</h2>
                <ul className="space-y-4">
                  {[
                    "Accounts beschermen met MFA en sterke toegangsregels",
                    "Apparaten beheren en tijdig beveiligingsupdates toepassen",
                    "Microsoft 365 en cloudinstellingen gericht controleren",
                    "Risico's herkennen en herstel vooraf voorbereiden",
                    "Duidelijke afspraken over controles en opvolging",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-secondary/30">
          <div className="container px-5 sm:px-6">
            <div className="max-w-3xl mb-12">
              <span className="text-primary text-sm font-semibold tracking-[0.16em] uppercase">Onze aanpak</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4">
                Cybersecurity die aansluit op je dagelijkse IT
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We richten ons op preventie, inzicht en herstelbaarheid. Welke producten, controles en
                beheerdiensten passend zijn, hangt af van je omgeving en de gemaakte afspraken.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {focusAreas.map((area) => (
                <article key={area.title} className="rounded-3xl p-7 sm:p-8 gradient-card border border-border/50">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
                    <area.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{area.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-5">{area.text}</p>
                  <ul className="space-y-2">
                    {area.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-5 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-10">Van inzicht naar <span className="text-gradient">gerichte verbetering</span></h2>
            <div className="grid md:grid-cols-3 gap-5">
              {steps.map((step) => (
                <div key={step.number} className="rounded-3xl p-7 gradient-card border border-border/50">
                  <span className="text-primary font-bold tracking-widest text-sm">{step.number}</span>
                  <h3 className="font-semibold text-xl mt-5 mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-8 max-w-4xl">
              Cybersecurity is maatwerk. Eventuele scans, implementatie, monitoring en incidentondersteuning vallen alleen binnen
              de overeengekomen scope; absolute bescherming tegen cyberincidenten kunnen we niet garanderen.
            </p>
          </div>
        </section>

        <section className="py-20 bg-secondary/30">
          <div className="container px-5 sm:px-6 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Weet jij hoe veilig je IT-omgeving is?</h2>
            <p className="text-muted-foreground mb-8">
              Bespreek je huidige situatie en ontdek welke beveiligingsstappen als eerste waarde toevoegen.
            </p>
            <Button variant="hero" size="lg" className="h-auto min-h-12 whitespace-normal text-center" asChild>
              <a href="/?aanvraag=security#contact" className="gap-2">
                Plan een cybersecurity-kennismaking <ArrowRight className="w-5 h-5 shrink-0" />
              </a>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Cybersecurity;
