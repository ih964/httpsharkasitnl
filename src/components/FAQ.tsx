import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Waar helpt Harkas IT mee?",
    answer: "Harkas IT helpt met IT-beheer, Microsoft 365, werkplekbeheer, remote support, websites, webapps en praktische automatisering.",
  },
  {
    question: "Wat is gratis en wat is betaald?",
    answer: "De online IT-zelfcheck is gratis: je beantwoordt 8 vragen en krijgt een indicatieve score en verbeterpunten. Ook een kennismakingsgesprek over je hulpvraag is gratis. De Microsoft 365 & Werkplek Check is een aparte, betaalde technische controle vanaf €349 eenmalig, exclusief btw. Omvang en prijs spreken we vooraf af. Het uitvoeren van verbeteringen is niet automatisch inbegrepen.",
  },
  {
    question: "Wat krijg ik voor IT-beheer vanaf €499 per maand?",
    answer: "Het basisaanbod omvat Microsoft 365-basisbeheer, gebruikersbeheer, remote ondersteuning, een MFA- en basisbeveiligingscheck en 4 supporturen per maand voor afgesproken ondersteuningswerkzaamheden. De definitieve prijs hangt af van je gebruikers, apparaten, omgeving en supportbehoefte. In de offerte leggen we vast welke gebruikers, apparaten en werkzaamheden onder beheer vallen, plus de bereikbaarheid en serviceafspraken. Het bedrag is exclusief btw.",
  },
  {
    question: "Zijn licenties, inrichting en extra werkzaamheden inbegrepen?",
    answer: "Nee. Microsoft 365- en andere softwarelicenties, hardware, initiële inrichting, migraties, locatiebezoeken en extra uren vallen buiten het basisbedrag. Deze kosten worden vooraf apart aangeboden of afgesproken. Uitgebreid werkplekbeheer, websitebeheer en automatisering bieden we op maat aan.",
  },
  {
    question: "Is support onbeperkt?",
    answer: "Nee. Het basisaanbod bevat 4 supporturen per maand voor de afgesproken ondersteuningswerkzaamheden. Extra uren en werkzaamheden stemmen we vooraf af. De inbegrepen werkzaamheden, bereikbaarheid en serviceafspraken staan in je offerte of overeenkomst.",
  },
  {
    question: "Voor welke bedrijven is dit bedoeld?",
    answer: "Vooral voor mkb-bedrijven, zorgpraktijken, zelfstandigen en lokale ondernemers die geen eigen IT-afdeling hebben maar wel professionele hulp willen.",
  },
  {
    question: "Kunnen jullie Microsoft 365 beheren?",
    answer: "Ja. We helpen met e-mail, Teams, SharePoint, OneDrive, gebruikers, groepen, mailboxen, MFA, rechten en licenties. Welke werkzaamheden bij jouw beheer horen, leggen we vooraf vast.",
  },
  {
    question: "Kunnen jullie op afstand helpen?",
    answer: "Ja. Veel vragen kunnen remote worden opgelost, zoals e-mailproblemen, Teams/OneDrive, printervragen, werkplekinstellingen en kleine storingen.",
  },
  {
    question: "Doen jullie ook websites en automatisering?",
    answer: "Ja. Naast IT-beheer helpt Harkas IT met bedrijfswebsites, webapps, formulieren, klantportalen en praktische automatisering. Hiervoor maken we een apart voorstel op maat.",
  },
];

const FAQ = () => (
  <section id="faq" className="py-24 relative">
    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
    <div className="container px-6 relative z-10">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }} className="text-center mb-16">
        <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">FAQ</span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Veelgestelde <span className="text-gradient">vragen</span></h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Antwoorden op vragen over IT-beheer, prijzen, support en het verschil tussen de gratis zelfcheck en een technische controle.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`item-${index}`} className="gradient-card border border-border/50 rounded-xl px-6 data-[state=open]:border-primary/30 transition-colors">
              <AccordionTrigger className="text-left hover:no-underline py-5"><span className="font-semibold pr-4">{faq.question}</span></AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQ;
