# Harkas One: e-mails selecteren en verwijderen

## Gebruik

In Mail staan nu selectievakjes naast de berichten. Vink één of meerdere berichten aan, tik op **Verwijderen (aantal)** en bevestig met **Naar prullenbak (aantal)**. Dit werkt voor alle vijf Harkas IT- en Webbuilder-mailboxen, ook in het gezamenlijke overzicht. De bevestiging toont het aantal per mailbox. De berichten worden verplaatst naar de echte prullenbak van hun eigen mailbox; niet definitief verwijderd.

**Alles selecteren** kiest uitsluitend de getoonde, al ingeladen berichten in het huidige filter/zoekresultaat, niet onzichtbare berichten uit de hele mailbox. Via **Meer uit ...** kunnen meer berichten worden geladen. Nieuw geladen berichten worden niet automatisch aan een bestaande selectie toegevoegd. Wisselen van mailboxfilter, wijzigen van de zoekopdracht of vernieuwen wist de selectie.

Na publicatie moet de gebruiker Harkas One vernieuwen om de nieuwe knoppen te laden; opnieuw installeren is niet nodig. Controleer de actieve productieversie voordat publicatie wordt geclaimd.

## Implementatie en veiligheid

- `OneMailList.tsx` beheert alleen selectie in het werkgeheugen. Identiteit = account + UIDVALIDITY + UID. Aanvinken opent een bericht niet.
- Expliciet controlescherm voor iedere verwijderactie; annuleren doet niets. Een directe lock voorkomt dubbel klikken.
- `POST /api/admin-mail?action=trash-many` ontvangt een expliciete lijst van 1–100 unieke UIDs en valideert beheerrechten, account, map en UIDVALIDITY. Geen wildcards of sequence-ranges.
- Eén mailbox tegelijk, maximaal 100 berichten per aanvraag. Grote selecties worden in opeenvolgende blokken uitgevoerd, niet in een verbindingenpiek.
- De server gebruikt alleen native IMAP MOVE naar een selecteerbare `\\Trash`-map. Geen permanente delete-, vlag-delete- of expunge-fallback.
- Ontbrekende berichten of een gewijzigde UIDVALIDITY stoppen vóór de verplaatsing. Succes vereist een volledige UID-bevestiging van de server.
- Bij een fout stoppen de resterende blokken. De app toont alleen het bevestigde aantal, wist de selectie en vernieuwt de lijst. Geen automatische retry van schrijfacties, ook niet na een verloren antwoord.
- De bestaande single-message trash- en SMTP-functies blijven behouden. De databasepoolfix van PR #40 is ongewijzigd.

## Validatie vóór publicatie

Productiebuild geslaagd. API-TypeScriptcheck geslaagd. Gerichte UI-lint: geen fouten, twee bestaande Fast Refresh-exportwaarschuwingen in OneMailbox. De volledige app-TypeScriptcheck meldt fouten in ongewijzigde modules (Supabase-client, btw-overzicht en parkeren); er zijn geen meldingen voor de gewijzigde mailboxmodules. Dit is geen claim dat de volledige repository typefoutvrij is.

127 geïsoleerde backendaanvragen geslaagd, inclusief alle vijf accounts, autorisatie, limieten, ongeldige IDs, stale/missing berichten, alleen-lezen mappen, ontbrekende MOVE-ondersteuning en onvolledige resultaten. De bestaande mobiele smoke-test is geslaagd, inclusief enkelvoudig verwijderen en versturen.

De nieuwe browserproeven slagen op 360/390/768/1280 pixels: aanvinken zonder openen, gelijke UIDs in verschillende accounts, select-all binnen filters, annuleren, dubbel klikken, sequentiële aanvragen, gedeeltelijke fout, verloren antwoord, vervallen selectie na vernieuwen, en 125 testberichten in blokken van 100 + 25. Screenshot van het mobiele controlescherm visueel bekeken.

Alle mail- en authenticatiegegevens in deze tests zijn synthetisch. Geen echte e-mails verstuurd, verplaatst of verwijderd. Verwijderen vanuit de eigen telefoonsessie is hiermee niet live bevestigd.
