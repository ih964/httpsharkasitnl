import { ArrowRight, Globe, LifeBuoy, MonitorCog, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const examples = [
  {
    icon: LifeBuoy,
    label: "IT-support",
    title: "Sneller hulp bij dagelijkse IT-vragen",
    description: "Remote meekijken, werkplekproblemen oplossen, gebruikers helpen en zorgen dat vragen niet blijven liggen.",
    points: ["Remote support", "Duidelijke opvolging", "Praktische oplossingen"],
    link: "/diensten/support",
  },
  {
    icon: MonitorCog,
    label: "Microsoft 365",
    title: "Veiligere en overzichtelijke Microsoft-omgeving",
    description: "Gebruikers, mailboxen, Teams, SharePoint, OneDrive, rechten en basisbeveiliging beter organiseren.",
    points: ["Gebruikersbeheer", "MFA en rechten", "Teams en SharePoint"],
    link: "/diensten/support",
  },
  {
    icon: Globe,
    label: "Websites",
    title: "Professionele website die vertrouwen wekt",
    description: "Een duidelijke website of landingspagina die uitlegt wat je doet en bezoekers sneller laat contact opnemen.",
    points: ["Bedrijfswebsite", "Mobielvriendelijk", "Contactgericht"],
    link: "/diensten/websites",
  },
  {
    icon: Workflow,
    label: "Automatisering",
    title: "Minder handmatig werk met slimme flows",
    description: "Formulieren, klantvragen, e-mails of interne stappen slimmer laten verlopen met praktische automatisering.",
    points: ["Formulieren", "Werkflows", "Klantportalen"],
    link: "/diensten/marketing",
  },
];

const Portfolio = () => {
  return (
    <section id="portfolio" className="py-20 md:py-32 relative overflow-hidden">
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="container px-6">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            Praktijkvoorbeelden
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Waar Harkas IT <span className="text-gradient">waarde toevoegt</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Geen opgeblazen cases of verzonnen cijfers, maar duidelijke voorbeelden van situaties waarin Harkas IT ondernemers helpt.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {examples.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group relative p-7 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-glow"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-13 h-13 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <item.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">{item.label}</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{item.description}</p>
              <ul className="space-y-2 mb-6">
                {item.points.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link to={item.link} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all duration-300">
                Bekijk dienst
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto mt-12 p-8 rounded-3xl gradient-card border border-primary/30 text-center"
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-3">Herken je één van deze situaties?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Plan een gratis IT-check of stuur je vraag door. Dan kijken we samen wat de slimste eerste stap is.
          </p>
          <Button variant="hero" asChild>
            <a href="#contact">Plan gratis IT-check</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Portfolio;
