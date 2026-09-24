# Harkas One Release 1 — hardening- en rollout-runbook

## Status
Deze runbook hoort bij de featurebranch `agent/harkas-one-foundation` en PR #3.

Geen van de nieuwe migraties mag rechtstreeks op productie worden uitgevoerd zonder:
1. recente databaseback-up;
2. controle in staging of een herstelbare testomgeving;
3. volledige handmatige end-to-endtest;
4. expliciete toestemming van de eigenaar.

## Wat deze release bevat
- publieke IT Quick Scan;
- scanlead en toestemmingsregistratie;
- adminoverzicht en opvolging;
- audit-/activiteitentijdlijn;
- lead-naar-klantconversie;
- conceptadvies en conceptofferte;
- PDF-preview/download;
- offertecontrole, goedkeuring, handmatige verzending en klantreactie;
- admin-only RLS en server-side write guards;
- honeypot, idempotency, payloadlimieten en rate limiting;
- privacyversie en standaard bewaartermijn van 24 maanden.

## Migratievolgorde
Voer de migraties uitsluitend in bestandsvolgorde uit:

1. `20260714213000_assessment_lead_engine.sql`
2. `20260714224500_assessment_lead_activity.sql`
3. `20260714231500_convert_assessment_lead_to_customer.sql`
4. `20260715001000_assessment_proposal_drafts.sql`
5. `20260715003000_assessment_proposal_status.sql`
6. `20260715005000_assessment_proposal_lifecycle.sql`
7. `20260715010000_release1_security_hardening.sql`

Controleer vóór uitvoering dat de bestaande `user_roles`, `app_role` en `has_role`-functie aanwezig zijn.

## Back-up vooraf
- Maak een volledige Supabase-databaseback-up of herstelpunt.
- Exporteer minimaal schema en data van:
  - `user_roles`;
  - `customers`;
  - `assessment_leads` wanneer deze al bestaat;
  - `assessment_runs`;
  - `assessment_audit_events`;
  - `assessment_proposal_drafts`.
- Noteer huidig productiecommit en Vercel-deployment-id.

## Staging-controles na migratie

### Autorisatie
1. Log in met een adminaccount en controleer `/admin/scans` en `/admin/offertes`.
2. Log in met een normaal authenticated testaccount zonder adminrol.
3. Controleer dat dit account:
   - geen assessmentleads kan lezen;
   - geen scans kan lezen;
   - geen audit-events kan lezen;
   - geen offertes kan lezen;
   - geen status, notitie, klantconversie of offerte kan wijzigen.
4. Controleer dat de UI het niet-adminaccount terugstuurt naar `/admin/login`.

### Publieke scanbeveiliging
1. Voltooi een geldige scan en controleer één lead, één run en één `submitted` audit-event.
2. Herhaal exact dezelfde RPC met dezelfde `submission_key`; er mag geen dubbele lead ontstaan.
3. Vul het honeypotveld programmatisch; de inzending moet worden geweigerd.
4. Doe vier nieuwe inzendingen met hetzelfde e-mailadres binnen één uur; de vierde moet worden geblokkeerd.
5. Controleer dat geen ruw IP-adres in `assessment_leads` of auditmetadata staat.
6. Controleer vastlegging van:
   - `privacy_notice_version`;
   - `consent_recorded_at`;
   - `retention_until`;
   - beide toestemmingsvelden.

### Lead- en klantflow
1. Wijzig leadstatus en opvolgdatum.
2. Controleer audit-events.
3. Converteer een nieuwe lead naar klant.
4. Test hergebruik van een bestaand klantrecord op hetzelfde e-mailadres.
5. Controleer dat een niet-admin geen conversie kan uitvoeren.

### Offerteflow
1. Maak een conceptofferte met meerdere btw-percentages.
2. Controleer subtotalen, btw en totaal in scherm en PDF.
3. Doorloop alleen toegestane statusovergangen:
   - Concept → Gecontroleerd;
   - Gecontroleerd → Goedgekeurd;
   - Goedgekeurd → Verzonden;
   - Verzonden → Geaccepteerd of Geweigerd.
4. Controleer dat stappen niet kunnen worden overgeslagen.
5. Wijzig na goedkeuring een bedrag; status en lifecyclemetadata moeten terug naar Concept.
6. Controleer ontvanger, verzendmoment, opvolgdatum en klantreactie in auditlog.

## Browser- en toegankelijkheidscontrole
- Chrome desktop en Android;
- Edge desktop;
- Safari/iOS indien beschikbaar;
- mobiel 320–430 px;
- toetsenbordnavigatie;
- zichtbare focus;
- 200% zoom;
- pop-upblokkering bij PDF-preview;
- download van scanrapport en offerte-PDF;
- geen horizontale overflow op tabellen en formulieren.

## Privacycontrole
- Privacytekst toont versie `2026-07-15`.
- Scanformulier linkt naar privacybeleid.
- Marketingtoestemming blijft optioneel.
- Interne offertenotities verschijnen niet in klant-PDF.
- Auditmetadata bevat geen volledige interne notitietekst behalve waar expliciet nodig voor een geregistreerde klantreactie.
- Maak een maandelijkse beheercontrole voor records waarvan `retention_until` is verstreken; verwijdering blijft een handmatige, gecontroleerde actie totdat een apart verwijderproces is gereviewd.

## Monitoring na livegang
Controleer de eerste 48 uur:
- fouten op `submit_it_quick_scan`;
- aantallen rate-limitblokkades;
- dubbele submissions;
- mislukte admin-RPC’s;
- Vercel runtimefouten;
- browserconsolefouten;
- afwijkende aantallen leads/runs/audit-events.

## Rollback
Bij ernstige problemen:
1. zet de Vercel-productiedeployment terug naar het vorige bekende goede commit;
2. blokkeer tijdelijk `/it-check` of toon een onderhoudsmelding;
3. herstel de databaseback-up wanneer schema/data onveilig of inconsistent is;
4. voer geen gedeeltelijke handmatige reparaties uit zonder vastgelegd herstelplan;
5. documenteer oorzaak, impact, getroffen records en genomen maatregelen.

Let op: het terugdraaien van alleen frontendcode verwijdert databasekolommen, functies of policies niet. Database-rollback moet afzonderlijk en gecontroleerd gebeuren.

## Definitieve go/no-go
**GO** alleen wanneer:
- CI en preview groen zijn;
- migraties in staging geslaagd zijn;
- admin- en negatieve autorisatietests geslaagd zijn;
- publieke misbruiktests geslaagd zijn;
- volledige scan→lead→klant→offerte→reactieflow handmatig is getest;
- back-up en rollbackpad bevestigd zijn;
- de eigenaar expliciet toestemming geeft voor merge, migratie en productie.

Anders blijft de status **NO-GO**.
