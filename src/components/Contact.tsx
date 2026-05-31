import { Phone, Mail, MapPin, Send, CheckCircle2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const MAX_ATTACHMENT_SIZE_MB = 3;
const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const clearAttachment = () => {
    setAttachmentName("");
    setAttachmentFile(null);
    const attachmentInput = document.getElementById("attachment") as HTMLInputElement | null;
    if (attachmentInput) attachmentInput.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const message = formData.message.trim();

    if (!name || !email || !message) {
      toast({
        title: "Niet alles is ingevuld",
        description: "Vul minimaal je naam, e-mailadres en bericht in.",
        variant: "destructive",
      });
      return;
    }

    if (attachmentFile && attachmentFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
      toast({
        title: "Bijlage is te groot",
        description: `Gebruik maximaal ${MAX_ATTACHMENT_SIZE_MB} MB of verstuur de bijlage apart per e-mail.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const payload = new FormData();
      payload.append("_subject", `Nieuwe aanvraag via harkasit.nl - ${name}`);
      payload.append("_template", "table");
      payload.append("_captcha", "false");
      payload.append("Naam", name);
      payload.append("E-mail", email);
      payload.append("Telefoon", phone || "Niet ingevuld");
      payload.append("Bericht", message);
      payload.append("Bijlage", attachmentName || "Geen bijlage meegestuurd");

      if (attachmentFile) {
        payload.append("attachment", attachmentFile);
      }

      const response = await fetch("https://formsubmit.co/ajax/info@harkasit.nl", {
        method: "POST",
        body: payload,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Formulier kon niet worden verzonden");
      }

      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", message: "" });
      clearAttachment();

      toast({
        title: "Aanvraag verzonden",
        description: "Bedankt. Je aanvraag is verzonden naar Harkas IT.",
      });
    } catch (error) {
      toast({
        title: "Verzenden niet gelukt",
        description: attachmentFile
          ? "De bijlage kan te groot zijn of het verzenden duurde te lang. Probeer zonder bijlage of mail direct naar info@harkasit.nl."
          : "Probeer het opnieuw of mail direct naar info@harkasit.nl.",
        variant: "destructive",
      });
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 relative">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <div className="container px-6 relative z-10">
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
            Klaar om je IT <span className="text-gradient">professioneel te regelen?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Plan een gratis kennismaking of start met een Microsoft 365 & Werkplek Check.
            Dan weet je direct waar je IT goed staat en waar verbetering nodig is.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
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
                    <p className="text-sm text-muted-foreground">Bel direct</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl gradient-card border border-border/50 text-center">
                <p className="text-3xl font-bold text-gradient mb-1">€349</p>
                <p className="text-sm text-muted-foreground">IT-check vanaf</p>
              </div>
              <div className="p-6 rounded-xl gradient-card border border-border/50 text-center">
                <p className="text-3xl font-bold text-gradient mb-1">€499</p>
                <p className="text-sm text-muted-foreground">Beheer vanaf p/m</p>
              </div>
            </div>
          </motion.div>

          <motion.form 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSubmit} 
            className="p-8 rounded-2xl gradient-card border border-border/50"
          >
            <h3 className="text-xl font-semibold mb-2">Vraag een IT-check of pakket aan</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Vul je gegevens in. Je aanvraag wordt direct vanaf de site naar info@harkasit.nl verzonden.
            </p>

            {submitted && (
              <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-muted-foreground flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Je aanvraag is verzonden. Wij nemen zo snel mogelijk contact met je op.</span>
              </div>
            )}
            
            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Naam <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="Je naam"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  E-mail <span className="text-primary">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="je@email.nl"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  Telefoonnummer <span className="text-muted-foreground font-normal">(optioneel)</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="+31 6 1234 5678"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label htmlFor="attachment" className="block text-sm font-medium mb-2">
                  Bijlage <span className="text-muted-foreground font-normal">(optioneel, max. {MAX_ATTACHMENT_SIZE_MB} MB)</span>
                </label>
                <label
                  htmlFor="attachment"
                  className="flex cursor-pointer items-center gap-3 rounded-xl bg-secondary border border-border/50 px-4 py-3 hover:border-primary/50 transition-colors"
                >
                  <Paperclip className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {attachmentName || "Kies bestand, bijvoorbeeld screenshot of document"}
                  </span>
                </label>
                <input
                  type="file"
                  id="attachment"
                  name="attachment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;

                    if (file && file.size > MAX_ATTACHMENT_SIZE_BYTES) {
                      toast({
                        title: "Bijlage is te groot",
                        description: `Gebruik maximaal ${MAX_ATTACHMENT_SIZE_MB} MB of mail de bijlage apart naar info@harkasit.nl.`,
                        variant: "destructive",
                      });
                      clearAttachment();
                      return;
                    }

                    setAttachmentFile(file);
                    setAttachmentName(file?.name || "");
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Optioneel. Grote bestanden kunnen het verzenden vertragen. Mail grote bijlagen apart naar info@harkasit.nl.
                </p>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Bericht <span className="text-primary">*</span>
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
                  placeholder="Bijvoorbeeld: ik wil een Microsoft 365 check, IT-beheer of websitebeheer bespreken..."
                />
              </div>

              <Button type="submit" variant="hero" className="w-full" size="lg" disabled={isSubmitting}>
                <Send className="w-4 h-4" />
                {isSubmitting ? "Aanvraag verzenden..." : "Verstuur aanvraag"}
              </Button>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default Contact;