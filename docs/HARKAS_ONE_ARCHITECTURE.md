# Harkas One — architectuurfundering

## Doel
Harkas One wordt eerst het interne platform van Harkas IT en later eventueel een multi-tenant SaaS-product voor andere IT-dienstverleners.

## Bouwprincipes
- Harkas IT gebruikt elke module zelf voordat deze als SaaS wordt aangeboden.
- Alle zakelijke data wordt vanaf het begin gekoppeld aan een `tenant_id`.
- Supabase Row Level Security is verplicht op alle tenanttabellen.
- Publieke scans worden via beperkte server-side endpoints verwerkt.
- AI maakt alleen analyses en concepten; verzending, prijsbepaling en technische wijzigingen vereisen menselijke bevestiging.
- Scans zijn indicatief totdat technische verificatie heeft plaatsgevonden.

## Releases
### Release 1 — Assessment Lead Engine
- gewogen IT Quick Scan
- bedrijfs- en contactgegevens na de uitslag
- aparte toestemming voor rapportlevering en commerciële opvolging
- scanresultaten en leads opslaan
- professioneel PDF-rapport
- e-mail aan lead en melding aan Harkas IT
- adminlijst en detailweergave
- leadstatussen: `new`, `contacted`, `qualified`, `won`, `lost`

### Release 2 — CRM Core
- organisaties, contactpersonen en leads
- activiteiten, notities, taken en tags
- opvolgdatum en eigenaar
- export- en verwijderverzoeken

### Release 3 — Assessment Engine
- herbruikbare scan-definities en versiebeheer
- categorieën, wegingen en aanbevelingsregels
- IT-, Security-, Microsoft 365-, Website- en AI-readinessscans
- rapporttemplates en vergelijking tussen scans

### Release 4 — Customer Portal
- klantlogin
- scans, rapporten, offertes, tickets en documenten
- organisatieleden en rollen

### Release 5 — Service Desk en Assets
- tickets, prioriteit en SLA
- assets, locaties, gebruikers, QR-codes en werknotities

## Rollen
- `platform_owner`
- `tenant_admin`
- `sales`
- `technician`
- `finance`
- `customer_admin`
- `customer_user`

Autorisatie wordt server-side afgedwongen; alleen UI-elementen verbergen is onvoldoende.

## Kern-datamodel
### Multi-tenancy
- `tenants`
- `tenant_memberships`
- `tenant_settings`

### CRM
- `organizations`
- `contacts`
- `leads`
- `activities`
- `tasks`
- `tags`

### Assessments
- `assessment_templates`
- `assessment_template_versions`
- `assessment_categories`
- `assessment_questions`
- `assessment_question_options`
- `assessment_runs`
- `assessment_answers`
- `assessment_scores`
- `assessment_recommendations`
- `assessment_reports`

### Governance
- `consents`
- `audit_events`
- `data_export_requests`
- `data_deletion_requests`

## Scoremodel
`category_score = sum(answer_score * question_weight) / sum(question_weight)`

`total_score = sum(category_score * category_weight) / sum(category_weight)`

Kritieke ontbrekende maatregelen kunnen een risicovlag activeren. `Onbekend` wordt als apart verificatiepunt behandeld. Elke uitslag blijft gekoppeld aan de gebruikte templateversie.

## Release 1 flow
1. Bezoeker beantwoordt de scan zonder persoonsgegevens.
2. Uitslag wordt getoond.
3. Voor PDF/e-mail vult de bezoeker bedrijfsnaam, naam, e-mail, optioneel telefoon en aantal medewerkers in.
4. Toestemming voor rapportlevering en commerciële opvolging worden apart vastgelegd.
5. Server-side validatie, rate limiting en scoreberekening worden uitgevoerd.
6. Scan, antwoorden, score, lead en audit-event worden opgeslagen.
7. Rapport wordt gegenereerd en veilig geleverd.
8. Harkas IT ziet de lead in `/admin/scans` en `/admin/leads`.

## Eerste endpoints
- `submit-assessment`
- `generate-assessment-report`
- `send-assessment-report`
- `update-lead-status`
- `delete-assessment-data`

Alle endpoints gebruiken validatie, idempotency waar nodig, gestructureerde fouten en auditlogging.

## Definition of Done
- migraties en RLS gereviewd
- negatieve autorisatietests aanwezig
- invoervalidatie en foutafhandeling werken
- mobiel en desktop gecontroleerd
- privacy, bewaartermijnen en auditlogging verwerkt
- build, lint en tests slagen
- rollbackpad en beheerinstructies aanwezig
- productie handmatig getest zonder onbevestigde succesclaims

## Eerstvolgende backlog
1. Bestaande Supabase-structuur inventariseren.
2. Migratie maken voor leads, assessment-runs, antwoorden, scores, toestemmingen en audit-events.
3. RLS en beperkte publieke submitfunctie toevoegen.
4. `/it-check` uitbreiden met bedrijfscontext en leadformulier.
5. `/admin/scans` en detailweergave bouwen.
6. Rapport- en e-mailflow toevoegen.
