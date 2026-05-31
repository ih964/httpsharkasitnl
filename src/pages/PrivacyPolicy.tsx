import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="container px-6 max-w-4xl mx-auto">
          <div className="mb-10">
            <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
              Privacybeleid
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacybeleid – Harkas IT</h1>
            <p className="text-muted-foreground">
              Laatst bijgewerkt: 31 mei 2026
            </p>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p>
              Bij Harkas IT nemen wij de privacy van uw gegevens serieus. In dit privacybeleid leggen wij uit
              welke persoonsgegevens wij verzamelen, waarom wij deze verwerken, hoe lang wij gegevens bewaren
              en welke rechten u heeft. Dit beleid is van toepassing op onze website en op onze diensten op het
              gebied van IT-beheer, Microsoft 365, werkplekbeheer, websites, webapps, marketing en digitale oplossingen.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">1. Verantwoordelijke voor de verwerking</h2>
            <p>Harkas IT is verantwoordelijk voor de verwerking van persoonsgegevens die u aan ons verstrekt.</p>
            <ul className="list-none space-y-1">
              <li><strong className="text-foreground">Bedrijfsnaam:</strong> Harkas IT</li>
              <li><strong className="text-foreground">E-mail:</strong> info@harkasit.nl</li>
              <li><strong className="text-foreground">KvK-nummer:</strong> 84795085</li>
              <li><strong className="text-foreground">BTW-nummer:</strong> NL004014438B12</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">2. Welke persoonsgegevens verwerken wij?</h2>
            <p>Afhankelijk van uw contact met Harkas IT kunnen wij onder andere de volgende gegevens verwerken:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Contactgegevens:</strong> naam, bedrijfsnaam, e-mailadres, telefoonnummer en berichtinhoud.</li>
              <li><strong className="text-foreground">Klant- en bedrijfsgegevens:</strong> adresgegevens, factuurgegevens, KvK-gegevens, btw-gegevens, offertes, facturen en correspondentie.</li>
              <li><strong className="text-foreground">Dienstgegevens:</strong> informatie die nodig is voor IT-beheer, Microsoft 365-beheer, gebruikersbeheer, werkplekbeheer, websitebeheer, hosting, domeinen of ondersteuning.</li>
              <li><strong className="text-foreground">Technische gegevens:</strong> IP-adres, browser, apparaat, besturingssysteem, loggegevens, cookies en informatie over het gebruik van onze website.</li>
              <li><strong className="text-foreground">Supportgegevens:</strong> informatie die u met ons deelt bij supportverzoeken, zoals foutmeldingen, screenshots, apparaat- of accountinformatie en beschrijvingen van problemen.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">3. Waarvoor gebruiken wij persoonsgegevens?</h2>
            <p>Wij verwerken persoonsgegevens voor de volgende doelen:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Uitvoering van onze diensten:</strong> het leveren van IT-beheer, Microsoft 365-beheer, werkplekbeheer, support, websites, webapps, hosting, domeinbeheer, marketing en automatisering.</li>
              <li><strong className="text-foreground">Contact en communicatie:</strong> het beantwoorden van vragen, verwerken van contactaanvragen, plannen van afspraken en versturen van serviceberichten.</li>
              <li><strong className="text-foreground">Administratie en facturatie:</strong> het opstellen van offertes, facturen, klantadministratie en het voldoen aan fiscale bewaarplichten.</li>
              <li><strong className="text-foreground">Beveiliging en beheer:</strong> het beveiligen van onze systemen, websites, adminomgeving, klantgegevens en IT-diensten.</li>
              <li><strong className="text-foreground">Verbetering van onze diensten:</strong> het analyseren van websitegebruik en het verbeteren van onze website, dienstverlening en gebruikerservaring.</li>
              <li><strong className="text-foreground">Marketing:</strong> het informeren van klanten en geïnteresseerden over relevante diensten, alleen wanneer dit is toegestaan of wanneer u hiervoor toestemming heeft gegeven.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">4. Grondslagen voor verwerking</h2>
            <p>Wij verwerken persoonsgegevens alleen wanneer daarvoor een geldige grondslag bestaat. De grondslagen die wij gebruiken zijn:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Uitvoering van een overeenkomst:</strong> wanneer verwerking nodig is om onze diensten te leveren.</li>
              <li><strong className="text-foreground">Wettelijke verplichting:</strong> bijvoorbeeld voor administratie, facturatie en fiscale bewaarplichten.</li>
              <li><strong className="text-foreground">Gerechtvaardigd belang:</strong> bijvoorbeeld voor beveiliging, klantbeheer, verbetering van diensten en zakelijke communicatie.</li>
              <li><strong className="text-foreground">Toestemming:</strong> bijvoorbeeld voor bepaalde cookies, nieuwsbrieven of marketingcommunicatie waarvoor toestemming nodig is.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">5. Delen van gegevens met derden</h2>
            <p>
              Wij verkopen geen persoonsgegevens. Wij delen persoonsgegevens alleen wanneer dit nodig is voor onze
              dienstverlening, administratie, beveiliging of wettelijke verplichtingen.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Verwerkers en leveranciers:</strong> zoals hostingpartijen, cloudproviders, e-maildiensten, domein-/DNS-diensten, administratie- of facturatietools, analyse- en beveiligingsdiensten.</li>
              <li><strong className="text-foreground">Wettelijke verplichtingen:</strong> wanneer wij wettelijk verplicht zijn gegevens te delen met bevoegde autoriteiten.</li>
              <li><strong className="text-foreground">Onderaannemers of partners:</strong> wanneer wij voor specifieke werkzaamheden een betrouwbare partner inschakelen. Zij mogen gegevens alleen verwerken voor het afgesproken doel.</li>
            </ul>
            <p>
              Wanneer derde partijen namens ons persoonsgegevens verwerken, maken wij waar nodig afspraken over beveiliging,
              vertrouwelijkheid en het gebruik van persoonsgegevens.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">6. Beveiliging van persoonsgegevens</h2>
            <p>
              Wij nemen passende technische en organisatorische maatregelen om persoonsgegevens te beschermen tegen
              verlies, misbruik, onbevoegde toegang, openbaarmaking en wijziging. Denk hierbij aan toegangsbeveiliging,
              sterke wachtwoorden, waar mogelijk multifactor-authenticatie, versleutelde verbindingen, beperkte toegang
              tot systemen en zorgvuldig beheer van accounts en gegevens.
            </p>
            <p>
              Geen enkel systeem is volledig vrij van risico. Als er ondanks onze maatregelen sprake is van een beveiligingsincident,
              nemen wij passende stappen en melden wij dit waar nodig aan betrokkenen of de bevoegde toezichthouder.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">7. Bewaartermijnen</h2>
            <p>
              Wij bewaren persoonsgegevens niet langer dan noodzakelijk is voor het doel waarvoor ze zijn verzameld,
              tenzij een langere bewaartermijn wettelijk verplicht is.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Administratieve en fiscale gegevens bewaren wij zolang dit wettelijk verplicht is.</li>
              <li>Contactaanvragen bewaren wij zolang dit nodig is voor opvolging en klantrelatiebeheer.</li>
              <li>Support- en projectgegevens bewaren wij zolang dit nodig is voor dienstverlening, nazorg, bewijsvoering of beveiliging.</li>
              <li>Gegevens die niet meer nodig zijn, verwijderen of anonimiseren wij waar mogelijk.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">8. Uw rechten</h2>
            <p>U heeft volgens de AVG verschillende rechten met betrekking tot uw persoonsgegevens:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Recht op inzage:</strong> u kunt vragen welke persoonsgegevens wij van u verwerken.</li>
              <li><strong className="text-foreground">Recht op rectificatie:</strong> u kunt onjuiste of onvolledige gegevens laten corrigeren.</li>
              <li><strong className="text-foreground">Recht op verwijdering:</strong> u kunt vragen om verwijdering van uw gegevens, tenzij wij deze wettelijk moeten bewaren.</li>
              <li><strong className="text-foreground">Recht op beperking:</strong> u kunt vragen om tijdelijk minder verwerking van uw gegevens.</li>
              <li><strong className="text-foreground">Recht op overdraagbaarheid:</strong> u kunt vragen om uw gegevens in een gestructureerd formaat te ontvangen.</li>
              <li><strong className="text-foreground">Recht van bezwaar:</strong> u kunt bezwaar maken tegen verwerking op basis van gerechtvaardigd belang.</li>
              <li><strong className="text-foreground">Recht om toestemming in te trekken:</strong> wanneer verwerking op toestemming is gebaseerd, kunt u die toestemming intrekken.</li>
            </ul>
            <p>
              U kunt een verzoek indienen via info@harkasit.nl. Wij kunnen u vragen om uw identiteit te bevestigen,
              zodat wij zeker weten dat wij gegevens aan de juiste persoon verstrekken of aanpassen.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">9. Nieuwsbrieven en afmelden</h2>
            <p>
              Als u zich heeft aangemeld voor een nieuwsbrief of commerciële e-mail, kunt u zich afmelden via de afmeldlink
              in de e-mail of door een bericht te sturen naar info@harkasit.nl. Na afmelding ontvangt u geen commerciële
              nieuwsbrieven meer, tenzij u zich opnieuw aanmeldt.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">10. Cookies en vergelijkbare technieken</h2>
            <p>
              Harkas IT gebruikt cookies en vergelijkbare technieken om de website goed te laten werken, de website te verbeteren
              en inzicht te krijgen in het gebruik van onze website. Voor cookies die niet strikt noodzakelijk zijn, vragen wij waar
              nodig toestemming via onze cookiemelding.
            </p>
            <p>
              U kunt cookies weigeren of verwijderen via de instellingen van uw browser. Dit kan invloed hebben op de werking
              van bepaalde onderdelen van de website.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">11. Internationale doorgifte</h2>
            <p>
              Sommige leveranciers of cloudproviders kunnen gegevens verwerken buiten de Europese Economische Ruimte. Wanneer
              dat gebeurt, zorgen wij ervoor dat passende waarborgen worden toegepast, bijvoorbeeld contractuele afspraken of
              andere mechanismen die onder de AVG zijn toegestaan.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">12. Wijzigingen in dit privacybeleid</h2>
            <p>
              Wij kunnen dit privacybeleid aanpassen wanneer onze diensten, systemen of wettelijke verplichtingen wijzigen.
              De nieuwste versie staat altijd op onze website. Bij belangrijke wijzigingen kunnen wij u hierover informeren
              via de website of per e-mail.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">13. Contact</h2>
            <p>
              Heeft u vragen over dit privacybeleid of wilt u een verzoek indienen met betrekking tot uw persoonsgegevens?
              Neem dan contact met ons op via:
            </p>
            <p><strong className="text-foreground">E-mail:</strong> info@harkasit.nl</p>
            <p><strong className="text-foreground">Bedrijf:</strong> Harkas IT</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
