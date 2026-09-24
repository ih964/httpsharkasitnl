import { Award, BadgeCheck, ExternalLink, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const certifications = [
  "Microsoft 365 Certified: Administrator Expert",
  "Microsoft 365 Certified: Endpoint Administrator Associate",
  "Microsoft 365 Certified: Administrator Associate",
  "Microsoft Certified: Security, Compliance, and Identity Fundamentals (SC-900)",
  "Microsoft 365 Certified: Fundamentals (MS-900)",
  "Microsoft Certified: Azure Fundamentals (AZ-900)",
  "ITIL Foundation Certificate in IT Service Management",
  "Professional Scrum Master I (PSM I)",
  "EXIN Business Information Management Foundation (BiSL)",
];

const strengths = [
  "Microsoft 365 & Entra ID",
  "Intune & endpoint management",
  "Modern Workplace",
  "ITSM & serviceprocessen",
  "Functioneel beheer",
  "Security & toegangsbeheer",
  "Cloud & Azure-basis",
  "Technische implementatie",
];

const Certifications = () => {
  return (
    <section id="expertise" className="py-20 sm:py-24 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[180px] pointer-events-none" />
      <div className="container px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 sm:gap-8 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="p-6 sm:p-8 md:p-10 rounded-3xl gradient-card border border-border/50"
          >
            <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-[0.16em] uppercase mb-4">
              <Award className="w-4 h-4" />
              Gecertificeerde expertise
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-5">
              Kennis die verder gaat dan <span className="text-gradient">alleen techniek.</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8">
              De expertise achter Harkas IT combineert Microsoft-technologie, endpointbeheer, security, IT-servicemanagement,
              functioneel beheer en agile werken met praktijkervaring in complexe organisaties.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strengths.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-secondary/70 border border-border/40 p-3">
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <a
              href="https://www.linkedin.com/in/iliasharkati"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-7 text-sm font-semibold text-primary hover:gap-3 transition-all"
            >
              Bekijk professioneel profiel <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="p-6 sm:p-8 md:p-10 rounded-3xl border border-primary/30 bg-primary/5"
          >
            <h3 className="text-2xl font-bold mb-6">Certificeringen</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {certifications.map((cert) => (
                <div key={cert} className="flex items-start gap-3 rounded-2xl bg-background/70 border border-border/50 p-4">
                  <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold leading-snug">{cert}</p>
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
