# Aboslutt MVP

Aboslutt er en Next.js + TypeScript + Tailwind MVP for en norsk abonnementstjeneste. Demoen bruker Prisma med Postgres og markerer oppsigelser i databasen.

## Beta Positioning

Aboslutt er først og fremst en manuell abonnementoversikt: alle brukere kan legge inn eksisterende abonnementer selv uten å koble til Gmail. Automatisk Gmail-/e-postskanning er en valgfri SaaS-funksjon som kan foreslå kandidater basert på kvitteringer. Brukeren må alltid bekrefte kandidatene før de lagres, og rå e-postinnhold lagres ikke.

Vipps Login er planlagt, men skal vises som `Vipps Login kommer snart` med mindre Vipps-miljøvariablene er konfigurert.

## Kom I Gang

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Miljøvariabler

Kopier `.env.example` til `.env.local` for Next.js. Prisma CLI leser `.env` når du kjører lokale Prisma-kommandoer, så `.env` må også ha en gyldig Postgres `DATABASE_URL` når du kjører migrering eller seed fra terminalen.

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-local-secret
# Bruk lokal Postgres eller en hosted development database fra Neon, Supabase eller Vercel Postgres.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

EMAIL_SERVER_HOST=smtp.resend.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=resend
EMAIL_SERVER_PASSWORD=
EMAIL_FROM="Aboslutt <no-reply@aboslutt.no>"
BETA_SIGNUPS_ENABLED=true
BETA_ALLOWED_EMAILS=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GMAIL_IMPORT_DEBUG=false

# Vipps Login. Bekreft nøyaktige URL-er i Vipps MobilePay developer portal.
# Test eksempel:
# VIPPS_WELL_KNOWN_URL=https://apitest.vipps.no/access-management-1.0/access/.well-known/openid-configuration
# Produksjon eksempel:
# VIPPS_WELL_KNOWN_URL=https://api.vipps.no/access-management-1.0/access/.well-known/openid-configuration
VIPPS_CLIENT_ID=
VIPPS_CLIENT_SECRET=
VIPPS_WELL_KNOWN_URL=
```

Ingen ekte hemmeligheter skal committes. `.env.local` skal ikke overskrives av oppsettet.

Viktig: Etter bytte til `provider = "postgresql"` i `prisma/schema.prisma` skal du ikke bruke `DATABASE_URL="file:./dev.db"`. Bruk en Postgres URL som starter med `postgresql://` eller `postgres://`.

## Sider

- `/` landingsside med valg av metode
- `/login` e-post magic-link, Google/Gmail via importflyt og Vipps Login når konfigurert
- `/register` opprett konto med e-post magic-link
- `/dashboard` databasebasert abonnementoversikt med legg til, slett og vedvarende avslutning
- `/import/email` lokal import fra Gmail-skanning eller innlimt kvitteringstekst
- `/connect` placeholder for fremtidige koblinger

## Auth

Auth-konfigurasjonen ligger i `src/lib/auth.ts`, og route handleren ligger i `src/app/api/auth/[...nextauth]/route.ts`.

Aktive providers:

- Email magic-link via SMTP
- Google OAuth med Gmail read-only for lokale/private MVP-tester
- Vipps Login via OIDC/OAuth når Vipps-miljøvariablene er satt

Vipps-provideren registreres bare når `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET` og `VIPPS_WELL_KNOWN_URL` finnes. Hvis de mangler, krasjer ikke appen, og Vipps-knappen på `/login` vises som deaktivert.

## Beta Registration

`/register` bruker nå e-post og passord for beta-registrering. Passord lagres kun som bcrypt-hash i `User.passwordHash`. Brukeren må bekrefte e-postadressen via `/verify-email?token=...` før innlogging med passord fungerer.

Google-login fungerer fortsatt, og Vipps vises som `Vipps Login kommer snart` med mindre Vipps-miljøvariablene er konfigurert.

