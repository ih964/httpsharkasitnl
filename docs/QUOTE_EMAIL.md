# Offertes per e-mail

De actie **E-mailen** op `/admin/offertes` toont ontvanger, CC, bericht en de PDF-bijlage. Alleen opgeslagen, geldige concepten/verzonden offertes kunnen worden verstuurd. De afzender is vast `Harkas IT <info@harkasit.nl>`; antwoorden gaan naar `info@harkasit.nl`.

`/api/quotes` verifieert de sessie, de module `quotes` en de bestaande schrijflease. De server maakt de PDF uit de opgeslagen klant- en bedrijfsgegevens en de databasebedragen. De browser kan geen PDF, afzender of bedragen voor de verzending aanleveren.

## Bevestiging en herhalen

Voor een providerverzoek wordt de volledige onveranderlijke e-mail opgeslagen in `quote_email_deliveries`. Dezelfde opdracht houdt dezelfde Resend-idempotentiesleutel en PDF. Een onzekere opdracht blokkeert verdere wijzigingen aan de offerte. Na herladen verschijnt **Verzending afronden**, met de oorspronkelijke ontvangers.

De offertestatus en verzendgegevens veranderen pas na provideracceptatie. De interface noemt provideracceptatie; dit is geen bewijs dat een bericht in de inbox is afgeleverd. Na bevestiging kan een gebruiker bewust een nieuwe kopie sturen.

Een timeout, HTTP 429/409/5xx of ontbrekende providerbevestiging houdt de opdracht open. Alleen een expliciete afwijzing (400/401/403/404/413/422) geeft de offerte vrij. Omdat Resend sleutels 24 uur bewaart, worden onzekere opdrachten na 23 uur geblokkeerd voor herhaling. Een beheerder moet dan eerst de providerregistratie controleren en de opdracht verzoenen; de applicatie verstuurt niet blind opnieuw.

## Uitrol

Pas de migratie `quote_email_delivery` eerst toe op de bestaande Neon-standbydatabase en daarna op Supabase. De migratie kopieert de lokale writer fence en registreert de nieuwe tabel voor DR-capture. Neem `quote_email_deliveries` op in de DR-manifesten. De omgeving gebruikt de bestaande `RESEND_API_KEY`; die komt nooit in de browser.

## Gerichte verificatie

`node tests/quote-email.test.mjs` controleert validatie, de vaste afzender, een stabiele PDF, opgeslagen bedragen, provideracceptatie, dubbel klikken, timeout na acceptatie, databasefout na acceptatie, afwijkende ontvangers en de 23-uursgrens. De provider is gemockt; deze tests versturen niets. `node tests/quotes.test.mjs` controleert berekeningen en PDF-paginering.
