

# Admin Gebruikers Aanmaken

## Aanpak

Gebruikers kunnen niet direct via de database worden aangemaakt — ze moeten via de auth API worden geregistreerd. Ik maak een tijdelijke edge function die met de service role key drie admin users aanmaakt en hen de admin rol toekent.

## Stappen

### 1. Tijdelijke Edge Function: `create-admin-users`
- Maakt 3 gebruikers aan via `supabase.auth.admin.createUser()` (met service role key)
- Accounts: `info@harkasit.nl`, `administratie@harkasit.nl`, `iliasharkati@outlook.com`
- Wachtwoord: `Koekjes.2002`
- Email wordt automatisch bevestigd (`email_confirm: true`)
- Na aanmaken: voegt voor elke user een `admin` rol toe in `user_roles`

### 2. Uitvoeren
- Deploy de edge function
- Roep deze eenmalig aan via `curl_edge_functions`
- Controleer resultaat

### 3. Opruimen
- Verwijder de tijdelijke edge function na gebruik

### 4. Verificatie
- Query `user_roles` om te bevestigen dat alle 3 users de admin rol hebben
- Login zou direct moeten werken op `/admin/login`

## Resultaat
Na uitvoering kun je inloggen met alle drie accounts op `/admin/login` en krijg je admin toegang tot het dashboard.

