# Aboslutt MVP

Aboslutt er en Next.js + TypeScript + Tailwind MVP for en norsk abonnementstjeneste. Demoen bruker Prisma med Postgres og markerer oppsigelser i databasen.

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

Kopier `.env.example` til `.env.local` for Next.js og behold `.env` for Prisma CLI hvis du bruker standard Prisma-oppsett lokalt.

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-local-secret
# Bruk lokal Postgres eller en hosted development database fra Neon, Supabase eller Vercel Postgres.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM="Aboslutt <no-reply@aboslutt.local>"

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

## Sider

- `/` landingsside med valg av metode
- `/login` e-post magic-link, Google/Gmail via importflyt og Vipps Login når konfigurert
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

### Lokal Database

Den enkleste lokale utviklingsflyten er å bruke en gratis hosted Postgres-database også lokalt, for eksempel Neon, Supabase eller Vercel Postgres. Da slipper du å installere Postgres på maskinen og bruker samme databasetype som i produksjon.

1. Opprett en development database hos Neon, Supabase eller Vercel Postgres.
2. Kopier Postgres connection string til `.env.local` som `DATABASE_URL`.
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

## Kvalitetssjekk

```bash
npm run lint
npm run build
```

## TODO

- Bekrefte Vipps Login-konfigurasjon, well-known URL-er og scopes mot Vipps MobilePay før produksjon.
- Konfigurere produksjonsklar SMTP eller alternativ e-postleverandør.
- Håndtere Google refresh tokens robust ved utløpt access token.
- Fjerne demo-bruker fallback når ekte auth-beskyttelse er klar.
- Bygge Outlook OAuth senere.
- Bygge BankID/Open Banking og ekte oppsigelsesflyter senere.
