import { ShieldCheck, Globe, Megaphone, Users, Lock, Laptop, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const mainServices = [
  {
    icon: ShieldCheck,
    title: "IT Beheer & Support",
    description: "Voor bedrijven die hun dagelijkse IT professioneel willen regelen zonder eigen IT-afdeling.",
    bullets: ["Microsoft 365 beheer", "Gebruikersbeheer", "Remote support", "Werkplekbeheer", "MFA en basisbeveiliging", "Onboarding en offboarding"],
    link: "/diensten/support",
  },
  {
    icon: KeyRound,
    title: "Microsoft 365 & Entra ID inrichting",
    description: "Een veilige Microsoft-basis met accounts, mail, Teams, SharePoint, MFA en apparaatbeheer.",
    bullets: ["Tenant- en domeininrichting", "Entra ID gebruikers en groepen", "MFA en Conditional Access", "Exchange Online en shared mailboxen", "Teams en SharePoint structuur", "Intune basis voor apparaten"],
    link: "/diensten/support",
  },
  {
    icon: Globe,
    title: "Websites & Webapps",
    description: "Moderne websites en slimme weboplossingen die passen bij je bedrijf.",
    bullets: ["Zakelijke websites", "Landingspagina's", "Webapps", "Websitebeheer", "Hosting, domein en mail", "AI-websites en automatisering"],
    link: "/diensten/websites",
  },
  {
    icon: Megaphone,
    title: "Marketing & Automatisering",
    description: "Meer zichtbaarheid, betere processen en minder handmatig werk.",
    bullets: ["Google bedrijfsprofiel", "SEO basis", "Social media ondersteuning", "Leadformulieren", "Koppelingen", "Digitale groeistrategie"],
    link: "/diensten/marketing",
  },
];

const painPoints = [
  "Nieuwe medewerkers moeten snel accounts en laptops krijgen.",
  "Outlook, Teams, OneDrive of printers zorgen regelmatig voor gedoe.",
  "Je weet niet zeker of MFA, rechten en beveiliging goed staan.",
  "Je website en online uitstraling moeten professioneel blijven.",
  "Je wilt één aanspreekpunt voor IT, web en digitale groei.",
];

const sectors = ["MKB-bedrijven", "Zorgpraktijken", "Fysiopraktijken", "Tandartspraktijken", "Administratiekantoren", "Kinderopvang", "Lokale ondernemers", "Meerdere locaties"];

const Services = () => {
  return (
    <section id="diensten" className="py-24 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      
      <div className="container px-6">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            IT-partner voor je digitale basis
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Geen eigen IT-afdeling, maar wel afhankelijk van <span className="text-gradient">goede IT?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Harkas IT regelt het dagelijkse IT-beheer, je Microsoft 365 en Entra ID omgeving, werkplekken,
            website en digitale groei vanuit één duidelijk aanspreekpunt.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-16"
        >
          {painPoints.map((point, index) => (
            <div key={point} className="p-5 rounded-2xl gradient-card border border-border/50">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary font-semibold">
                {index + 1}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
          {mainServices.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-8 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-glow"
            >
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-7 h-7 text-primary-foreground" />
              </div>

              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                {service.title}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {service.description}
              </p>

              <ul className="space-y-3 mb-6">
                {service.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {bullet}
                  </li>
                ))}
              </ul>

              <Link
                to={service.link}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all duration-300"
              >
                Meer informatie
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch"
        >
          <div className="p-8 rounded-2xl gradient-card border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-semibold">Voorbeelden van klanten die wij helpen</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Hieronder staan voorbeelden van organisaties waarvoor onze aanpak goed past. Staat jouw branche er niet tussen?
              Geen probleem: we kijken altijd naar jouw situatie, systemen, wensen en manier van werken.
            </p>
            <div className="flex flex-wrap gap-3">
              {sectors.map((sector) => (
                <span key={sector} className="px-4 py-2 rounded-xl bg-secondary text-sm text-muted-foreground border border-border/40">
                  {sector}
                </span>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-2xl gradient-card border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-semibold">Praktisch, veilig en duidelijk</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Harkas IT combineert praktijkervaring in IT-support, Microsoft 365, Entra ID, Intune,
              werkplekbeheer, telefonie, cloudbeheer, zorgtechnologie en webontwikkeling.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["Duidelijke afspraken", "Vaste maandbedragen", "Eén aanspreekpunt", "MKB-proof aanpak"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Laptop className="w-4 h-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-16"
        >
          <Button variant="hero" size="lg" asChild>
            <a href="#contact" className="gap-3">
              Plan gratis IT-check
              <ArrowRight className="w-5 h-5" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;