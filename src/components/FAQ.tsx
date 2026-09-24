import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Waar helpt Harkas IT mee?",
    answer: "Harkas IT ondersteunt organisaties met IT & cloud, managed IT en support, netwerk & security, installatie en field services, websites en software, automatisering, online marketing en specialistische zorgtechnologie.",
  },
  {
    question: "Werken jullie met vaste prijzen of standaardpakketten?",
    answer: "Niet als uitgangspunt. Iedere organisatie heeft een andere omgeving, omvang en ondersteuningsbehoefte. We bespreken eerst de situatie en maken daarna een voorstel met een duidelijke scope, afspraken en kosten. Alleen diensten die echt standaardiseerbaar zijn kunnen eventueel met een vaste prijs worden aangeboden.",
  },
  {
    question: "Hoe komt een offerte tot stand?",
    answer: "We starten met een kennismaking en brengen de belangrijkste vraag, gebruikers, apparaten, locaties en gewenste dienstverlening in beeld. Bij complexere projecten kan een technische inventarisatie nodig zijn. Daarna ontvang je een voorstel waarin staat wat we uitvoeren, welke afspraken gelden en welke kosten daarbij horen.",
  },
  {
    question: "Is een eerste kennismaking vrijblijvend?",
    answer: "Ja. Tijdens de eerste kennismaking bespreken we je hulpvraag en bepalen we welke vervolgstap logisch is. Als er een uitgebreidere technische inventarisatie of onderzoek nodig is, spreken we dat vooraf met je af.",
  },
  {
    question: "Zijn licenties, hardware en externe kosten inbegrepen?",
    answer: "Dat verschilt per opdracht. In het voorstel staat duidelijk welke licenties, hardware, externe leveranciers, locatiebezoeken en overige kosten wel of niet zijn inbegrepen. Zo weet je vooraf waar je aan toe bent.",
  },
  {
    question: "Hoe werken support- en serviceafspraken?",
    answer: "Voor terugkerend beheer leggen we de supportscope, bereikbaarheid, responstijden en eventuele inbegrepen werkzaamheden vooraf vast. Die afspraken worden afgestemd op de organisatie in plaats van op één standaardpakket.",
  },
  {
    question: "Voor welke organisaties is Harkas IT bedoeld?",
    answer: "Harkas IT werkt voor onder andere mkb, zakelijke dienstverlening, zorg, retail en hospitality, onderwijs en operationele omgevingen zoals industrie en logistiek. Zowel kleine teams als organisaties met meerdere locaties kunnen worden ondersteund.",
  },
  {
    question: "Kunnen jullie Microsoft 365 en werkplekken beheren?",
    answer: "Ja. We ondersteunen onder andere Microsoft 365, Exchange Online, Teams, SharePoint, OneDrive, Entra ID, Intune, gebruikers en apparaten, rechten, MFA en moderne werkplekken. De precieze beheerscope leggen we vooraf vast.",
  },
  {
    question: "Kunnen jullie ook op locatie werken?",
    answer: "Ja. Naast remote support biedt Harkas IT installatie en field services op locatie, bijvoorbeeld voor werkplekken, hardware-uitrol, printers, scanners, netwerkapparatuur, migraties en technische ingebruikname.",
  },
  {
    question: "Doen jullie ook websites, apps, automatisering en marketing?",
    answer: "Ja. Harkas IT ontwikkelt en ondersteunt websites, webapps, klantportalen en automatisering en kan ook helpen met online marketing en vindbaarheid. Hiervoor maken we een voorstel passend bij het doel en de gewenste functionaliteit.",
  },
  {
    question: "Wat valt onder zorgtechnologie?",
    answer: "Binnen zorgtechnologie ondersteunt Harkas IT de IT-technische kant van medische randapparatuur, werkstations, drivers en koppelingen, plus zorgdomotica en technische implementatie. Werkzaamheden waarvoor fabrikant- of wettelijke certificering vereist is worden door de daarvoor bevoegde partij uitgevoerd.",
  },
];

const FAQ = () => (
  <section id="faq" className="py-20 sm:py-24 relative">
    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
    <div className="container px-4 sm:px-6 relative z-10">
      <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }} className="text-center mb-10 sm:mb-14">
        <span className="inline-block text-primary text-sm font-semibold tracking-[0.16em] uppercase mb-4">FAQ</span>
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Veelgestelde <span className="text-gradient">vragen</span></h2>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">Duidelijke antwoorden over dienstverlening, offertes, support en de verschillende expertises van Harkas IT.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`item-${index}`} className="gradient-card border border-border/50 rounded-xl px-4 sm:px-6 data-[state=open]:border-primary/30 transition-colors">
              <AccordionTrigger className="text-left hover:no-underline py-5"><span className="font-semibold pr-3">{faq.question}</span></AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQ;
