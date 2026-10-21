# Harkas IT servicedesk: vergelijking en verbeterplan

Datum: 21 oktober 2026. Referentie: geopende TOPdesk-omgeving in Microsoft Edge, uitsluitend bekeken. Er zijn geen meldingen, instellingen, berichten of bestanden in TOPdesk gewijzigd, verzonden of verwijderd. Alleen workflowpatronen zijn overgenomen; geen ZGA-inhoud, persoonsgegevens, kennisartikelen of configuratie-export.

## Vergelijking en uitvoering

| Onderdeel | Waargenomen in TOPdesk | Harkas voor deze wijziging | Uitgevoerde verbetering |
| --- | --- | --- | --- |
| Meldingen | Eerste/tweede lijn, categorie, aanmelder, objecten, historie, bijlagen, tijdregistratie | Afzonderlijk klantportaal, categorieën, reacties, interne notities en bijlagen | Klantzichtbare wijzigingshistorie, standaardantwoorden en directe ticketlinks |
| Nummering | Voorbeelden volgen `ZGA-I` met jaar/maand en reeks; exacte teller/resetinstelling niet zichtbaar | Database-identity met unieke constraint, weergave `HIT-00001` | Bestaande permanente nummering behouden; groeit door boven vijf cijfers. Reeksgaten na rollback zijn normaal |
| Statussen | Toegewezen, in behandeling, wacht op gebruiker; afmelding afzonderlijk | Nieuw, in behandeling, wacht op klant, opgelost, gesloten | Toegewezen en wacht op leverancier toegevoegd; klantreactie heropent wacht-op-klant/opgelost |
| Behandeling | Groep en individuele behandelaar, leverancier en extern nummer | Alleen vrije tekst voor individuele behandelaar | Zes behandelgroepen, automatische eerste routering op categorie, daarna handmatig beheer |
| Werkvoorraad | Groepslijsten met status, streefdatum, aanmelder en categorie | Recente tickets met statusfilter en zoeken | Open/niet toegewezen/te laat/alle, groepsfilter en sortering op prioriteit/deadline/activiteit |
| E-mail | Verzonden mail in de tijdlijn; nummer, onderwerp, reactie en portaalverwijzing; interne acties gemarkeerd | Transactionele outbox met snapshots, maar `info@` en dagelijkse retry | Afzender, Reply-To en medewerkerontvanger `support@harkasit.nl`; retry elke vijf minuten; mailstatus zichtbaar voor medewerkers |
| SLA | Impact, urgentie, prioriteit, streefdatum, on-hold en knop SLA koppelen | Geen deadline/serviceafspraak | Bewuste streefdatum en SLA-referentie per ticket. Geen verzonnen contractuele reactietijden |
| Kennisbank | Thema's, zoeken, aparte interne artikelen, suggesties bij melding | Geen ticketkennisbank | Zoekbare eigen kennisbank; interne concepten en expliciet voor alle geautoriseerde klanten gepubliceerde artikelen |
| Automatisering | Verzonden meldingsmail en partnerupdates met status/prioriteit zichtbaar in historie | DB-triggers en e-mailwachtrij | Routering, automatisch heropenen, nieuwe velden in notificaties, zichtbare historie, begrensde verzending en herhaalde afhandeling |

De achterliggende TOPdesk SLA-contracten, actieregels en alle beheerdersinstellingen zijn niet volledig toegankelijk/gecontroleerd. Er wordt niet gesteld dat de volledige TOPdesk-configuratie is doorgespit.

## E-mailafspraken

Iedere nieuwe melding, publieke klant- of medewerkerreactie, zichtbare bijlage en wijziging van status, prioriteit, behandelaar, behandelgroep, onderwerp, categorie, omschrijving, streefdatum of serviceafspraak maakt in dezelfde databasetransactie een onveranderlijke e-mailgebeurtenis voor de aanmelder en de servicedesk. Een update met ongewijzigde waarden maakt geen nieuwe gebeurtenis. Een wijziging van meerdere velden kan meerdere afzonderlijke berichten opleveren. Interne reacties en interne bijlagen maken nooit een klantmail of klantzichtbare historie.

