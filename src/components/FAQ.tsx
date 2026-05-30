import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Wat doet Harkas IT als IT-partner/MSP?",
    answer:
      "Harkas IT helpt kleine bedrijven met Microsoft 365 beheer, gebruikersbeheer, werkplekbeheer, remote support, basisbeveiliging, websites, webapps en digitale groei. Zo heb je één vast aanspreekpunt voor je dagelijkse IT en online basis.",
  },
  {
    question: "Is het IT Start pakket onbeperkt support?",
    answer:
      "Nee. IT Start bevat 4 supporturen per maand. Kleine supportvragen vallen daarbinnen. Werkzaamheden boven de inbegrepen uren stemmen we vooraf af en factureren we op nacalculatie. Zo blijven de afspraken eerlijk en duidelijk.",
  },
  {
    question: "Voor welke bedrijven is dit bedoeld?",
    answer:
      "Vooral voor mkb-bedrijven, zorgpraktijken, administratiekantoren, kinderopvang, lokale ondernemers en bedrijven met meerdere medewerkers die geen eigen IT-afdeling hebben, maar wel professionele IT-support willen.",
  },
  {
    question: "Kunnen jullie ook websites, apps en marketing blijven doen?",
    answer:
      "Ja. IT-beheer is de basis, maar Harkas IT kan ook websites, webapps, websitebeheer, SEO basis, Google bedrijfsprofiel, social media ondersteuning en automatiseringen verzorgen.",
  },
  {
    question: "Wat houdt de Microsoft 365 & Werkplek Check in?",
    answer:
      "We controleren onder andere gebruikers, licenties, MFA, rechten, mail, Teams, OneDrive, apparaten en basisbeveiliging. Daarna krijg je duidelijk inzicht in wat goed staat en waar verbetering nodig is.",
  },
  {
    question: "Komen jullie ook op locatie?",
    answer:
      "Ja, locatiebezoeken zijn mogelijk. Remote support is onderdeel van de pakketten. Werk op locatie, nieuwe laptopinstallaties, grotere migraties en projecten worden apart afgestemd en gefactureerd.",
  },
  {
    question: "Kan ik klein beginnen en later uitbreiden?",
    answer:
      "Ja. Je kunt starten met een check of IT Start en later doorgroeien naar IT + Website Beheer of Digitale Groei wanneer je meer ondersteuning, websitebeheer of marketing/automatisering nodig hebt.",
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
            Antwoorden op vragen over IT-beheer, support, pakketten en digitale diensten.
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