Tidligere magic-link e-postprovider ligger fortsatt i auth-oppsettet når SMTP er konfigurert, men beta-flyten prioriterer e-post/passord med verifisering.

Beta-registrering styres med:

```bash
BETA_SIGNUPS_ENABLED=true
BETA_ALLOWED_EMAILS=
```

Hvis `BETA_SIGNUPS_ENABLED=false`, kan nye brukere ikke registrere seg, men eksisterende brukere kan fortsatt logge inn. Hvis `BETA_ALLOWED_EMAILS` er satt, må e-postadressen være i den kommaseparerte listen for å få magic-link:

```bash
BETA_ALLOWED_EMAILS=person@example.com,annen@example.com
```

## SMTP Setup

For Resend SMTP i produksjon:

```bash
EMAIL_SERVER_HOST=smtp.resend.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=resend
EMAIL_SERVER_PASSWORD=din-resend-api-key
EMAIL_FROM="Aboslutt <no-reply@aboslutt.no>"
```

Produksjonssending krever ofte at domenet er verifisert hos SMTP-leverandøren. For Resend betyr det normalt DNS-verifisering av `aboslutt.no`.

Brevo kan brukes som alternativ SMTP-leverandør. Da bruker du SMTP-verdiene fra Brevo dashboardet i de samme `EMAIL_SERVER_*` miljøvariablene.

Etter endring av SMTP- eller beta-env vars i Vercel må prosjektet redeployes.

## Vipps Login Setup

Vipps Login bruker well-known discovery fra Vipps MobilePay og scopes:

```text
openid name email phoneNumber
```

Legg inn callback/redirect URI hos Vipps:

```text
http://localhost:3000/api/auth/callback/vipps
```

Legg deretter inn verdiene i `.env.local`:

```bash
VIPPS_CLIENT_ID=...
VIPPS_CLIENT_SECRET=...
VIPPS_WELL_KNOWN_URL=...
```

Eksempler på well-known URL-er som må bekreftes i Vipps MobilePay developer portal før bruk:

```text
Test: https://apitest.vipps.no/access-management-1.0/access/.well-known/openid-configuration
Produksjon: https://api.vipps.no/access-management-1.0/access/.well-known/openid-configuration
```

Ikke commit Vipps-nøkler. Bruk `.env.local` lokalt og sikre secret-håndtering i hostingmiljøet.

## Google Cloud Setup

For lokal Gmail-skanning:

1. Opprett eller velg et prosjekt i Google Cloud Console.
2. Aktiver Gmail API.
3. Konfigurer OAuth consent screen. Bruk "External" for privat testing hvis kontoen krever det.
4. Legg til deg selv under test users.
5. Opprett OAuth Client ID av typen Web application.
6. Legg inn lokal redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

7. Kopier verdiene til `.env.local`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Gmail read-only er en Google restricted scope. For privat lokal MVP-testing kan du bruke test users på OAuth consent screen. Produksjonsbruk krever normalt ekstra verifisering og en sikkerhetsvurdering fra Google.

## Google OAuth Troubleshooting

Hvis innlogging feiler med `Unknown argument refresh_token_expires_in`, mangler Prisma `Account`-modellen feltet Google sender tilbake. Kjør:

```bash
npm run prisma:migrate
npm run prisma:generate
```

Hvis du får `OAuthAccountNotLinked` etter et tidligere feilet Google-forsøk, kan databasen ha en delvis bruker eller konto fra forsøket. For lokal utviklingsdatabase er raskeste opprydding:

```bash
npm run prisma:reset
```

Dette sletter og reoppretter databasen som `DATABASE_URL` peker på, kjører migrasjoner og seed på nytt. Ikke bruk reset mot en database med data du vil beholde.

Merk: Den lokale SQLite-migrasjonshistorikken ble ryddet i MVP-fasen fordi gamle testmigrasjoner hadde feil rekkefølge for en fersk database. Prosjektet bruker nå Postgres-migrasjoner for å kunne deployes til Vercel med en produksjonsklar database.

