import { Building2, HeartPulse, GraduationCap, ShoppingBag, Factory, BriefcaseBusiness, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const sectors = [
  {
    icon: Building2,
    title: "MKB",
    description: "Professionele IT, cloud, werkplekken en support zonder dat je een volledige interne IT-afdeling nodig hebt.",
    href: "/diensten/it-beheer",
  },
  {
    icon: BriefcaseBusiness,
    title: "Zakelijke dienstverlening",
    description: "Veilige samenwerking, Microsoft 365, automatisering en digitale oplossingen voor kennisgedreven organisaties.",
    href: "/diensten/microsoft-365-beheer",
  },
  {
    icon: HeartPulse,
    title: "Zorg",
    description: "Van werkplek-IT tot medische techniek en zorgdomotica, met aandacht voor continuïteit en praktische inzetbaarheid.",
    href: "/diensten/zorgtechnologie",
  },
  {
    icon: ShoppingBag,
    title: "Retail & hospitality",
    description: "Betrouwbare netwerken, werkplekken, apparatuur, websites en ondersteuning op locatie.",
    href: "/diensten/installatie-field-services",
  },
  {
    icon: GraduationCap,
    title: "Onderwijs",
    description: "Moderne werkplekken, Microsoft 365, devicebeheer en ondersteuning voor gebruikers en locaties.",
    href: "/diensten/werkplekbeheer",
  },
  {
    icon: Factory,
    title: "Industrie & logistiek",
    description: "IT-infrastructuur, field services, apparatuur en digitale processen voor operationele omgevingen.",
    href: "/diensten/installatie-field-services",
  },
];

const Sectors = () => {
  return (
    <section id="sectoren" className="py-24 border-y border-border/40 bg-card/20">
      <div className="container px-6">
        <div className="grid lg:grid-cols-[0.8fr_1.6fr] gap-12 lg:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-28"
          >
            <span className="inline-block text-primary text-sm font-semibold tracking-[0.18em] uppercase mb-4">
              Sectoren
            </span>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
              Technologie voor organisaties die willen <span className="text-gradient">blijven bewegen.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Harkas IT werkt breed. De techniek verschilt per sector, maar de basis blijft hetzelfde: betrouwbaar, veilig,
              beheersbaar en passend bij de dagelijkse praktijk.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border/60 bg-border/60">
            {sectors.map((sector, index) => (
              <motion.div
                key={sector.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group bg-background p-7 md:p-8 min-h-[230px] flex flex-col"
              >
                <sector.icon className="w-7 h-7 text-primary mb-8" />
                <h3 className="text-xl font-semibold mb-3">{sector.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 flex-1">{sector.description}</p>
                <Link to={sector.href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Bekijk mogelijkheden
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Sectors;
