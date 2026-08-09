import { ShieldCheck, Globe, Users, Lock, Laptop, ArrowRight, KeyRound, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const mainServices = [
  {
    icon: ShieldCheck,
    title: "IT Beheer & Support",
    description: "Voor bedrijven in heel Nederland die hun dagelijkse IT professioneel willen regelen zonder eigen IT-afdeling.",
    bullets: ["Gebruikersbeheer", "Remote support", "Werkplekbeheer", "Storingen oplossen", "Onboarding en offboarding", "Proactief meedenken"],
    link: "/diensten/it-beheer",
  },
  {
    icon: KeyRound,
    title: "Microsoft 365 & Security",
    description: "Een veilige Microsoft-basis met accounts, mail, Teams, SharePoint, MFA en apparaatbeheer.",
    bullets: ["Exchange Online", "Teams en SharePoint", "OneDrive", "MFA en rechten", "Intune basis", "Licentieadvies"],
    link: "/diensten/microsoft-365-beheer",
  },
  {
    icon: LifeBuoy,
    title: "Werkplekbeheer & Remote Support",
    description: "Snel hulp op afstand bij laptops, accounts, e-mail, printers, scanners, werkplekproblemen en dagelijkse supportvragen.",
    bullets: ["Nieuwe werkplekken", "Remote meekijken", "Printer/scanner hulp", "Apparaatinstellingen", "Supporttickets", "Duidelijke opvolging"],
    link: "/diensten/remote-support",
  },
  {
    icon: Globe,
    title: "Websites & Automatisering",
    description: "Moderne websites, webapps, formulieren, klantportalen en slimme automatisering voor ondernemers.",
    bullets: ["Bedrijfswebsites", "Webapps", "Klantportalen", "Formulieren", "Harkas Web Builder", "AI en workflows"],
    link: "/diensten/websites",
  },
];

const painPoints = [
  "Nieuwe medewerkers moeten snel accounts, rechten en laptops krijgen.",
  "Outlook, Teams, OneDrive, printers of werkplekken zorgen voor gedoe.",
  "Je weet niet zeker of MFA, rechten en beveiliging goed staan.",
  "Je wilt één aanspreekpunt voor IT, support, web en automatisering.",
  "Je bedrijf groeit, maar je IT-processen groeien nog niet goed mee.",
];

const sectors = ["MKB-bedrijven", "Zorgpraktijken", "Fysiopraktijken", "Tandartspraktijken", "Administratiekantoren", "Kinderopvang", "ZZP en kleine teams", "Meerdere locaties"];

const Services = () => {
  return (
    <section id="diensten" className="py-24 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="container px-6">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">IT die gewoon werkt</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Geen eigen IT-afdeling, maar wel afhankelijk van <span className="text-gradient">betrouwbare IT?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Harkas IT regelt dagelijks IT-beheer, Microsoft 365, werkplekken, support, websites en automatisering voor ondernemers in heel Nederland.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-16">
          {painPoints.map((point, index) => (
            <div key={point} className="p-5 rounded-2xl gradient-card border border-border/50">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary font-semibold">{index + 1}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16 p-8 md:p-10 rounded-3xl gradient-card border border-primary/30 overflow-hidden relative">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-primary/5 blur-3xl pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
            <div>
              <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-3">Support op afstand</span>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Hulp nodig, ook buiten Tiel?</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Veel IT-vragen kunnen snel remote worden opgepakt. Voor klanten in heel Nederland helpt Harkas IT met support, beheer en duidelijke opvolging.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <Button variant="hero" asChild><Link to="/diensten/remote-support">Remote support aanvragen</Link></Button>
              <Button variant="outline" asChild><Link to="/diensten/it-beheer">IT-beheer bekijken</Link></Button>
              <Button variant="outline" asChild><Link to="/it-check">Gratis IT-check starten</Link></Button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
          {mainServices.map((service, index) => (
            <motion.div key={service.title} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: index * 0.1 }} className="group relative p-8 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-glow">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"><service.icon className="w-7 h-7 text-primary-foreground" /></div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">{service.title}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">{service.description}</p>
              <ul className="space-y-3 mb-6">
                {service.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />{bullet}</li>
                ))}
              </ul>
              <Link to={service.link} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all duration-300">Meer informatie<ArrowRight className="w-4 h-4" /></Link>
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="p-8 rounded-2xl gradient-card border border-border/50">
            <div className="flex items-center gap-3 mb-4"><Users className="w-6 h-6 text-primary" /><h3 className="text-2xl font-semibold">Voor wie Harkas IT geschikt is</h3></div>
            <p className="text-muted-foreground mb-6">Onze aanpak past goed bij organisaties in Nederland die professioneel willen werken, maar geen grote interne IT-afdeling hebben.</p>
            <div className="flex flex-wrap gap-3">{sectors.map((sector) => (<span key={sector} className="px-4 py-2 rounded-xl bg-secondary text-sm text-muted-foreground border border-border/40">{sector}</span>))}</div>
          </div>
          <div className="p-8 rounded-2xl gradient-card border border-border/50">
            <div className="flex items-center gap-3 mb-4"><Lock className="w-6 h-6 text-primary" /><h3 className="text-2xl font-semibold">Praktisch, veilig en duidelijk</h3></div>
            <p className="text-muted-foreground mb-6">Harkas IT combineert praktijkervaring in IT-support, Microsoft 365, werkplekbeheer, cloudbeheer, zorgtechnologie, websites en automatisering.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{["Duidelijke afspraken", "Veilige basis", "Eén aanspreekpunt", "MKB-proof aanpak"].map((item) => (<div key={item} className="flex items-center gap-3 text-sm text-muted-foreground"><Laptop className="w-4 h-4 text-primary" />{item}</div>))}</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="text-center mt-16">
          <Button variant="hero" size="lg" asChild><Link to="/it-check" className="gap-3">Plan gratis IT-check<ArrowRight className="w-5 h-5" /></Link></Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
