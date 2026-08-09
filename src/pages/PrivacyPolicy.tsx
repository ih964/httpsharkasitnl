import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="container px-6 max-w-4xl mx-auto">
          <div className="mb-10">
            <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">Privacybeleid</span>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacybeleid – Harkas IT</h1>
            <p className="text-muted-foreground">Laatst bijgewerkt: 15 juli 2026 · versie 2026-07-15</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p>
              Harkas IT neemt de bescherming van persoonsgegevens serieus. In dit privacybeleid leggen wij uit welke
              persoonsgegevens wij verwerken, voor welke doelen, hoe lang wij deze bewaren en welke rechten u heeft.
              Dit beleid geldt voor onze website, IT Quick Scan, contactaanvragen, offertes, administratie en IT-diensten.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">1. Verantwoordelijke</h2>
            <ul className="list-none space-y-1">
              <li><strong className="text-foreground">Bedrijf:</strong> Harkas IT</li>
              <li><strong className="text-foreground">E-mail:</strong> info@harkasit.nl</li>
              <li><strong className="text-foreground">KvK:</strong> 84795085</li>
              <li><strong className="text-foreground">BTW:</strong> NL004014438B12</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">2. Welke gegevens verwerken wij?</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Contactgegevens:</strong> naam, bedrijfsnaam, e-mailadres, telefoonnummer en berichtinhoud.</li>
              <li><strong className="text-foreground">IT Quick Scan:</strong> antwoorden, onderdeel-scores, totaalscore, risiconiveau, aanbevelingen, aantal medewerkers en het moment waarop toestemming is gegeven.</li>
              <li><strong className="text-foreground">Toestemmingsbewijs:</strong> de gebruikte privacyversie, toestemming voor rapportverwerking en afzonderlijke toestemming voor commerciële opvolging.</li>
              <li><strong className="text-foreground">Commerciële administratie:</strong> leadstatus, opvolgdatums, interne notities, offertegegevens, bedragen en vastgelegde klantreacties.</li>
              <li><strong className="text-foreground">Klant- en factuurgegevens:</strong> adres-, KvK-, btw-, offerte-, factuur- en correspondentiegegevens.</li>
              <li><strong className="text-foreground">Technische en beveiligingsgegevens:</strong> browser-, apparaat-, log- en beveiligingsinformatie. Voor misbruikbeperking kan tijdelijk een eenrichtingshash worden gebruikt; het ruwe netwerkadres wordt niet in het scanleadrecord opgeslagen.</li>
              <li><strong className="text-foreground">Supportgegevens:</strong> foutmeldingen, screenshots, apparaat- of accountinformatie die u zelf met ons deelt.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">3. Doelen van de verwerking</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Het berekenen, bewaren, leveren en bespreken van een aangevraagd scanrapport.</li>
              <li>Het opvolgen van een aanvraag wanneer u daarvoor toestemming geeft of wanneer dit nodig is om uw verzoek af te handelen.</li>
              <li>Het voorbereiden, controleren en beheren van offertes en klantafspraken.</li>
              <li>Het uitvoeren van IT-beheer, Microsoft 365-beheer, werkplekbeheer, support, websites, hosting, domeinen en automatisering.</li>
              <li>Administratie, facturatie en het voldoen aan wettelijke verplichtingen.</li>
              <li>Beveiliging, fraudepreventie, rate limiting, auditlogging en onderzoek naar storingen of misbruik.</li>
              <li>Verbetering van onze website en dienstverlening.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">4. Grondslagen</h2>
            <p>Wij verwerken gegevens op basis van één of meer van de volgende grondslagen:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Toestemming:</strong> voor het bewaren en bespreken van het scanrapport en, afzonderlijk, voor commerciële opvolging.</li>
              <li><strong className="text-foreground">Overeenkomst of precontractuele stappen:</strong> voor offertes, afspraken en uitvoering van diensten.</li>
              <li><strong className="text-foreground">Wettelijke verplichting:</strong> voor fiscale en administratieve bewaarplichten.</li>
              <li><strong className="text-foreground">Gerechtvaardigd belang:</strong> voor beveiliging, fraudepreventie, intern klantbeheer en noodzakelijke zakelijke communicatie.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">5. IT Quick Scan en profilering</h2>
            <p>
              De IT Quick Scan berekent automatisch een indicatieve score op basis van de door u gekozen antwoorden.
              De uitslag is geen technische audit, penetratietest of volledig beveiligingsadvies. Er worden geen besluiten
              genomen die juridische of vergelijkbare ingrijpende gevolgen voor u hebben. Een medewerker controleert de
              context voordat een definitief advies, prijs of technische toezegging wordt gedaan.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">6. Delen met derden</h2>
            <p>Wij verkopen geen persoonsgegevens. Wij delen gegevens alleen wanneer dit noodzakelijk is.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Met hosting-, cloud-, database-, e-mail-, beveiligings-, domein- en administratiedienstverleners.</li>
              <li>Met betrouwbare onderaannemers wanneer dit nodig is voor een afgesproken dienst.</li>
              <li>Met bevoegde autoriteiten wanneer wij daartoe wettelijk verplicht zijn.</li>
            </ul>
            <p>Waar nodig sluiten wij verwerkersovereenkomsten en beperken wij toegang tot het afgesproken doel.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8">7. Beveiliging</h2>
            <p>
              Wij gebruiken onder meer versleutelde verbindingen, toegangsbeperkingen, rollen, server-side autorisatie,
              auditlogging, invoervalidatie, spambeveiliging en rate limiting. Geen enkel systeem is volledig risicoloos.
              Bij een incident nemen wij passende maatregelen en melden wij dit wanneer de wet dat vereist.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">8. Bewaartermijnen</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Scanleads:</strong> standaard maximaal 24 maanden na inzending wanneer geen klantrelatie ontstaat.</li>
              <li><strong className="text-foreground">Verloren of niet-actieve leads:</strong> worden na het verstrijken van de bewaartermijn verwijderd of waar passend geanonimiseerd.</li>
              <li><strong className="text-foreground">Klant-, offerte- en projectgegevens:</strong> zolang nodig voor dienstverlening, afspraken, bewijsvoering en nazorg.</li>
              <li><strong className="text-foreground">Administratieve en fiscale gegevens:</strong> zolang wettelijk verplicht.</li>
              <li><strong className="text-foreground">Beveiligings- en rate-limitgegevens:</strong> zo kort mogelijk en alleen zolang nodig voor bescherming tegen misbruik.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8">9. Uw rechten</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Inzage en een kopie van uw persoonsgegevens.</li>
              <li>Correctie van onjuiste of onvolledige gegevens.</li>
              <li>Verwijdering, voor zover geen wettelijke bewaarplicht geldt.</li>
              <li>Beperking van verwerking en bezwaar tegen verwerking op basis van gerechtvaardigd belang.</li>
              <li>Overdraagbaarheid van gegevens wanneer dit wettelijk van toepassing is.</li>
              <li>Intrekken van toestemming zonder gevolgen voor eerdere rechtmatige verwerking.</li>
            </ul>
            <p>Stuur een verzoek naar info@harkasit.nl. Wij kunnen om aanvullende identificatie vragen om misbruik te voorkomen.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8">10. Commerciële communicatie</h2>
            <p>
              Commerciële opvolging na de IT Quick Scan is optioneel. Wanneer u deze toestemming niet geeft, gebruiken wij
              de aanvraag alleen voor het leveren of bespreken van het gevraagde rapport. U kunt toestemming altijd intrekken
              via info@harkasit.nl.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">11. Cookies</h2>
            <p>
              Wij gebruiken noodzakelijke cookies en, na toestemming waar vereist, aanvullende cookies voor analyse of
              verbetering. U kunt cookies beheren via uw browser of onze cookiemelding.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">12. Internationale doorgifte</h2>
            <p>
              Wanneer een leverancier gegevens buiten de Europese Economische Ruimte verwerkt, gebruiken wij passende
              waarborgen zoals een adequaatheidsbesluit of goedgekeurde contractuele bepalingen.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">13. Wijzigingen</h2>
            <p>
              Wij kunnen dit beleid aanpassen wanneer diensten, systemen of wetgeving veranderen. Bij de IT Quick Scan
              registreren wij welke privacyversie bij de toestemming hoorde.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8">14. Contact en klacht</h2>
            <p><strong className="text-foreground">E-mail:</strong> info@harkasit.nl</p>
            <p><strong className="text-foreground">Bedrijf:</strong> Harkas IT</p>
            <p>U heeft daarnaast het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
