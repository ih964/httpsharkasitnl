import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Waar helpt Harkas IT mee?",
    answer:
      "Harkas IT helpt met IT-beheer, Microsoft 365, werkplekbeheer, remote support, websites, webapps en praktische automatisering.",
  },
  {
    question: "Wat houdt een IT-check in?",
    answer:
      "We kijken naar je huidige IT-situatie, Microsoft 365, gebruikers, rechten, werkplekken en verbeterpunten. Daarna krijg je duidelijk advies over wat beter kan.",
  },
  {
    question: "Is support onbeperkt?",
    answer:
      "Nee. Pakketten bevatten afspraken over supporturen en werkzaamheden. Extra werk stemmen we vooraf af, zodat duidelijk blijft wat binnen beheer valt.",
  },
  {
    question: "Voor welke bedrijven is dit bedoeld?",
    answer:
      "Vooral voor mkb-bedrijven, zorgpraktijken, zelfstandigen en lokale ondernemers die geen eigen IT-afdeling hebben maar wel professionele hulp willen.",
  },
  {
    question: "Kunnen jullie Microsoft 365 beheren?",
    answer:
      "Ja. We helpen met e-mail, Teams, SharePoint, OneDrive, gebruikers, groepen, mailboxen, MFA, rechten en licenties.",
  },
  {
    question: "Kunnen jullie op afstand helpen?",
    answer:
      "Ja. Veel vragen kunnen remote worden opgelost, zoals e-mailproblemen, Teams/OneDrive, printervragen, werkplekinstellingen en kleine storingen.",
  },
  {
    question: "Doen jullie ook websites en automatisering?",
    answer:
      "Ja. Naast IT-beheer helpt Harkas IT met bedrijfswebsites, webapps, formulieren, klantportalen en praktische automatisering.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24 relative">
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <div className="container px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Veelgestelde <span className="text-gradient">vragen</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Antwoorden op vragen over IT-beheer, Microsoft 365, support en digitale oplossingen.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="gradient-card border border-border/50 rounded-xl px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-semibold pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
