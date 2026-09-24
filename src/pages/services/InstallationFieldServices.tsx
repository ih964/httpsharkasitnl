import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Cable, Laptop, MapPin, Network, Printer, Wrench, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Contact from "@/components/Contact";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieConsent from "@/components/CookieConsent";
import { Button } from "@/components/ui/button";
import { applyPageSeo } from "@/lib/pageSeo";

const capabilities = [
  { icon: Laptop, title: "Werkplekinstallatie", text: "Laptops, desktops, dockingstations, beeldschermen en randapparatuur gebruiksklaar opleveren." },
  { icon: Printer, title: "Printers & scanners", text: "Installatie, netwerkconfiguratie, drivers, wachtrijen en ondersteuning bij vervanging of migratie." },
  { icon: Network, title: "Netwerk & wifi", text: "Plaatsen en configureren van netwerkapparatuur, access points en werkplekaansluitingen binnen afgesproken scope." },
  { icon: Cable, title: "Hardware roll-outs", text: "Gefaseerde uitrol of vervanging van apparatuur op één of meerdere locaties." },
  { icon: MapPin, title: "Field service op locatie", text: "Technische ondersteuning waar remote support niet voldoende is." },
  { icon: Wrench, title: "Migratie & nazorg", text: "Ombouw, verhuizing, vervanging en controle na ingebruikname." },
];

const InstallationFieldServices = () => {
  useEffect(() => {
    applyPageSeo({
      title: "Installatie & Field Services | Harkas IT",
      description: "Harkas IT ondersteunt organisaties met werkplekinstallaties, hardware roll-outs, printers, scanners, netwerkapparatuur en field service op locatie.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="pt-36 pb-20 border-b border-border/50">
          <div className="container px-6">
            <div className="max-w-4xl">
              <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-[0.18em] uppercase mb-5">
                <Wrench className="w-4 h-4" /> Installatie & Field Services
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-7">
                Techniek op locatie, professioneel <span className="text-gradient">geregeld.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed mb-9">
                Van één nieuwe werkplek tot een hardware-uitrol over meerdere locaties. Harkas IT ondersteunt organisaties
                met installatie, configuratie, migratie en technische nazorg.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="hero" size="lg" asChild>
                  <a href="/?aanvraag=field-service#contact">Bespreek een installatieproject <ArrowRight className="w-5 h-5" /></a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/#diensten">Alle diensten</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container px-6">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {capabilities.map((item) => (
                <div key={item.title} className="rounded-3xl border border-border/50 bg-card/40 p-7 md:p-8">
                  <item.icon className="w-8 h-8 text-primary mb-8" />
                  <h2 className="text-xl font-semibold mb-3">{item.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-card/30 border-y border-border/40">
          <div className="container px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">Van voorbereiding tot nazorg</span>
                <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">Eén technisch aanspreekpunt voor de uitvoering.</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  We stemmen vooraf af wat er geplaatst, vervangen of aangesloten moet worden. Daarna voeren we de werkzaamheden
                  gestructureerd uit en leggen we bijzonderheden en vervolgacties duidelijk vast.
                </p>
              </div>
              <div className="space-y-4">
                {["Inventarisatie en voorbereiding", "Installatie en configuratie", "Testen en opleveren", "Documentatie en nazorg"].map((item) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background p-5">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
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

export default InstallationFieldServices;
