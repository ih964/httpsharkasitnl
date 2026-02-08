import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Hoe snel kan mijn website klaar zijn?",
    answer:
      "Met onze 24-uurs oplevergarantie kunnen wij standaard one-page websites binnen 24 uur opleveren, mits alle benodigde materialen (teksten, afbeeldingen, logo's) tijdig zijn aangeleverd. Voor complexere projecten maken we een planning op maat.",
  },
  {
    question: "Wat kost een website bij Harkas IT?",
    answer:
      "Onze prijzen beginnen vanaf €149 voor een basis one-page website. De exacte kosten zijn afhankelijk van de complexiteit, functionaliteiten en wensen. Neem contact op voor een vrijblijvende offerte.",
  },
  {
    question: "Bieden jullie ook hosting aan?",
    answer:
      "Ja, wij bieden betrouwbare hostingdiensten aan met jaarlijkse verlenging. Dit zorgt ervoor dat uw website altijd online en veilig is. Hosting is niet inbegrepen bij de 24-uurs oplevergarantie en wordt apart gefactureerd.",
  },
  {
    question: "Kan ik mijn website zelf aanpassen?",
    answer:
      "Absoluut! Wij kunnen uw website bouwen met een gebruiksvriendelijk CMS (Content Management System) zodat u zelf eenvoudig teksten en afbeeldingen kunt aanpassen. Ook bieden we onderhoudscontracten aan als u dit liever aan ons overlaat.",
  },
  {
    question: "Wat houdt de SEO optimalisatie in?",
    answer:
      "Onze SEO diensten omvatten technische optimalisatie, keyword research, content optimalisatie en linkbuilding. We zorgen ervoor dat uw website beter vindbaar wordt in zoekmachines zoals Google, zodat u meer organische bezoekers krijgt.",
  },
  {
    question: "Hoe werkt de advertentie marketing?",
    answer:
      "Wij beheren uw Google Ads, Facebook Ads en Instagram campagnes van A tot Z. Dit omvat strategie, opzet, monitoring en optimalisatie. U krijgt maandelijkse rapportages over de resultaten en ROI van uw campagnes.",
  },
  {
    question: "Wat als ik niet tevreden ben?",
    answer:
      "Klanttevredenheid staat bij ons voorop. We werken nauw samen om ervoor te zorgen dat het eindresultaat aan uw verwachtingen voldoet. Mochten er aanpassingen nodig zijn, dan bespreken we dit en lossen we het samen op.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24 relative">
      {/* Background elements */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <div className="container px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Veelgestelde <span className="text-gradient">vragen</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Antwoorden op de meest gestelde vragen over onze diensten
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
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
        </div>
      </div>
    </section>
  );
};

export default FAQ;
