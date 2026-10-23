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
nieuwe e-mail en beantwoorden. IMAP wordt voor lezen read-only geopend; er
wordt geen mail verwijderd of verplaatst en de supportintake blijft ongewijzigd.
UIDVALIDITY wordt gecontroleerd om verouderde berichtverwijzingen af te wijzen.
E-mailinhoud wordt als tekst weergegeven, nooit als HTML/script; externe
afbeeldingen worden niet geladen. Bijlagen worden als download aangeboden.
Berichten boven 20 MB en bijlagen boven 3 MB blijven via Roundcube beschikbaar.

Verzenden gaat met SMTP/TLS vanaf de gekozen vaste mailbox. Een verzonden kopie
wordt in de bestaande Sent-map opgeslagen. Een mislukte opslag na SMTP-acceptatie
wordt als waarschuwing getoond, niet als mislukte verzending. Verzenden is uitsluitend
een expliciete gebruikershandeling. Er worden geen e-mails automatisch verstuurd.

Roundcube blijft als afzonderlijke secundaire link beschikbaar en kan om een
aparte login vragen; deze functie maakt geen Roundcube-sessie en verandert geen
Roundcube-authenticatie. Plesk SSO blijft onafhankelijk hiervan.

Validatie: `node --experimental-vm-modules tests/admin-mail.test.mjs`, API
TypeScriptcontrole, frontendproductiebouw en live verbindingstest per mailbox.