## Gmail Scan Troubleshooting

`POST /api/import/gmail` returnerer nå konkrete feilkoder i JSON, for eksempel `NO_SESSION`, `GOOGLE_NOT_CONNECTED`, `GMAIL_SCOPE_MISSING`, `GMAIL_TOKEN_EXPIRED`, `GMAIL_RATE_LIMITED`, `GMAIL_UPSTREAM_ERROR` og `GMAIL_INTERNAL_ERROR`.

Hvis du ser en gammel generisk 502-feil, prøv først å starte dev-serveren på nytt og logge inn med Google igjen.

Vanlige årsaker:

- Manglende Gmail scope: Google-kontoen ble koblet til før Gmail read-only scope var lagt til. Koble til Google på nytt.
- Utløpt access token: Appen prøver å fornye token hvis `refresh_token` finnes. Hvis fornying feiler, koble til Google på nytt.
- Manglende refresh token: Google sender ofte bare refresh token første gang. Revoke lokal app-tilgang i Google-kontoen og koble til på nytt.
- Rate limit: Vent litt og prøv igjen.

For å revoke/reconnect lokalt:

1. Gå til Google Account > Security > Third-party access.
2. Fjern tilgangen for den lokale Aboslutt/OAuth-testappen.
3. Kjør eventuelt `npm run prisma:reset` hvis lokale testkontoer er i en rar tilstand.
4. Start `npm run dev` og koble til Gmail på nytt fra `/import/email`.

Sett `GMAIL_IMPORT_DEBUG=true` i `.env.local` for trygge debuglogger. Debuglogger viser steg, statuskoder og tellinger, men skal aldri logge access tokens, refresh tokens, ID tokens eller rå e-postinnhold.

## User Ownership

Abonnementer er koblet til `User` i Prisma. Auth.js/NextAuth bruker Prisma-adapteren med modellene `User`, `Account`, `Session` og `VerificationToken`.

I utvikling kan appen falle tilbake til demo-brukeren `demo@aboslutt.local` når ingen session finnes. Dette gjør at `/dashboard` fortsatt fungerer uten ekte Vipps-, Google- eller SMTP-oppsett. Fallbacken er midlertidig og markert med TODO i `src/lib/current-user.ts`.

I produksjon brukes ikke demo-bruker fallback. Uinnloggede brukere sendes til `/login`, og API-ruter for abonnementer returnerer `401`.

## Email Og Gmail Import

`/import/email` har to flyter:

- Lim inn tekst fra en kvittering eller videresendt e-post.
- Koble til Gmail og skann inntil 100 sannsynlige kvitteringer fra de siste 24 månedene.

`POST /api/import/email` parser innlimt tekst med `src/lib/email-subscription-parser.ts`.

`POST /api/import/gmail` bruker den innloggede brukerens Google `access_token`, søker i Gmail med read-only scope, henter snippets/tekst fra maks 100 meldinger og parser abonnementskandidater.

Gmail-deteksjon bruker heuristisk scoring. Den gir pluss for kjente abonnementsleverandører, abonnement/fornyelse/månedlig/prøveperiode, beløp, neste betalingsdato og kvitteringsspråk. Den trekker ned for refusjon, kansellering, gratis, frakt/levering, sikkerhetsvarsler, verifiseringskoder og engangskjøp.

Falske positive kan fortsatt skje. Derfor må brukeren alltid bekrefte kandidaten før den lagres. Kandidater normaliseres og dedupliseres før visning, for eksempel `Max` og `HBO Max`, og generiske Google Play-avsendere forsøkes erstattet med faktisk produktnavn.

Rå e-posttekst lagres ikke. Bare kandidaten brukeren bekrefter blir lagret via eksisterende `POST /api/subscriptions`, med importkilde og confidence-score. Google Gmail read-only er fortsatt en restricted scope og krever Google-verifisering før produksjonsbruk.

