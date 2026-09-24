import { ArrowRight, CloudCog, Code2, HeartPulse, MapPin, Network, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const capabilityItems = [
  { icon: CloudCog, label: "IT & Cloud", detail: "Microsoft 365 · Werkplekken" },
  { icon: Network, label: "Infrastructuur", detail: "Netwerk · Security" },
  { icon: Wrench, label: "Field Services", detail: "Installatie · Roll-outs" },
  { icon: Code2, label: "Software & Digital", detail: "Web · Apps · Automatisering" },
  { icon: HeartPulse, label: "Zorgtechnologie", detail: "Medische techniek · Domotica" },
];

const Hero = () => {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-20 border-b border-border/40">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute -top-24 right-[-10%] w-[680px] h-[680px] rounded-full bg-primary/10 blur-[180px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className="container relative z-10 px-5 sm:px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-[1.12fr_0.88fr] gap-14 xl:gap-20 items-center">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 text-primary text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] mb-6"
            >
              <ShieldCheck className="w-4 h-4" />
              IT, technologie & digitale oplossingen
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-[2.7rem] sm:text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.02] tracking-[-0.03em] mb-7"
            >
              Technologie die jouw organisatie <span className="text-gradient">vooruitbrengt.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed mb-9"
            >
              Van IT-beheer, cloud en security tot installaties op locatie, websites, automatisering en zorgtechnologie.
              Harkas IT realiseert en ondersteunt oplossingen die passen bij de dagelijkse praktijk van jouw organisatie.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="flex flex-col sm:flex-row gap-3 mb-10"
            >
              <Button variant="hero" size="lg" asChild>
                <a href="/#diensten" className="gap-2">
                  Ontdek onze expertises <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/?aanvraag=kennismaking#contact">Plan een kennismaking</a>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.34 }}
              className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground"
            >
              <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Remote én op locatie</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Eén technisch aanspreekpunt</span>
              <span className="inline-flex items-center gap-2"><Network className="w-4 h-4 text-primary" /> Voor meerdere sectoren</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
            <div className="relative rounded-[2rem] border border-border/60 bg-card/70 backdrop-blur-xl p-4 sm:p-5 shadow-2xl">
              <div className="flex items-center justify-between px-3 py-3 border-b border-border/50 mb-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Harkas IT</p>
                  <p className="font-semibold mt-1">Technology capabilities</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-glow" />
              </div>

              <div className="space-y-2">
                {capabilityItems.map((item, index) => (
                  <div
                    key={item.label}
                    className="group flex items-center gap-4 rounded-2xl border border-transparent hover:border-border/60 hover:bg-background/50 px-4 py-4 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{item.detail}</p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">0{index + 1}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl bg-primary/10 border border-primary/20 p-4">
                <p className="text-sm font-semibold mb-1">Van strategie tot uitvoering</p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Advies, implementatie, beheer en ondersteuning in één technische lijn.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
