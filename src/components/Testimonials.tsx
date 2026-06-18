import { Award, BriefcaseBusiness, Quote, ShieldCheck, Star } from "lucide-react";
import { motion } from "framer-motion";

const trustCards = [
  {
    icon: ShieldCheck,
    title: "Microsoft 365 & security",
    text: "Praktische ervaring met Microsoft 365, Entra ID, MFA, rechtenstructuren, Exchange Online, Teams, SharePoint en werkplekbeheer.",
  },
  {
    icon: BriefcaseBusiness,
    title: "IT én web onder één dak",
    text: "Niet alleen storingen oplossen, maar ook meedenken over websites, automatisering, processen en digitale groei.",
  },
  {
    icon: Award,
    title: "Professionele aanpak",
    text: "Duidelijke afspraken, vaste contactpersoon, begrijpelijke uitleg en oplossingen die passen bij kleine en middelgrote bedrijven.",
  },
];

const certifications = ["Microsoft 365", "Endpoint beheer", "Security basis", "Azure basis", "BiSL", "Scrum PSM1"];

const Testimonials = () => {
  return (
    <section id="vertrouwen" className="py-24 relative">
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="container px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            Vertrouwen
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Een IT-partner die <span className="text-gradient">praktisch meedenkt</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Geen loze beloftes of verzonnen reviews, maar een duidelijke werkwijze: betrouwbaar beheer, veilige basis en begrijpelijke communicatie.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
          {trustCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative p-8 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 group"
            >
              <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Quote className="w-12 h-12 text-primary" />
              </div>

              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <card.icon className="w-7 h-7 text-primary-foreground" />
              </div>

              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                {card.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{card.text}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-5xl mx-auto rounded-2xl gradient-card border border-primary/20 p-6 md:p-8"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 text-primary">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="w-4 h-4 fill-primary" />
                ))}
              </div>
              <h3 className="text-2xl font-semibold mb-2">Klaar voor echte klantreviews</h3>
              <p className="text-muted-foreground max-w-2xl">
                Zodra er verifieerbare reviews of cases zijn, kunnen we deze sectie uitbreiden met namen, logo's en resultaten. Tot die tijd houden we de site eerlijk en professioneel.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
              {certifications.map((item) => (
                <span key={item} className="rounded-full border border-border/50 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
