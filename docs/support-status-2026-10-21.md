# Servicedesk: verificatie en vervolg, 21 oktober 2026

## Uitgevoerd
- Compacte ticketwerkplekken met gescheiden gegevens, gesprek, bijlagen en historie.
- HIT-nummering, klantmails bij zichtbare wijzigingen, persoonlijke login met wachtwoord of link.
- Replymatching via exacte conversatiereferentie en goedgekeurde contactpersoon.
- Nieuwe losse mail van een contactpersoon bij precies één klant wordt een nieuw ticket. Maximaal tien per afzender per uur; onduidelijke/ongeautoriseerde berichten en antwoorden zonder veilige koppeling blijven ter beoordeling. Dit is een beperkte mailintake, geen identiteitsbewijs voor gevoelige autorisaties.
- Bijlagen blijven bij de import horen; veilige bestandstypen/groottes en toegangscontrole blijven gelden.
- Aan mij toewijzen gebruikt het ingelogde medewerkersadres; Mijn werkvoorraad filtert open tickets op dat adres. Bestaande handmatig ingevoerde namen blijven beschikbaar maar vallen niet automatisch onder dit adresfilter.
- Drie klantartikelen gepubliceerd: ticket aanmaken/volgen, antwoorden per e-mail en inloggen/wachtwoord instellen.

## Verificatie
- Database rollbacktest geslaagd: notificaties bij wijzigingen, geen mail bij identieke wijziging, routing, heropening, tenantisolatie, interne notities en kennisbankrechten. Geen mail uit deze test verstuurd.
- 18 inboundtests: referenties, quoting, automatische berichten, sendercontrole, gesloten tickets, dubbele import, primary fencing, nieuwe intake, ambigue contacten, limiet en bijlagen.
- Productie had bij controle 18 verzonden mailgebeurtenissen, geen wachtrij/fouten, actuele mailboxcontrole zonder foutmelding.
- Build, gerichte lint en server-TypeScript-controle geslaagd.
- Eerdere praktische test bevestigde portaal-ticket, ontvangstmail, replyimport en status/reactiemail. Nieuwe mail-aanmaak en echte bijlagedownload moeten nog met een verse mail vanaf het private klanttestadres worden bevestigd.

## TOPdesk-vergelijking en open punten
Alleen gelezen: werkvoorraad met nummer, streefdatum, aanmelder, omschrijving, status, behandelaar, categorie/subcategorie en soort melding; details met verzoek, acties en bijlagen/verzonden mail. Geen ZGA-klantgegevens overgenomen naar Harkas.
Harkas ondersteunt inmiddels de kern van nummering, status, behandelgroepen, eigen/open werkvoorraad, communicatie, bijlagen en kennisbank. De volledige TOPdesk-configuratie voor SLA en automatiseringsregels is niet vastgesteld.

Nog in te richten met zakelijke keuzes:
- SLA: overeengekomen reactietijd/oplostijd, werktijden, feestdagen en welke wachtstatus de klok pauzeert. Het huidige streefdatumveld is planning, geen volledig SLA-contractmodel.
- Herinneringen/escalatie: ontvanger, termijn en herhaling per wachttype. Nog niet geactiveerd zonder deze afspraken.
- Uitgebreide behandelaarsdirectory en groepslidmaatschap; huidige toewijzing is tekst/adres.
- Praktijktest nieuwe e-mail met bijlage en afronden/heropenen door klant.
