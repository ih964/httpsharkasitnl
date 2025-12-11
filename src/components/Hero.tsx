import { Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Til je verwachtingen naar een
            <br />
            <span className="text-gradient">hoger niveau</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            Wij bieden een scala aan hoogwaardige diensten. Met gespecialiseerde teams op de Afrikaanse, Golf- en Europese markten.
          </p>

          {/* USP */}
          <div className="inline-block glass px-6 py-3 rounded-xl mb-10 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <p className="text-sm md:text-base font-medium">
              <span className="text-primary">Niet binnen 24 uur?</span> Dan is je website gratis!*
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <Button variant="hero" size="lg" asChild>
              <a href="tel:+31851249091" className="gap-3">
                <Phone className="w-5 h-5" />
                085 124 9091
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#contact" className="gap-3">
                Gratis adviesgesprek
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default Hero;