## API

- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `PATCH /api/subscriptions/[id]`
- `DELETE /api/subscriptions/[id]`
- `POST /api/import/email`
- `POST /api/import/gmail`

Subscription-rutene finner gjeldende app-bruker og filtrerer på `userId`, slik at en bruker ikke kan lese, endre eller slette abonnementene til en annen bruker.

## Prisma

Prisma-skjemaet bruker `provider = "postgresql"` og leser tilkoblingen fra `DATABASE_URL`.

### Prisma Env Feilsøking

Next.js leser `.env.local` når appen kjøres lokalt. Prisma CLI leser `.env` når du kjører kommandoer som `npm run prisma:deploy`, `npm run prisma:seed`, `npm run prisma:migrate` og `npm run prisma:reset` fra terminalen.

Hvis `.env` fortsatt inneholder:

```bash
DATABASE_URL="file:./dev.db"
```

vil Prisma feile fordi skjemaet nå bruker Postgres. Bytt verdien i `.env` manuelt til en Postgres connection string:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

Slik kopierer du URL-en trygt:

1. Gå til Vercel, Neon eller Supabase dashboard.
2. Åpne databaseprosjektet og finn connection string for Postgres.
3. Kopier verdien inn i lokal `.env` som `DATABASE_URL`.
4. Kopier samme verdi inn i `.env.local` hvis Next.js lokalt skal bruke samme database.
5. Ikke commit `.env` eller `.env.local`.

`prisma:deploy` og `prisma:seed` kjører `scripts/check-database-url.mjs` først. Scriptet stopper kommandoen hvis `DATABASE_URL` ikke starter med `postgresql://` eller `postgres://`.

Hvis Postgres feiler på første migrasjon med `syntax error at or near "\u{feff}"`, ligger det en UTF-8 BOM i starten av en `migration.sql`-fil. Fjern BOM og lagre `migration.sql` som UTF-8 uten BOM. Hvis Prisma allerede rakk å registrere migrasjonen som feilet, marker den som rullet tilbake før du prøver igjen:

```bash
npx prisma migrate resolve --rolled-back 20260610203000_init
npm run prisma:deploy
npm run prisma:seed
```

### Lokal Database

Den enkleste lokale utviklingsflyten er å bruke en gratis hosted Postgres-database også lokalt, for eksempel Neon, Supabase eller Vercel Postgres. Da slipper du å installere Postgres på maskinen og bruker samme databasetype som i produksjon.

1. Opprett en development database hos Neon, Supabase eller Vercel Postgres.
2. Kopier Postgres connection string til `.env` og `.env.local` som `DATABASE_URL`.
3. Kjør:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

For en helt lokal Postgres-installasjon kan `DATABASE_URL` se slik ut:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aboslutt_dev?schema=public"
```

`npm run prisma:reset` kan brukes i lokal utvikling når du vil slette og reseede utviklingsdatabasen:

```bash
npm run prisma:reset
```

Ikke bruk `prisma:reset` mot produksjon eller data du vil beholde.

### Produksjon Med Postgres

Bruk en managed Postgres-database i produksjon. Gode alternativer for Vercel-demo er:

- Neon
- Supabase
- Vercel Postgres

Legg produksjons-URL-en inn som `DATABASE_URL` i Vercel Project Settings. Ikke hardkod connection string i repoet.

Kjør produksjonsmigrasjoner med:

```bash
npm run prisma:deploy
npm run prisma:seed
```

På Vercel kan dette kjøres som en separat deploy-/release-kommando, eller manuelt fra en trygg terminal med produksjonsmiljøvariabler lastet inn.

## Produksjonsdeploy

Anbefalt enkel demo-deploy er Vercel:

1. Koble GitHub-repoet til Vercel.
2. Legg inn alle nødvendige miljøvariabler i Vercel Project Settings.
3. Sett `NEXTAUTH_URL` til den offentlige domenen, for eksempel `https://aboslutt.no`.
4. Legg til custom domain i Vercel når domenet er klart.
5. Kjør `npm run prisma:deploy` mot produksjonsdatabasen før offentlig bruk.

