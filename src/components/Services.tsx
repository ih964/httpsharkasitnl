import {
  ArrowUpRight,
  CloudCog,
  Code2,
  HeartPulse,
  Headphones,
  Megaphone,
  Network,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const services = [
  {
    icon: CloudCog,
    number: "01",
    title: "IT & Cloud",
    description: "Een moderne, beheersbare IT-basis voor je organisatie: Microsoft 365, cloud, identity en werkplekken.",
    points: ["Microsoft 365", "Cloud & identity", "Modern workplace"],
    href: "/diensten/microsoft-365-beheer",
    featured: true,
  },
  {
    icon: Headphones,
    number: "02",
    title: "Managed IT & Support",
    description: "Dagelijks IT-beheer, gebruikerssupport en proactieve ondersteuning zonder zelf alles te hoeven organiseren.",
    points: ["IT-beheer", "Remote support", "On- & offboarding"],
    href: "/diensten/it-beheer",
  },
  {
    icon: Network,
    number: "03",
    title: "Netwerk & Security",
    description: "De technische basis achter veilig werken: netwerk, apparaten, toegang en Microsoft-beveiliging.",
    points: ["Netwerk & wifi", "Devicebeheer", "MFA & toegangsbeheer"],
    href: "/diensten/werkplekbeheer",
  },
  {
    icon: Wrench,
    number: "04",
    title: "Installatie & Field Services",
    description: "Technische uitvoering op locatie voor werkplekken, hardware, printers, scanners, netwerken en roll-outs.",
    points: ["Werkplekinstallatie", "Hardware roll-outs", "Field service"],
    href: "/diensten/installatie-field-services",
  },
  {
    icon: Code2,
    number: "05",
    title: "Software & Digital",
    description: "Digitale oplossingen die passen bij je bedrijf: websites, webapps, klantportalen en automatisering.",
    points: ["Websites & webshops", "Webapps & portalen", "AI & automatisering"],
    href: "/diensten/websites",
    featured: true,
  },
  {
    icon: HeartPulse,
    number: "06",
    title: "Zorgtechnologie",
    description: "Een specialistische pijler voor zorgorganisaties: medische techniek aan de IT-zijde en zorgdomotica.",
    points: ["Medische techniek", "Zorgdomotica", "Technische koppelingen"],
    href: "/diensten/zorgtechnologie",
  },
  {
    icon: Megaphone,
    number: "07",
    title: "Online Marketing",
    description: "Meer zichtbaarheid en resultaat met vindbaarheid, campagnes en een digitale basis die converteert.",
    points: ["SEO", "Google Ads", "Digitale groei"],
    href: "/diensten/seo",
  },
];

const Services = () => {
  return (
    <section id="diensten" className="py-24 md:py-28 relative">
      <div className="container px-5 sm:px-6">
        <div className="grid lg:grid-cols-[0.72fr_1.28fr] gap-12 lg:gap-16 items-start mb-14">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-primary text-sm font-semibold tracking-[0.18em] uppercase mb-4">
              Onze expertises
            </span>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Eén partner voor <span className="text-gradient">IT, techniek en digitaal.</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
              Harkas IT combineert klassieke IT-dienstverlening met technische uitvoering en digitale ontwikkeling.
              Daardoor hoef je voor iedere stap niet opnieuw een andere partij te zoeken.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
              {["Advies", "Implementatie", "Beheer", "Support op locatie"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {services.map((service, index) => (
            <motion.article
              key={service.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.04 }}
              className={`group relative rounded-3xl border border-border/50 bg-card/35 p-7 md:p-8 overflow-hidden hover:border-primary/30 transition-all duration-300 ${service.featured ? "xl:col-span-2" : ""}`}
            >
              <div className="flex items-start justify-between gap-5 mb-12">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">{service.number}</span>
              </div>

              <div className={service.featured ? "max-w-2xl" : ""}>
                <h3 className="text-2xl font-semibold mb-4">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-7">{service.description}</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {service.points.map((point) => (
                    <span key={point} className="px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground border border-border/40">
                      {point}
                    </span>
                  ))}
                </div>
                <Link to={service.href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Bekijk expertise
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>

              <div className="absolute -right-24 -bottom-24 w-56 h-56 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
