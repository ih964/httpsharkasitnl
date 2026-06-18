import { ShieldCheck, Globe, Megaphone, Users, Lock, Laptop, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const mainServices = [
  {
    icon: ShieldCheck,
    title: "Managed IT & Support",
    description: "Voor bedrijven die hun dagelijkse IT professioneel willen regelen zonder eigen IT-afdeling.",
    bullets: ["Werkplekbeheer", "Remote support", "Gebruikersbeheer", "Onboarding/offboarding", "Printer, mail en Teams support", "Periodieke controle"],
    link: "/diensten/support",
  },
  {
    icon: KeyRound,
    title: "Microsoft 365, Entra ID & Intune",
    description: "Een veilige Microsoft-basis met accounts, mail, Teams, SharePoint, MFA, rechten en apparaatbeheer.",
    bullets: ["Tenant- en domeininrichting", "Exchange Online", "Teams en SharePoint", "MFA en Conditional Access", "Intune basisbeheer", "Rechten en security review"],
    link: "/diensten/support",
  },
  {
    icon: Globe,
    title: "Websites, hosting & webapps",
    description: "Moderne websites en slimme weboplossingen die je bedrijf beter vindbaar en professioneler maken.",
    bullets: ["Zakelijke websites", "Landingspagina's", "Webapps", "Websitebeheer", "Domein, hosting en mail", "Conversie en formulieren"],
    link: "/diensten/websites",
  },
  {
    icon: Megaphone,
    title: "Automatisering & digitale groei",
    description: "Minder handmatig werk, betere opvolging en meer online zichtbaarheid.",
    bullets: ["Google bedrijfsprofiel", "SEO basis", "Leadformulieren", "Procesautomatisering", "AI-ondersteuning", "Digitale groeistrategie"],
    link: "/diensten/marketing",
  },
];

const painPoints = [
  "Nieuwe medewerkers moeten snel en veilig toegang krijgen tot mail, Teams en bestanden.",
  "Outlook, OneDrive, printers, laptops of rechten zorgen te vaak voor onderbreking.",
  "Je weet niet zeker of MFA, accounts, apparaten en bestanden goed beveiligd zijn.",
  "Je website moet professioneler worden en beter aanvragen opleveren.",
  "Je wilt één aanspreekpunt voor IT, Microsoft 365, web en automatisering.",
];

const sectors = ["MKB-bedrijven", "Zorgpraktijken", "Fysiopraktijken", "Tandartspraktijken", "Administratiekantoren", "Kinderopvang", "Lokale ondernemers", "Bedrijven met meerdere locaties"];

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
            Alles wat je nodig hebt voor <span className="text-gradient">stabiele en veilige bedrijfs-IT</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Harkas IT combineert dagelijks IT-beheer, Microsoft 365, werkplekbeheer, websites en automatisering in één praktische aanpak voor ondernemers.
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
              <h3 className="text-2xl font-semibold">Voor wie Harkas IT ideaal is</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Harkas IT is vooral sterk voor kleine en middelgrote organisaties die professioneel willen werken, maar geen volledige interne IT-afdeling hebben.
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
              <h3 className="text-2xl font-semibold">Praktisch, veilig en schaalbaar</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              We richten je basis goed in, houden het overzichtelijk en zorgen dat je bedrijf kan doorgroeien zonder onnodige complexiteit.
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