Auth callback/redirect URI-er må matche domenet:

```text
Google: https://ditt-domene.no/api/auth/callback/google
Vipps: https://ditt-domene.no/api/auth/callback/vipps
```

For lokal testing er callbackene:

```text
Google: http://localhost:3000/api/auth/callback/google
Vipps: http://localhost:3000/api/auth/callback/vipps
```

SQLite var kun for tidlig lokal MVP-testing. Hovedskjemaet bruker nå Postgres. Bruk Neon, Supabase, Vercel Postgres eller en annen produksjonsklar Postgres-database før offentlig lansering, og oppdater `DATABASE_URL` i Vercel. Ikke legg inn hemmeligheter i repoet.

## Produksjonssjekkliste

- Legg inn Vercel env vars: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, Google OAuth-vars, SMTP-vars, `BETA_SIGNUPS_ENABLED`, `BETA_ALLOWED_EMAILS` og Vipps-vars hvis Vipps er aktivert.
- Sett `NEXTAUTH_URL` til kanonisk domene, for eksempel `https://www.aboslutt.no`.
- Legg inn Google redirect URI: `https://www.aboslutt.no/api/auth/callback/google`.
- Legg inn Vipps redirect URI: `https://www.aboslutt.no/api/auth/callback/vipps`.
- Kjør Neon/Postgres-migrasjoner med `npm run prisma:deploy`.
- Kjør seed bare hvis du ønsker utviklings-/startdata: `npm run prisma:seed`.
- Kontroller at demo fallback ikke vises i produksjon. Den er kun aktiv når `NODE_ENV !== "production"`.
- Test `/api/health` og sjekk at `databaseConnected` er `true`.
- Sjekk at `/api/health` viser `smtpConfigured: true` før e-postregistrering annonseres.
- Redeploy Vercel etter endringer i env vars.

## Produksjonsfeilsøking

- `401` fra `/api/subscriptions` betyr at brukeren ikke er innlogget eller at session mangler.
- `redirect_uri_mismatch` fra Google betyr at callback URL i Google Cloud ikke matcher domenet. Legg inn `https://www.aboslutt.no/api/auth/callback/google` og eventuelt `https://aboslutt.no/api/auth/callback/google`.
- Tom database betyr vanligvis at migrasjoner eller seed ikke er kjørt mot riktig Postgres `DATABASE_URL`.
- Hvis `/api/health` viser `databaseConnected: false`, kontroller `DATABASE_URL`, Neon-tilgang og at migrasjoner er kjørt.
- `EmailSignin` betyr ofte at SMTP-verdier mangler eller at SMTP-leverandøren avviser sendingen.
- `ECONNREFUSED ::1:587` betyr vanligvis at appen prøver å bruke lokal SMTP på port 587. Sett riktige `EMAIL_SERVER_*` verdier i Vercel og redeploy.
- Hvis UI sier `E-postinnlogging er ikke konfigurert enda`, mangler en eller flere SMTP-env vars.
- Hvis magic link ikke mottas, sjekk spam/promotions, Resend/Brevo sending logs, domenestatus og at `EMAIL_FROM` bruker et verifisert domene.

## Kvalitetssjekk

```bash
npm run lint
npm run build
```

## TODO

- Bekrefte Vipps Login-konfigurasjon, well-known URL-er og scopes mot Vipps MobilePay før produksjon.
- Konfigurere produksjonsklar SMTP eller alternativ e-postleverandør.
- Håndtere Google refresh tokens robust ved utløpt access token.
- Fjerne lokal demo-bruker fallback helt når utviklingsflyten ikke trenger den lenger.
- Bygge Outlook OAuth senere.
- Bygge Open Banking og ekte oppsigelsesflyter senere.