Verzending wordt direct na de portaalactie geprobeerd; de bestaande Supabase scheduler probeert met een in Vault bewaard token de resterende wachtrij elke vijf minuten. Vercel Hobby staat alleen dagelijkse taken toe; de dagelijkse Vercel-taak blijft als extra vangnet staan. De worker gebruikt vaste idempotentiesleutels, acht gebeurtenissen per ronde en opeenvolgende providerrequests. Zes mislukte pogingen worden als fout zichtbaar; er is geen onbegrensde, stilzwijgende retry. De status ‘Geaccepteerd door mailprovider’ betekent nadrukkelijk geen bewezen aflevering in de inbox. Definitieve afleverstatus/webhookverwerking is een vervolgstap.

Reageren via het portaal koppelt antwoorden direct aan het ticket. Antwoorden op de mailbox worden nog niet automatisch als ticketreactie ingelezen. Reply-To verwijst naar de bestaande supportmailbox. Het domein `harkasit.nl` is bij de controle in Resend geverifieerd en geschikt voor verzenden.

## Validatie

- Productiebuild geslaagd.
- Gewijzigde React-componenten en ondersteuningsbibliotheek door ESLint gecontroleerd.
- `node tests/support.test.mjs`: negen gedragstests voor nummering, deadlines, leesbare mailinhoud, headers, authenticatie, HTML-escaping, afzender/Reply-To, provider-retry en de verificatie van het schedulertoken. Provider en database in deze tests zijn gemockt; er worden geen e-mails verstuurd.
- `tests/support-workflow.sql`: op het actieve Supabase-project geslaagd binnen een volledig teruggedraaide transactie. Controleert mailparen, interne privacy, routering, heropenen, klantisolatie, interne/gepubliceerde kennis en autorisatie van maildiagnostiek. Geen testtickets of e-mailgebeurtenissen blijven achter.
- Supabase RLS en grants gecontroleerd. Mailpayloads zijn niet rechtstreeks leesbaar door portaalgebruikers; medewerkers krijgen alleen statusaantallen via een gecontroleerde functie.
- Brede TypeScript-controle meldt bestaande fouten in `client.ts`, `AdminBtwOverzicht.tsx` en `AdminParking.tsx`; geen nieuwe ticketfouten gevonden. De productiebuild blijft slagen.
- Browsercontrole achter een inlogscherm vereist een aangemelde Harkas Admin-sessie. TOPdesk-sessie blijft alleen-lezen.

## Vervolg met prioriteit

1. Bevestig een echte testmail in de supportmailbox en controleer provideraflevering; stel gesigneerde delivery/bounce-webhooks in wanneer die operationele terugkoppeling gewenst is.
2. Leg per beheercontract de servicekalender, responstijd, oplostijd en pauzevoorwaarden vast. Bouw daarna pas automatische SLA-deadlines en escalaties. Nu zijn deadlines expliciete planningsdoelen; wachten pauzeert ze niet automatisch.
3. Vul eigen kennisartikelen aan en keur publieke publicatie bewust goed. Er wordt geen ZGA-kennis overgezet.
4. Voeg veilig ingelezen mailboxreacties toe met verificatie van afzender, klantrechten, ticketkoppeling, deduplicatie en onderdrukking van automatische antwoordlussen. Verander de bestaande MX-records niet voor deze uitbreiding.
5. Overweeg tijdregistratie, gekoppelde assets/leveranciers en deelmeldingen als afzonderlijke volgende fase. Deze uitgebreide TOPdesk-onderdelen zijn niet blind gekopieerd.
6. Breid serverpaginering uit wanneer de werkvoorraad boven 500 tickets groeit (klantportaal nu maximaal 200).

## Bestaande infrastructuurbeperking

Een eerste test die een nieuwe klantfixture probeerde te maken werd tegengehouden door `HARKAS_WRITER_FENCED`: de bestaande primary-write-lease voor de algemene klantenadministratie was niet actief. De test is aangepast om alleen een bestaande klantreferentie binnen een rollbacktransactie te gebruiken. De HA-beveiliging is niet uitgezet of omzeild. De supportmodule gebruikt zoals voorheen rechtstreeks Supabase met RLS; Neon/failover valt buiten deze wijziging.
