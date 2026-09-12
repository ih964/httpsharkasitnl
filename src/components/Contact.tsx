import { Phone, Mail, MapPin, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const serviceOptions = [
  "Gratis kennismaking",
  "IT-beheer & support",
  "Microsoft 365 & Werkplek Check (betaald)",
  "Uitgebreid beheer of project op maat",
  "Microsoft 365 beheer",
  "Werkplekbeheer / remote support",
  "Website, webapp of automatisering",
  "Anders",
];
const requestedServices: Record<string, string> = {
  kennismaking: serviceOptions[0],
  "it-beheer": serviceOptions[1],
  "technische-controle": serviceOptions[2],
  maatwerk: serviceOptions[3],
};
const serviceFromSearch = (search: string) => {
  const request = new URLSearchParams(search).get("aanvraag");
  return request && Object.prototype.hasOwnProperty.call(requestedServices, request) ? requestedServices[request] : undefined;
};

const Contact = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", service: serviceFromSearch(location.search) ?? serviceOptions[0], message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const service = serviceFromSearch(location.search);
    if (service) {
      setFormData((previous) => ({ ...previous, service }));
      setSubmitted(false);
    }
  }, [location.search]);

  // Also handles arriving from a service page or the online self-check.
  useEffect(() => {
    if (location.hash !== "#contact") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("contact")?.scrollIntoView({ block: "start", behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const service = formData.service.trim();
    const message = formData.message.trim();
    if (!name || !email || !message) {
      toast({ title: "Niet alles is ingevuld", description: "Vul minimaal je naam, e-mailadres en bericht in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, service, message }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Formulier kon niet worden verzonden");
      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", service: serviceFromSearch(location.search) ?? serviceOptions[0], message: "" });
      toast({ title: "Aanvraag verzonden", description: "Bedankt. Je aanvraag is verzonden naar Harkas IT." });
    } catch {
      toast({ title: "Verzenden niet gelukt", description: "Probeer het opnieuw of mail direct naar info@harkasit.nl.", variant: "destructive" });
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

  return (
    <section id="contact" className="py-24 relative scroll-mt-24">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="container px-4 sm:px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">Contact</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Klaar om je IT <span className="text-gradient">professioneel te regelen?</span></h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Vraag een gratis kennismaking aan of vertel waar je hulp bij nodig hebt. Harkas IT werkt remote voor ondernemers in heel Nederland.</p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="min-w-0 space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl gradient-card border border-border/50">
              <h3 className="text-xl font-semibold mb-6">Neem direct contact op</h3>
              <div className="space-y-6">
                <a href="tel:+31851249091" className="flex items-center gap-4 group"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors"><Phone className="w-5 h-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Bel direct</p><p className="font-medium group-hover:text-primary transition-colors">085 124 9091</p></div></a>
                <a href="mailto:info@harkasit.nl" className="flex items-center gap-4 group"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors"><Mail className="w-5 h-5 text-primary" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">E-mail</p><p className="font-medium break-words group-hover:text-primary transition-colors">info@harkasit.nl</p></div></a>
                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><MapPin className="w-5 h-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Werkgebied</p><p className="font-medium">Gevestigd in Tiel, actief in heel Nederland</p></div></div>
              </div>
            </div>
            <div className="p-6 rounded-xl gradient-card border border-primary/20">
              <p className="font-semibold mb-2">Kennismaken is gratis</p>
              <p className="text-sm text-muted-foreground leading-relaxed">We bespreken je situatie en hulpvraag. Een technische controle van je systemen is een aparte, betaalde dienst. Omvang en prijs spreken we vooraf af.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl gradient-card border border-border/50"><p className="text-sm text-muted-foreground mb-1">Technische controle vanaf</p><p className="text-3xl font-bold text-gradient mb-2">€349</p><p className="text-sm text-muted-foreground">Eenmalig · ex btw</p></div>
              <div className="p-5 rounded-xl gradient-card border border-border/50"><p className="text-sm text-muted-foreground mb-1">IT-beheer &amp; support vanaf</p><p className="text-3xl font-bold text-gradient mb-2">€499</p><p className="text-sm text-muted-foreground">Per maand · ex btw</p></div>
            </div>
          </motion.div>
          <motion.form initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} onSubmit={handleSubmit} className="min-w-0 p-6 sm:p-8 rounded-2xl gradient-card border border-border/50">
            <h3 className="text-xl font-semibold mb-2">Waarmee kunnen we je helpen?</h3>
            <p className="text-sm text-muted-foreground mb-6">Kies een gratis kennismaking, een voorstel voor beheer of een betaalde technische controle. We nemen contact op om je aanvraag te bespreken.</p>
            {submitted && <div role="status" className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-muted-foreground flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" /><span>Je aanvraag is verzonden. Wij nemen zo snel mogelijk contact met je op.</span></div>}
            <div className="space-y-5">
              <div><label htmlFor="name" className="block text-sm font-medium mb-2">Naam <span className="text-primary">*</span></label><input type="text" id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Je naam" autoComplete="name" /></div>
              <div><label htmlFor="email" className="block text-sm font-medium mb-2">E-mail <span className="text-primary">*</span></label><input type="email" id="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="je@email.nl" autoComplete="email" /></div>
              <div><label htmlFor="phone" className="block text-sm font-medium mb-2">Telefoonnummer <span className="text-muted-foreground font-normal">(optioneel)</span></label><input type="tel" id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="+31 6 1234 5678" autoComplete="tel" /></div>
              <div><label htmlFor="service" className="block text-sm font-medium mb-2">Waar gaat je aanvraag over?</label><select id="service" value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} className={inputClass}>{serviceOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
              <div><label htmlFor="message" className="block text-sm font-medium mb-2">Bericht <span className="text-primary">*</span></label><textarea id="message" rows={5} required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className={`${inputClass} resize-none`} placeholder="Vertel kort over je bedrijf, je IT-omgeving en waar je hulp bij nodig hebt..." /></div>
              <Button type="submit" variant="hero" className="w-full h-auto min-h-12 whitespace-normal text-center" size="lg" disabled={isSubmitting}><Send className="w-4 h-4" />{isSubmitting ? "Aanvraag verzenden..." : "Verstuur aanvraag"}</Button>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
