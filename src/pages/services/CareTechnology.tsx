import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Activity, AlarmClock, ArrowRight, Cable, HeartPulse, Network, ShieldCheck, Stethoscope, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Contact from "@/components/Contact";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieConsent from "@/components/CookieConsent";
import { Button } from "@/components/ui/button";
import { applyPageSeo } from "@/lib/pageSeo";

const medicalItems = [
  "Werkstations en medische randapparatuur technisch aansluiten",
  "Drivers, USB- en seriële verbindingen configureren",
  "Ondersteuning bij ECG- en bloeddrukapparatuur aan de IT-zijde",
  "Storingen tussen apparaat, werkstation en applicatie onderzoeken",
  "Werkplek- en netwerkvoorwaarden controleren",
];

const domoticsItems = [
  "Technische ondersteuning rond personenalarmering en oproepsystemen",
  "Sensoren, netwerkcomponenten en gekoppelde werkplekken",
  "Deur-, toegangs- en signaleringsoplossingen binnen de IT-scope",
  "Implementatieondersteuning en technische ingebruikname",
  "Eerstelijns analyse en afstemming met leveranciers",
];

const CareTechnology = () => {
  useEffect(() => {
    applyPageSeo({
      title: "Zorgtechnologie, Medische Techniek & Zorgdomotica | Harkas IT",
      description: "Harkas IT ondersteunt zorgorganisaties met medische techniek aan de IT-zijde, medische randapparatuur, zorgdomotica, koppelingen, werkplekken en technische implementatie.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="pt-36 pb-20 border-b border-border/50 relative overflow-hidden">
          <div className="absolute right-0 top-20 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[160px] pointer-events-none" />
          <div className="container px-6 relative">
            <div className="max-w-4xl">
              <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-[0.18em] uppercase mb-5">
                <HeartPulse className="w-4 h-4" /> Zorgtechnologie
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-7">
                IT en techniek die de <span className="text-gradient">zorgpraktijk ondersteunen.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed mb-9">
                Harkas IT helpt zorgorganisaties bij de technische kant van medische apparatuur, werkplekken, koppelingen
                en zorgdomotica. Praktisch, op locatie en in samenwerking met leveranciers waar nodig.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="hero" size="lg" asChild>
                  <a href="/?aanvraag=zorgtechnologie#contact">Bespreek een zorgtechnologie-vraag <ArrowRight className="w-5 h-5" /></a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/#sectoren">Bekijk alle sectoren</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container px-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <article className="rounded-3xl border border-border/50 bg-card/40 p-8 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary uppercase tracking-wider">Expertise</p>
                    <h2 className="text-2xl md:text-3xl font-bold">Medische techniek</h2>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Ondersteuning rondom de IT-technische werking van medische apparatuur en medische randapparatuur,
                  waaronder werkstations, drivers, interfaces en verbindingen met zorgapplicaties.
                </p>
                <div className="space-y-4">
                  {medicalItems.map((item) => (
                    <div key={item} className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-border/50 bg-card/40 p-8 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <AlarmClock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary uppercase tracking-wider">Expertise</p>
                    <h2 className="text-2xl md:text-3xl font-bold">Zorgdomotica</h2>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Technische ondersteuning bij slimme zorgomgevingen: van alarmering en sensoren tot netwerkcomponenten,
                  gekoppelde systemen en ondersteuning bij ingebruikname.
                </p>
                <div className="space-y-4">
                  {domoticsItems.map((item) => (
                    <div key={item} className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="py-20 bg-card/30 border-y border-border/40">
          <div className="container px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: Activity, title: "Apparaat & werkplek", text: "Technische verbinding tussen apparatuur, Windows-werkplek en applicatie." },
                { icon: Cable, title: "Interfaces", text: "USB, seriële verbindingen, drivers en randapparatuur." },
                { icon: Network, title: "Netwerk & koppelingen", text: "De IT-voorwaarden achter verbonden zorgtechnologie." },
                { icon: ShieldCheck, title: "Samenwerking", text: "Afstemming met interne IT, leveranciers en geautoriseerde onderhoudspartijen." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/50 bg-background p-6">
                  <item.icon className="w-6 h-6 text-primary mb-5" />
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-muted-foreground max-w-4xl">
              Harkas IT richt zich op installatie, configuratie, koppeling en IT-technische ondersteuning. Kalibratie,
              medisch-inhoudelijke validatie of onderhoud waarvoor fabrikant- of wettelijke certificering vereist is,
              wordt uitgevoerd door de daarvoor bevoegde partij.
            </p>
          </div>
        </section>

        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieConsent />
    </div>
  );
};

export default CareTechnology;
