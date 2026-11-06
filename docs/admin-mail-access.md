# Directe mailboxtoegang

Via **Mail & Hosting → Mailbox openen** kan een beheerder info@harkasit.nl,
administratie@harkasit.nl en support@harkasit.nl direct in Harkas Admin openen.
De accountkeuze staat in `?mailbox=info|administratie|support`.

`/api/admin-mail` valideert bij ieder verzoek de Supabase-gebruiker en de
actuele adminrol in de database. Medewerkers met uitsluitend ticketrechten en
klantaccounts krijgen geen toegang. Mailboxaccounts en serveradressen staan
vast; er worden geen clientcredentials, willekeurige hosts of afzenders geaccepteerd.

Info en administratie gebruiken de bestaande webmailvermelding in de
wachtwoordkluis (het gedeelde wachtwoord is door de eigenaar bevestigd).
De server roept de bestaande `decrypt-password`-functie aan met de identiteit
van de beheerder. Support gebruikt de bestaande supportmailbox-configuratie in
Supabase Vault. De wachtwoorden worden uitsluitend server-side gebruikt en
verschijnen niet in responses, URLs of logs. Mailresponsen worden niet gecachet.

De client biedt mappen, pagina's van 30 berichten, berichttekst, bijlagen,
nieuwe e-mail en beantwoorden. IMAP wordt voor lezen read-only geopend.
Harkas One biedt daarnaast **Verwijderen**: na bevestiging verplaatst een
`POST` met `action=trash` precies één bericht naar de door de mailserver als
`\Trash` aangewezen map. De accountkeuze, UID en UIDVALIDITY worden vooraf
gevalideerd; verouderde of ontbrekende verwijzingen worden afgewezen.
De bronmap wordt alleen voor deze actie schrijfbaar geopend. Native IMAP MOVE
(of de ingebouwde IMAP4rev2-variant) is vereist, zodat er geen fallback naar
permanent verwijderen of EXPUNGE kan plaatsvinden. Zonder bruikbare prullenbak,
bij een alleen-lezen map of wanneer het bericht al in de prullenbak staat,
wordt niets verplaatst. Definitief verwijderen wordt niet aangeboden.
E-mailinhoud wordt als tekst weergegeven, nooit als HTML/script; externe
afbeeldingen worden niet geladen. Bijlagen worden als download aangeboden.
Berichten boven 20 MB en bijlagen boven 3 MB blijven via Roundcube beschikbaar.

Verzenden gaat met SMTP/TLS vanaf de gekozen vaste mailbox. De server bevestigt
verzending pas nadat SMTP de bedoelde ontvanger heeft geaccepteerd. Daarna wordt
hetzelfde RFC822-bericht in de bestaande Sent-map opgeslagen. Een onbereikbare
IMAP-verbinding of mislukte opslag (`append` geeft ook bij `false` geen succes)
levert `sent: true, saved: false` op. Een archiefstoring blokkeert verzending dus
niet en veroorzaakt geen automatische tweede verzending. Bij een onbevestigde
SMTP-uitkomst waarschuwt de app eerst Verzonden of webmail te controleren.
Verzenden is uitsluitend een expliciete gebruikershandeling; de app verstuurt
geen e-mails automatisch.

Roundcube blijft als afzonderlijke secundaire link beschikbaar en kan om een
aparte login vragen; deze functie maakt geen Roundcube-sessie en verandert geen
Roundcube-authenticatie. Plesk SSO blijft onafhankelijk hiervan.

Validatie: `node --experimental-vm-modules tests/admin-mail.test.mjs` controleert
autorisatie, lezen, SMTP-uitkomsten, opslaan van verzonden kopieën en veilig
verplaatsen met volledig gesimuleerde mailservers. Deze tests sturen of verplaatsen
geen echte berichten en bewijzen geen aflevering in een productie-inbox.
Aanvullend: API-TypeScriptcontrole, frontendproductiebouw en mobiele UI-tests.
