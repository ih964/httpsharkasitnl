# Mail & Hosting in Harkas Admin

Admin-menu: **Mail & Hosting** (`/admin/snelle-toegang`).

## Directe toegang

- info@harkasit.nl
- administratie@harkasit.nl
- support@harkasit.nl
- Plesk Cloud86 (`https://shared70.cloud86-host.nl:8443`)
- Plesk e-mailbeheer, websitebeheer, bestanden, WordPress Toolkit, Mijn Cloud86

De pagina is uitsluitend toegankelijk voor gebruikers met de adminrol.
Webmaillinks selecteren het juiste e-mailadres, maar versturen **geen wachtwoord** en vormen op zichzelf **geen SSO**.
Roundcube kan bij het wisselen tussen mailboxen opnieuw om authenticatie vragen.

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

Voor **echte** automatische toegang tot drie verschillende mailboxen is een interne mailclient met server-side IMAP-sessies (per mailbox) of een SSO-oplossing van de mailprovider nodig. Plesk-sessietokens loggen alleen in bij het Plesk-panel, niet automatisch in bij drie verschillende Roundcube-accounts. Deze pagina levert veilige snelkoppelingen en sessiehergebruik; geen onbewezen automatische webmail-login.
