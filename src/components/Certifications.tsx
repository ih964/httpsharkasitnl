import { Award, BadgeCheck, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const certifications = [
  "Microsoft 365 Administrator Expert",
  "Microsoft 365 Endpoint Administrator",
  "SC-900 Security, Compliance & Identity Fundamentals",
  "MS-900 Microsoft 365 Fundamentals",
  "AZ-900 Azure Fundamentals",
];

const strengths = [
  "Microsoft 365 beheer",
  "Werkplekbeheer",
  "Security basis",
  "Supportprocessen",
  "Praktische IT-advies",
  "Web en automatisering",
];

const Certifications = () => {
  return (
    <section id="expertise" className="py-24 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[180px] pointer-events-none" />
      <div className="container px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 items-stretch max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-8 md:p-10 rounded-3xl gradient-card border border-border/50"
          >
            <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-wider uppercase mb-4">
              <Award className="w-4 h-4" />
              Microsoft expertise
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-5">
              Gecertificeerde kennis, <span className="text-gradient">praktisch toegepast</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Harkas IT combineert actuele Microsoft-kennis met praktijkervaring in IT-support, werkplekbeheer, Microsoft 365 en digitale oplossingen.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strengths.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-secondary/70 border border-border/40 p-3">
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="p-8 md:p-10 rounded-3xl border border-primary/30 bg-primary/5"
          >
            <h3 className="text-2xl font-bold mb-6">Certificeringen</h3>
            <div className="space-y-4">
              {certifications.map((cert) => (
                <div key={cert} className="flex items-start gap-4 rounded-2xl bg-background/70 border border-border/50 p-4">
                  <BadgeCheck className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{cert}</p>
                    <p className="text-sm text-muted-foreground">Onderdeel van de technische basis achter onze Microsoft 365- en werkplekaanpak.</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Certifications;
