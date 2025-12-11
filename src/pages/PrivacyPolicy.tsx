import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container px-6 max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Privacybeleid – Harkas IT</h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p>
              Bij Harkas IT nemen we de privacy van uw gegevens zeer serieus. Dit privacybeleid beschrijft hoe we persoonsgegevens verzamelen, gebruiken, opslaan en beschermen in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG) en andere toepasselijke privacywetgeving. Door gebruik te maken van onze diensten, gaat u akkoord met de verwerking van uw gegevens zoals beschreven in dit beleid.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">1. Verantwoordelijke voor de verwerking van gegevens</h2>
            <p>Harkas IT is verantwoordelijk voor de verwerking van persoonsgegevens die u aan ons verstrekt.</p>
            <ul className="list-none space-y-1">
              <li><strong className="text-foreground">Bedrijfsnaam:</strong> Harkas IT</li>
              <li><strong className="text-foreground">E-mail:</strong> info@harkasit.nl</li>
              <li><strong className="text-foreground">KvK-nummer:</strong> 84795085</li>
              <li><strong className="text-foreground">BTW-nummer:</strong> NL004014438B12</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">2. Verzamelde persoonsgegevens</h2>
            <p>Wij verzamelen verschillende soorten persoonsgegevens afhankelijk van de diensten die u gebruikt. Dit kunnen de volgende gegevens zijn:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Identificatiegegevens:</strong> Naam, e-mailadres, telefoonnummer, bedrijfsinformatie.</li>
              <li><strong className="text-foreground">Technische gegevens:</strong> IP-adres, browserversie, locatiegegevens, cookies, apparaatinformatie.</li>
              <li><strong className="text-foreground">Gegevens van gebruik:</strong> Informatie over het gebruik van onze website, apps en diensten (bijvoorbeeld klikgedrag, bezochte pagina's, etc.).</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">3. Doelen van de verwerking van persoonsgegevens</h2>
            <p>De verzamelde gegevens worden voor de volgende doeleinden verwerkt:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Uitvoering van de overeenkomst:</strong> Het leveren van onze ICT- en marketingdiensten, zoals webontwikkeling, app-ontwikkeling en digitale marketing.</li>
              <li><strong className="text-foreground">Verbetering van diensten:</strong> Het analyseren van gebruikspatronen en het verbeteren van de gebruikerservaring.</li>
              <li><strong className="text-foreground">Communicatie:</strong> Het onderhouden van contact met klanten en prospects, zoals het verstrekken van updates en marketinginformatie (indien u hiervoor toestemming heeft gegeven).</li>
              <li><strong className="text-foreground">Wettelijke verplichtingen:</strong> Het naleven van wettelijke vereisten en het beschermen van onze rechten en belangen.</li>
              <li><strong className="text-foreground">Marketing:</strong> Indien u daarvoor toestemming heeft gegeven, het aanbieden van gerichte advertenties en gepersonaliseerde marketingcommunicatie om u te helpen de meest relevante diensten en producten te ontdekken.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">4. Rechtsgrondslagen voor gegevensverwerking</h2>
            <p>Volgens de AVG mogen wij persoonsgegevens alleen verwerken op basis van specifieke rechtsgrondslagen. De rechtsgrondslagen die we gebruiken zijn onder andere:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Toestemming:</strong> Wanneer u expliciet toestemming geeft voor het verzamelen en verwerken van uw gegevens (bijvoorbeeld voor marketingdoeleinden).</li>
              <li><strong className="text-foreground">Contractuele noodzaak:</strong> De verwerking is noodzakelijk voor de uitvoering van een overeenkomst (bijvoorbeeld het leveren van onze diensten).</li>
              <li><strong className="text-foreground">Wettelijke verplichting:</strong> De verwerking is noodzakelijk om te voldoen aan een wettelijke verplichting waaraan we onderworpen zijn.</li>
              <li><strong className="text-foreground">Legitiem belang:</strong> Wij verwerken gegevens op basis van onze legitieme belangen (bijvoorbeeld voor verbetering van onze diensten of beveiliging van onze systemen), mits deze belangen niet zwaarder wegen dan uw rechten en vrijheden.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">5. Delen van gegevens met derden</h2>
            <p>We delen uw persoonsgegevens uitsluitend in de volgende gevallen:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Verwerkers:</strong> Wij maken gebruik van externe dienstverleners voor specifieke taken, zoals hosting, marketing, gegevensopslag en analyses. Deze partijen verwerken gegevens uitsluitend in opdracht van Harkas IT en moeten voldoen aan dezelfde privacy- en beveiligingsnormen.</li>
              <li><strong className="text-foreground">Wettelijke verplichtingen:</strong> Als het wettelijk vereist is, kunnen we gegevens delen met overheidsinstanties of andere bevoegde autoriteiten.</li>
              <li><strong className="text-foreground">Bedrijfsovernames:</strong> In het geval van een fusie, overname of verkoop van onze bedrijfsactiviteiten kunnen uw persoonsgegevens worden overgedragen als onderdeel van de transactie, onder de voorwaarden van dit privacybeleid.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">6. Beveiliging van persoonsgegevens</h2>
            <p>
              We nemen passende technische en organisatorische maatregelen om uw persoonsgegevens te beschermen tegen ongeoorloofde toegang, verlies of wijziging. Dit omvat onder andere het gebruik van versleuteling en veilige servers. Toch kunnen we de absolute veiligheid van gegevens via internet niet garanderen. We zorgen ervoor dat wij voortdurend de meest geavanceerde beveiligingsmaatregelen implementeren om de bescherming van uw gegevens te waarborgen.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">7. Bewaartermijn van gegevens</h2>
            <p>
              Uw persoonsgegevens worden niet langer bewaard dan nodig is voor de doeleinden waarvoor ze zijn verzameld, tenzij we wettelijk verplicht zijn om ze langer te bewaren. Zodra de gegevens niet meer nodig zijn, worden ze veilig verwijderd of geanonimiseerd.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">8. Uw rechten</h2>
            <p>Volgens de AVG heeft u de volgende rechten met betrekking tot uw persoonsgegevens:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Recht op toegang:</strong> U heeft het recht om te weten welke persoonsgegevens we van u hebben en hoe we deze verwerken.</li>
              <li><strong className="text-foreground">Recht op rectificatie:</strong> U heeft het recht om onjuiste of onvolledige persoonsgegevens te laten corrigeren.</li>
              <li><strong className="text-foreground">Recht op wissen (recht op vergetelheid):</strong> U kunt verzoeken om uw gegevens te laten verwijderen, tenzij we wettelijk verplicht zijn om ze te bewaren.</li>
              <li><strong className="text-foreground">Recht op beperking van verwerking:</strong> U kunt vragen om de verwerking van uw gegevens te beperken.</li>
              <li><strong className="text-foreground">Recht op overdraagbaarheid van gegevens:</strong> U kunt uw gegevens in een gestructureerd, gangbaar en leesbaar formaat opvragen en overdragen aan een andere verantwoordelijke.</li>
              <li><strong className="text-foreground">Recht van bezwaar:</strong> U kunt bezwaar maken tegen de verwerking van uw gegevens op basis van legitieme belangen, zoals marketingdoeleinden.</li>
              <li><strong className="text-foreground">Recht om toestemming in te trekken:</strong> Indien u toestemming heeft gegeven voor de verwerking van uw gegevens, kunt u deze toestemming op elk moment intrekken.</li>
            </ul>
            <p>Om een van deze rechten uit te oefenen, kunt u contact met ons opnemen via de contactgegevens aan het begin van dit beleid.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8">9. Afmeldproces voor abonnees</h2>
            <p>Indien u zich wilt afmelden voor onze nieuwsbrieven of andere abonnementsdiensten, kunt u eenvoudig een e-mail sturen naar info@harkasit.nl met de volgende expliciete tekst:</p>
            <p className="italic bg-muted/50 p-4 rounded-lg">"Ik wil mij afmelden als abonnee. Mijn naam: [Uw naam] Email: [Uw e-mailadres]"</p>
            <p>Wij zorgen er dan voor dat uw gegevens binnen 168 uur uit ons systeem worden verwijderd en dat u geen verdere communicatie van ons ontvangt.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8">10. Cookies en trackingtechnologieën</h2>
            <p>
              Wij maken gebruik van cookies en vergelijkbare technologieën om de gebruikerservaring te verbeteren, het gebruik van onze diensten te analyseren en gepersonaliseerde advertenties te tonen. U kunt cookies uitschakelen via de instellingen van uw browser, maar dit kan de functionaliteit van onze website beperken.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">11. Internationale gegevensoverdracht</h2>
            <p>
              In sommige gevallen kunnen persoonsgegevens worden overgedragen naar landen buiten de EU/EER. We zorgen ervoor dat deze overdrachten voldoen aan de vereisten van de AVG, bijvoorbeeld door gebruik te maken van modelcontractbepalingen of andere mechanismen om de bescherming van persoonsgegevens te waarborgen.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">12. Wijzigingen in dit privacybeleid</h2>
            <p>
              Wij kunnen dit privacybeleid van tijd tot tijd aanpassen. Bij belangrijke wijzigingen zullen we u hiervan op de hoogte stellen via een bericht op onze website of per e-mail. Wij raden u aan regelmatig dit privacybeleid te raadplegen om op de hoogte te blijven van de laatste wijzigingen.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">13. Contact</h2>
            <p>Als u vragen heeft over dit privacybeleid of als u een verzoek wilt indienen met betrekking tot uw persoonsgegevens, kunt u contact met ons opnemen via:</p>
            <p><strong className="text-foreground">E-mail:</strong> info@harkasit.nl</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
