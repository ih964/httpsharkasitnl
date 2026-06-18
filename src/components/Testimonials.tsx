import { CheckCircle2, Quote } from "lucide-react";
import { motion } from "framer-motion";

const trustSignals = [
  {
    title: "Persoonlijke IT-partner",
    text: "Geen anonieme helpdesk, maar direct contact met iemand die je omgeving begrijpt en met je meedenkt.",
  },
  {
    title: "Microsoft 365 praktijkervaring",
    text: "Ondersteuning bij e-mail, Teams, SharePoint, OneDrive, gebruikers, rechten, MFA en werkplekken.",
  },
  {
    title: "IT, web en automatisering samen",
    text: "Harkas IT kijkt verder dan losse storingen en helpt ook met websites, portalen, formulieren en slimme workflows.",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-24 relative">
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
            Waarom kiezen voor <span className="text-gradient">Harkas IT?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We tonen liever eerlijke sterke punten dan verzonnen reviews. Dit is waar Harkas IT in de praktijk op focust.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {trustSignals.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative p-8 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 group"
            >
              <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Quote className="w-12 h-12 text-primary" />
              </div>

              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>

              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
