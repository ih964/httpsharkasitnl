# Mail & Hosting in Harkas Admin

Admin-menu: **Mail & Hosting** (`/admin/snelle-toegang`).

## Directe toegang

- info@harkasit.nl
- administratie@harkasit.nl
- support@harkasit.nl
- Plesk Cloud86 (`https://shared70.cloud86-host.nl:8443`)
- Plesk e-mailbeheer, websitebeheer, bestanden, WordPress Toolkit, Mijn Cloud86

De pagina is uitsluitend toegankelijk voor gebruikers met de adminrol.
**Mailbox openen** verbindt sinds 23 oktober 2026 rechtstreeks met de gekozen mailbox binnen Harkas Admin, zonder aparte mailboxlogin. De server hergebruikt de bestaande wachtwoordkluis voor info/administratie en Supabase Vault voor support. Wachtwoorden blijven server-side. Mappen, berichten, bijlagen, opstellen en beantwoorden zijn beschikbaar; zie [Directe mailboxtoegang](admin-mail-access.md).

**Roundcube openen** blijft een secundaire link naar de uitgebreide externe webmail. Deze aparte webmaillink vult alleen het adres in en kan een bestaande Roundcube-sessie behouden; het is geen Roundcube-SSO.

## Plesk eenmalig koppelen voor automatische aanmelding

Plesk Obsidian 18.0.81 ondersteunt REST-sessietokens. Controleer eerst bij Cloud86 of Remote API voor het klantaccount gebruikt mag worden.

Configureer in het **Vercel-project `httpsharkasitnl`** uitsluitend server-side (niet met een `VITE_`-prefix):

- `HARKAS_PLESK_API_KEY`: Plesk API-sleutel voor het betreffende klantaccount (niet in GitHub plaatsen).
- `HARKAS_PLESK_LOGIN`: Plesk-loginnaam van hetzelfde klantaccount.
- `HARKAS_SUPABASE_DSN`: bestaande server-side databaseverbinding van de admin-app (vereist voor admincontrole).
- `HARKAS_SUPABASE_URL` en `HARKAS_SUPABASE_PUBLISHABLE_KEY`: bestaande auth-configuratie (waar van toepassing).

Redeploy na het configureren van de variabelen. De adminpagina vraagt `GET /api/plesk-sso` op en toont pas een automatische login als de server de koppeling geconfigureerd ziet. Bij een klik controleert de server opnieuw het ingelogde Supabase-account en de adminrol, vraagt een **eenmalig Plesk-sessietoken** aan via de REST API en opent Plesk. MFA wordt niet omzeild. Bij ontbrekende API-configuratie blijft de directe Plesk-link bruikbaar als er een geldige browserlogin bestaat.

De API-host is vast ingesteld en accepteert geen door gebruikers opgegeven URL. Credentials worden niet doorgegeven aan de browser. Plesk-sessietokens worden nooit opgeslagen of gelogd. De endpoint stuurt `Cache-Control: no-store`.

Bronnen:
- https://docs.plesk.com/en-US/obsidian/api-rpc/80001/
- https://docs.plesk.com/en-US/obsidian/administrator-guide/80002/
- https://support.cloud86.io/hc/nl/articles/17600405167261-Plesk-Handleiding

## Mailboxen zonder aparte login

Dit is gerealiseerd met een interne mailclient en server-side IMAP/SMTP-aanmelding per mailbox. Er worden geen mailboxwachtwoorden aan links of frontendcode toegevoegd. Plesk-sessietokens en Roundcube-sessies staan los van deze interne mailboxtoegang.
