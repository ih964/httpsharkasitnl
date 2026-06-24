import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Globe2 } from "lucide-react";
import { applyPageSeo } from "@/lib/pageSeo";

const pages = {
  "/diensten/it-beheer": {
    title: "IT-beheer voor ondernemers",
    accent: "in heel Nederland",
    seo: "IT-beheer voor ondernemers in Nederland | Harkas IT",
    desc: "Harkas IT helpt ondernemers in Nederland met IT-beheer, Microsoft 365, werkplekbeheer, remote support en veilige IT-basis.",
    intro: "Laat je dagelijkse IT professioneel beheren zonder eigen IT-afdeling. Harkas IT helpt met support, gebruikersbeheer, werkplekken en duidelijke opvolging.",
    bullets: ["Dagelijkse IT-support", "Gebruikersbeheer", "Microsoft 365", "Werkplekbeheer", "Remote hulp", "Heldere afspraken"],
  },
  "/diensten/microsoft-365-beheer": {
    title: "Microsoft 365 beheer uitbesteden",
    accent: "zonder gedoe",
    seo: "Microsoft 365 beheer uitbesteden | Harkas IT",
    desc: "Harkas IT helpt met Microsoft 365 beheer, Exchange Online, Teams, SharePoint, OneDrive, gebruikers, rechten en MFA.",
    intro: "Meer overzicht en veiligheid in Microsoft 365. Van e-mail en Teams tot rechten, groepen, OneDrive en basisbeveiliging.",
    bullets: ["Exchange Online", "Teams", "SharePoint", "OneDrive", "MFA en rechten", "Licentieadvies"],
  },
  "/diensten/werkplekbeheer": {
    title: "Werkplekbeheer voor mkb",
    accent: "en kleine teams",
    seo: "Werkplekbeheer voor mkb | Harkas IT",
    desc: "Werkplekbeheer voor mkb: hulp bij laptops, accounts, printers, scanners, instellingen, support en remote beheer.",
    intro: "Zorg dat medewerkers goed kunnen werken met laptops, e-mail, bestanden, printers en applicaties. Harkas IT helpt praktisch en duidelijk.",
    bullets: ["Laptopinrichting", "Printerhulp", "Scannerhulp", "Accountproblemen", "Remote meekijken", "Nieuwe werkplekken"],
  },
  "/diensten/remote-support": {
    title: "Remote IT-support",
    accent: "voor ondernemers",
    seo: "Remote IT-support voor ondernemers | Harkas IT",
    desc: "Remote IT-support nodig? Harkas IT helpt ondernemers op afstand met Microsoft 365, Outlook, Teams, werkplekken en storingen.",
    intro: "Snel hulp op afstand bij IT-vragen, Microsoft 365, Outlook, Teams, OneDrive, printerproblemen en werkplekstoringen.",
    bullets: ["Hulp op afstand", "Outlook", "Teams", "OneDrive", "Werkplekstoringen", "Duidelijke uitleg"],
  },
  "/diensten/it-support-mkb": {
    title: "IT-support voor mkb-bedrijven",
    accent: "zonder interne IT-afdeling",
    seo: "IT-support voor mkb-bedrijven | Harkas IT",
    desc: "IT-support voor mkb nodig? Harkas IT helpt met support, Microsoft 365, werkplekbeheer, gebruikersbeheer en remote hulp.",
    intro: "Voor mkb-bedrijven die één vast aanspreekpunt willen voor support, Microsoft 365, werkplekken, beveiliging en digitale verbeteringen.",
    bullets: ["Vast aanspreekpunt", "Support op afstand", "Microsoft 365", "Werkplekbeheer", "Security basis", "MKB-proof aanpak"],
  },
} as const;

const NationalLanding = () => {
  const { pathname } = useLocation();
  const page = pages[pathname as keyof typeof pages] ?? pages["/diensten/it-beheer"];

  useEffect(() => {
    applyPageSeo({ title: page.seo, description: page.desc });
  }, [page.seo, page.desc]);

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
                <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-wider uppercase mb-5"><Globe2 className="w-4 h-4" /> Landelijke IT-dienst</span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">{page.title} <span className="text-gradient">{page.accent}</span></h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">{page.intro}</p>
                <Button variant="hero" size="lg" asChild><Link to="/#contact" className="gap-3">Plan gratis IT-check<ArrowRight className="w-5 h-5" /></Link></Button>
              </div>
              <div className="gradient-card rounded-3xl p-8 border border-border/50">
                <h2 className="text-2xl font-semibold mb-6">Waarmee Harkas IT helpt</h2>
                <ul className="space-y-4">
                  {page.bullets.map((bullet) => <li key={bullet} className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-primary" /></span><span className="text-muted-foreground">{bullet}</span></li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 bg-secondary/30">
          <div className="container px-6 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Gevestigd in Tiel, actief in heel Nederland</h2>
            <p className="text-muted-foreground mb-8">Veel IT-vragen kunnen remote worden opgepakt. Zo kan Harkas IT ondernemers door heel Nederland helpen met support, beheer en duidelijke opvolging.</p>
            <Button variant="outline" size="lg" asChild><Link to="/diensten/support">Bekijk IT-beheer & support</Link></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NationalLanding;
