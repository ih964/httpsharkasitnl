import { Phone, Mail, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion } from "framer-motion";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log(formData);
  };

  return (
    <section id="contact" className="py-24 relative">
      {/* Background elements */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <div className="container px-6 relative z-10">
        {/* Section header */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            Contact
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Laten we <span className="text-gradient">samenwerken</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Klaar om je bedrijf naar het volgende niveau te tillen? Neem vandaag nog contact met ons op.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact info */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="p-8 rounded-2xl gradient-card border border-border/50">
              <h3 className="text-xl font-semibold mb-6">Neem direct contact op</h3>
              
              <div className="space-y-6">
                <a
                  href="tel:+31851249091"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefoon</p>
                    <p className="font-medium group-hover:text-primary transition-colors">085 124 9091</p>
                  </div>
                </a>

                <a
                  href="mailto:info@harkasit.nl"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium group-hover:text-primary transition-colors">info@harkasit.nl</p>
                  </div>
                </a>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Locatie</p>
                    <p className="font-medium">Burgemeester de Manstraat 45, Tiel</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl gradient-card border border-border/50 text-center">
                <p className="text-3xl font-bold text-gradient mb-1">24u</p>
                <p className="text-sm text-muted-foreground">Snelle levering</p>
              </div>
              <div className="p-6 rounded-xl gradient-card border border-border/50 text-center">
                <p className="text-3xl font-bold text-gradient mb-1">100+</p>
                <p className="text-sm text-muted-foreground">Tevreden klanten</p>
              </div>
            </div>
          </motion.div>

          {/* Contact form */}
          <motion.form 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSubmit} 
            className="p-8 rounded-2xl gradient-card border border-border/50"
          >
            <h3 className="text-xl font-semibold mb-6">Stuur een bericht</h3>
            
            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Naam
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="Je naam"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="je@email.nl"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  Telefoonnummer
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="+31 6 1234 5678"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Bericht
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
                  placeholder="Vertel ons over je project..."
                />
              </div>

              <Button type="submit" variant="hero" className="w-full" size="lg">
                <Send className="w-4 h-4" />
                Verstuur bericht
              </Button>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
