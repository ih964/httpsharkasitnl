# Antwoorden per e-mail en klikbare ticketlinks

De ticketmails bevatten een echte HTML-knop ‘Ticket openen’ en daarnaast een klikbare tekstlink. De bestemming is `/support?ticket=<id>` voor klanten en `/admin/tickets?ticket=<id>` voor medewerkers. De URL verleent zelf geen toegang; de bestaande portaalrechten blijven nodig. Bestaande ontvangen e-mails veranderen niet achteraf.

## Eenmalig verbinden

Open Harkas Admin → Supporttickets → **Mailbox & intake**. Vul daar het bestaande wachtwoord van `support@harkasit.nl` in en kies **Mailbox verbinden**. De server test eerst een TLS-verbinding met de bestaande Cloud86-mailhosting op poort 993 en slaat daarna uitsluitend een versleutelde Vault-secret op. Er worden geen MX-records veranderd en er is geen wachtwoord nodig in chat of GitHub/Vercel-configuratie.

Zolang de mailbox niet verbonden is, blijven normale portaalreacties en uitgaande ticketmails werken. Automatische import is dan nog niet actief. De interface toont dit expliciet.

## Verwerking

De bestaande ondertekende Supabase-taak controleert iedere minuut de inbox en verwerkt maximaal vijftien berichten per controle. Alle bestaande inboxberichten worden na eerste verbinding beoordeeld. Alleen INBOX wordt gelezen; berichten worden niet verplaatst, verwijderd of als gelezen gemarkeerd. UIDVALIDITY/UID en een unieke sleutel per Message-ID voorkomen herhaalde invoer; het wijzigen van mailboxidentiteit vereist een nieuwe verbinding.

Een antwoord wordt automatisch klantzichtbaar aan een ticket toegevoegd als:

- In-Reply-To of References exact verwijst naar een opgeslagen uitgaande ticketmail; deze referenties bevatten een onvoorspelbare event-ID. Het onderwerp/ticketnummer alleen is nooit voldoende bewijs.
- Er precies één bijbehorend ticket is en het niet gesloten is.
- Er precies één afzender is die voorkomt in de contactpersonenlijst voor die klant.
- De mail leesbare platte tekst of toegestane bijlagen bevat en geen automatisch antwoord is.

Onbekende afzenders, nieuwe mails zonder betrouwbare koppeling, antwoorden op gesloten tickets, HTML-only berichten en onveilige/te grote bijlagen blijven in **Te beoordelen**. Medewerkers kunnen een bericht na inhoudelijke controle expliciet aan een ticket koppelen of zonder koppeling afhandelen. Deze handmatige toestemming maakt de inhoud zichtbaar en stuurt een bevestiging naar de afzender; de interface vraagt dit expliciet te bevestigen.

Bij een geldige import worden de reactie en mailgebeurtenissen in dezelfde transactie opgeslagen. De bestaande heropeningsregel geldt bij wachten op klant/opgelost. De bevestiging van een e-mailreactie gaat naar de daadwerkelijke reageerder; medewerkers ontvangen de servicedeskmelding. Eigen automatisch verzonden ticketmails, bounces en afwezigheidsmeldingen worden niet opnieuw als reactie verwerkt.

## Bijlagen en beveiliging

PNG, JPEG, WEBP, PDF en TXT zijn toegestaan tot 10 MB per bestand; het hele bronbericht is begrensd op 20 MB. Niet-toegestane bestanden blijven alleen in de oorspronkelijke mail, die handmatig gecontroleerd moet worden. E-mailbijlagen worden afgeschermd opgeslagen en kunnen uitsluitend door ticketgerechtigde gebruikers worden gedownload. Er wordt geen inkomende HTML uitgevoerd of aan een AI-agent als instructie aangeboden. De rechten worden bij iedere download opnieuw gecontroleerd.

Nieuwe ticketmails krijgen een vaste Message-ID per gebeurtenis; de provider-Message-ID wordt eveneens opgeslagen wanneer die beschikbaar is. Antwoorden op oudere mails zonder opgeslagen referentie gaan naar de intake. Een contactadres plus een replyreferentie is een beperkte e-mailkoppeling, geen vervanging voor een volledige identiteitscontrole; gebruik het portaal voor gevoelige wijzigingen of autorisaties.

De supportmodule blijft rechtstreeks op het actieve Supabase-project werken. De nieuwe importer controleert vóór schrijven de bestaande primary/writer/epoch-status. De mailhosting en de bestaande info-/administratieconnector blijven behouden; de supportimporter heeft een eigen, afgeschermde verbinding binnen Harkas Admin.

## Validatie

- Productiebuild en gerichte TypeScript-controle van de servercode.
- Bestaande mailtests uitgebreid met echte HTML-links en de ticketknop.
- Inbound tests voor MIME-referenties, geciteerde tekst, automatische antwoorden, afzenderrechten, gesloten tickets, dubbele import en primary-fencing.
- Volledige IMAP-praktijktest volgt zodra het mailboxwachtwoord via de beheerinterface is ingevoerd.
