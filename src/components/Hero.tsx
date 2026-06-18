import { ShieldCheck, ArrowRight, Phone, MonitorCog, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const trustBullets = [
  "Microsoft 365 beheer",
  "Werkplekken en remote support",
  "Websites, webapps en automatisering",
];

const Hero = () => {
  return (
    <section className="relative min-h-screen w-full max-w-full flex items-center justify-center overflow-hidden gradient-hero pt-20">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[320px] h-[320px] sm:w-[600px] sm:h-[600px] rounded-full bg-primary/5 blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[260px] h-[260px] sm:w-[400px] sm:h-[400px] rounded-full bg-primary/10 blur-[90px] sm:blur-[100px] pointer-events-none" />
      
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container relative z-10 w-full max-w-full px-4 sm:px-6 py-14 md:py-20">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex max-w-full items-center gap-2 glass px-3 sm:px-4 py-2 rounded-full mb-5 text-xs sm:text-sm font-medium text-primary"
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">IT-partner voor mkb, zorg en zelfstandigen</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[2.35rem] xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] mb-6 break-words"
          >
            Zorgeloos IT-beheer,
            <br className="hidden sm:block" />
            <span className="text-gradient block sm:inline">Microsoft 365 en slimme websites</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto mb-7 px-1"
          >
            Harkas IT helpt ondernemers en organisaties met veilige werkplekken, snelle support,
            Microsoft 365-beheer, moderne websites en automatisering zonder gedoe.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex w-full flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 mb-8"
          >
            {trustBullets.map((item) => (
              <span key={item} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 glass px-4 py-2 rounded-xl text-sm text-muted-foreground">
                <MonitorCog className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{item}</span>
              </span>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 max-w-sm sm:max-w-none mx-auto"
          >
            <Button variant="hero" size="lg" asChild className="w-full sm:w-auto">
              <a href="#contact" className="gap-3">
                Plan gratis IT-check
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <a href="/diensten/support" className="gap-3">
                <LifeBuoy className="w-5 h-5" />
                Direct support aanvragen
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <a href="tel:+31851249091" className="gap-3">
                <Phone className="w-5 h-5" />
                085 124 9091
              </a>
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default Hero;
