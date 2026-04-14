

# Professionele Factuurmodule Uitbreiding

## Wat is er al aanwezig
- Factuurregels UX met desktop kolommen + mobiele cards
- BTW dropdown (21% + custom)
- Correcte berekeningen
- Schade correctie
- PDF generatie edge function
- Preview/download
- Storage bucket `invoices`

## Wat moet gebouwd worden

### 1. Database migratie
Voeg kolommen toe aan `invoices`:
- `emailed_at` (timestamptz, nullable)
- `emailed_to` (text, nullable)
- `emailed_cc` (text, nullable)

### 2. PDF: betalingsinstructies toevoegen
Update `generate-invoice-pdf/index.ts`:
- Voeg onder de totalen een betalingsinstructie-blok toe
- Gebruik settings voor IBAN en bedrijfsnaam, met fallback (NL22KNAB0413717895 / Harkas Dienstverlening)
- Format vervaldatum in NL formaat
- Gebruik `finalTotal` (total - damage_amount) als bedrag
- Vervaldatum logica:
  - Gebruik `due_date` als die bestaat
  - Anders: `invoice_date + payment_terms` (uit settings)
  - Als `payment_terms` ook leeg: fallback naar 14 dagen

### 3. Edge function: send-invoice-email
Nieuwe edge function die:
- Factuur + klant + settings ophaalt
- PDF signed URL genereert (7 dagen geldig)
- E-mail verstuurt met professionele tekst + betalingsinstructies + download-link
- `emailed_at`, `emailed_to` en `emailed_cc` updatet op de factuur
- CC optie naar administratie@harkasit.nl

Dit is een professionele basisoplossing (fase 1). De functie wordt zo opgezet dat deze later uitbreidbaar is naar echte bijlagen wanneer dat ondersteund wordt. De e-mail bevat een beveiligde download-link naar de factuur-PDF.

### 4. UI: Factuur mailen knop
In `AdminInvoices.tsx`:
- "Factuur mailen" knop per factuur
- Dialog met: klant e-mail (editable), CC checkbox (administratie@harkasit.nl)
- Na verzending: badge "Gemaild" in de factuurlijst

### 5. BTW Overzicht pagina
Nieuwe pagina `src/pages/admin/AdminBtwOverzicht.tsx`:
- Route: `/admin/btw-overzicht`
- Per maand: omzet excl. BTW, BTW bedrag, omzet incl. BTW, aantal facturen
- Filter op jaar
- Alleen facturen waar `deleted_at IS NULL`
- Jaartotaal onderaan

### 6. SnelStart CSV Export
In `AdminInvoices.tsx`:
- Export knop met filters (jaar, maand, status)
- CSV met kolommen: invoice_number, invoice_date, due_date, customer_name, company_name, email, vat_number, kvk_number, status, source_type, subtotal, vat_total, total, **final_total**, damage_amount, emailed_at, notes
- `final_total` = total - damage_amount (berekend tijdens export)
- Bestandsnaam: `invoices-YYYY-MM.csv`
- Client-side CSV generatie

### 7. Sidebar uitbreiden
Update `AdminSidebar.tsx`:
- Voeg "BTW overzicht" toe met Calculator icon

### 8. Routing
Update `App.tsx`:
- Voeg route `/admin/btw-overzicht` toe

## Bestanden die worden aangemaakt/gewijzigd

| Bestand | Actie |
|---------|-------|
| Migratie | emailed_at, emailed_to, emailed_cc kolommen |
| `supabase/functions/generate-invoice-pdf/index.ts` | Betalingsinstructies + vervaldatum fallback |
| `supabase/functions/send-invoice-email/index.ts` | Nieuw: e-mail met signed URL (fase 1, uitbreidbaar) |
| `src/pages/admin/AdminInvoices.tsx` | Mail knop, badge, CSV export met final_total |
| `src/pages/admin/AdminBtwOverzicht.tsx` | Nieuw: BTW overzicht |
| `src/components/admin/AdminSidebar.tsx` | BTW overzicht menu-item |
| `src/App.tsx` | Nieuwe route |

