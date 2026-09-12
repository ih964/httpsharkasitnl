import { ArrowRight, Check, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  "Microsoft 365-basisbeheer",
  "Gebruikersbeheer binnen de afgesproken omgeving",
  "Remote ondersteuning",
  "4 supporturen per maand voor afgesproken ondersteuningswerkzaamheden",
  "MFA- en basisbeveiligingscheck",
];

const Pricing = () => (
  <section id="prijzen" className="py-24 relative overflow-hidden scroll-mt-24">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[200px] pointer-events-none" />
    <div className="container px-4 sm:px-6 relative z-10">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
        <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">Prijzen</span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Een duidelijke basis, <span className="text-gradient">uitbreidingen op maat</span></h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Begin met een gratis kennismaking. Daarna ontvang je een voorstel dat past bij je gebruikers, apparaten, IT-omgeving en supportbehoefte.</p>
      </motion.div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-8 max-w-6xl mx-auto items-start">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="min-w-0 p-6 sm:p-8 rounded-2xl gradient-card border border-primary/50 shadow-glow">
          <p className="text-primary text-sm font-semibold mb-3">Het basisaanbod</p>
          <h3 className="text-2xl font-semibold mb-3">IT-beheer &amp; support</h3>
          <p className="text-muted-foreground mb-6">Voor kleine bedrijven die Microsoft 365-basisbeheer en ondersteuning professioneel willen regelen.</p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Vanaf</span><span className="text-4xl sm:text-5xl font-bold">€499</span><span className="text-muted-foreground">per maand</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 mb-7">Exclusief btw · definitief voorstel na inventarisatie</p>
          <ul className="space-y-4 mb-7">
            {features.map((feature) => <li key={feature} className="flex items-start gap-3"><Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" /><span className="text-sm text-muted-foreground leading-relaxed">{feature}</span></li>)}
          </ul>
          <div className="rounded-xl bg-background/50 border border-border/50 p-5 space-y-3 text-sm text-muted-foreground leading-relaxed mb-6">
            <p><strong className="text-foreground">Afgestemd op jouw bedrijf.</strong> De vanafprijs is geen totaalprijs voor iedere omgeving. In de offerte leggen we vast welke gebruikers, apparaten en werkzaamheden onder het beheer vallen, plus de bereikbaarheid en serviceafspraken.</p>
            <p><strong className="text-foreground">Geen onbeperkte support.</strong> De 4 supporturen gelden voor de afgesproken ondersteuningswerkzaamheden. Extra uren stemmen we vooraf af.</p>
            <p><strong className="text-foreground">Niet inbegrepen in het basisbedrag:</strong> Microsoft 365- en andere softwarelicenties, hardware, initiële inrichting, migraties, locatiebezoeken en extra uren. Deze kosten worden vooraf apart aangeboden of afgesproken.</p>
          </div>
          <Button variant="hero" className="w-full h-auto min-h-12 whitespace-normal text-center" asChild><a href="/?aanvraag=it-beheer#contact">Vraag een voorstel aan<ArrowRight className="w-4 h-4 flex-shrink-0" /></a></Button>
        </motion.div>

        <div className="min-w-0 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border/50">
            <p className="text-primary text-sm font-semibold mb-3">Voor aanvullende wensen</p>
            <h3 className="text-2xl font-semibold mb-3">Uitgebreid beheer &amp; projecten</h3>
            <p className="text-2xl font-bold mb-4">Op maat</p>
            <p className="text-muted-foreground leading-relaxed mb-4">Meer werkplekbeheer, een migratie, websitebeheer of automatisering nodig? We maken een apart voorstel op basis van de werkzaamheden en jouw omgeving.</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Geen groter standaardpakket zonder uitleg: je weet vooraf wat we uitvoeren, wat het kost en welke afspraken gelden.</p>
            <Button variant="outline" className="w-full h-auto min-h-12 whitespace-normal text-center" asChild><a href="/?aanvraag=maatwerk#contact">Bespreek je wensen</a></Button>
          </div>
          <div className="p-6 sm:p-8 rounded-2xl gradient-card border border-primary/20">
            <h3 className="text-xl font-semibold mb-3">Liever eerst kennismaken?</h3>
            <p className="text-muted-foreground leading-relaxed mb-5">Een kennismakingsgesprek is gratis. We bespreken je situatie en hulpvraag; een technische controle van je systemen is een aparte, betaalde dienst.</p>
            <Button variant="outline" className="w-full h-auto min-h-12 whitespace-normal text-center" asChild><a href="/?aanvraag=kennismaking#contact">Vraag een gratis kennismaking aan</a></Button>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-6xl mx-auto mt-8 p-6 sm:p-8 rounded-2xl gradient-card border border-primary/30">
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div className="min-w-0">
            <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-3">Betaalde technische controle</span>
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Microsoft 365 &amp; Werkplek Check</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">Een controle van de vooraf afgesproken Microsoft 365-omgeving en werkplekken, met aandacht voor accounts, MFA, rechten, mail, Teams, OneDrive en basisbeveiliging. Je ontvangt een overzicht van bevindingen en praktische verbeterpunten.</p>
            <p className="text-sm text-muted-foreground leading-relaxed">Omvang en prijs spreken we vooraf af. Het uitvoeren van verbeteringen is niet automatisch inbegrepen. Dit is geen volledige audit of penetratietest en niet dezelfde dienst als de gratis online zelfcheck.</p>
          </div>
          <div className="min-w-0 lg:max-w-xs">
            <p className="text-muted-foreground">Vanaf <strong className="text-3xl text-foreground">€349</strong></p>
            <p className="text-sm text-muted-foreground mt-2 mb-5">Eenmalig · exclusief btw</p>
            <Button variant="hero" className="w-full h-auto min-h-12 whitespace-normal text-center" asChild><a href="/?aanvraag=technische-controle#contact">Vraag een technische controle aan</a></Button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto mt-8 text-center">
        <p className="text-muted-foreground mb-4">Zelf een eerste indruk krijgen? Beantwoord 8 vragen in de gratis online IT-zelfcheck. Je krijgt een indicatieve score, geen technische controle.</p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
          <Button variant="outline" className="h-auto min-h-12 whitespace-normal text-center" asChild><Link to="/it-check">Start gratis online zelfcheck<ArrowRight className="w-4 h-4 flex-shrink-0" /></Link></Button>
          <Button variant="outline" className="h-auto min-h-12 whitespace-normal text-center" asChild><a href="https://wa.me/31851249091"><MessageSquareText className="w-4 h-4 flex-shrink-0" />Vraag via WhatsApp</a></Button>
        </div>
      </div>
    </div>
  </section>
);

export default Pricing;
