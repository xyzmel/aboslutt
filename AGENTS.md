# AGENTS.md — Aboslutt MVP

## Project goal

Aboslutt is a Norwegian subscription overview and cancellation-helper MVP.

The product helps users:

* Log in securely
* Connect Gmail with read-only access
* Automatically scan for likely subscriptions
* Review and confirm subscription candidates
* Track active subscriptions
* Add/delete/cancel subscriptions locally
* Later connect Open Banking through an aggregator such as Neonomics

## Current stack

* Next.js App Router
* TypeScript
* Tailwind CSS
* Prisma
* SQLite for local development
* Auth.js/NextAuth
* Prisma adapter
* Google OAuth with Gmail read-only
* Email magic-link provider exists but SMTP may not be configured
* Vipps Login placeholder
* Norwegian UI copy

## Current working features

* Google OAuth works
* Gmail read-only scan works
* Gmail scan can find real subscriptions, for example HBO Max
* Database-backed dashboard works
* Add subscription works
* Delete subscription works
* Cancellation status persists
* Subscription routes are user-scoped

## Current routes

* `/`
* `/login`
* `/dashboard`
* `/import/email`
* `/connect`
* `/connect/bank` may be added later

## Current API

* `GET /api/subscriptions`
* `POST /api/subscriptions`
* `PATCH /api/subscriptions/[id]`
* `DELETE /api/subscriptions/[id]`
* `POST /api/import/email`
* `POST /api/import/gmail`

## Current priority

Improve Gmail subscription detection quality.

The Gmail scan currently works, but it can return noisy or duplicate candidates such as:

* Generic Google Commerce Limited
* Google Play purchases without real product name
* Duplicate HBO Max / Max candidates
* One-time purchases incorrectly treated as subscriptions
* Weak low-confidence candidates

The next task should improve:

* candidate scoring
* merchant normalization
* duplicate merging
* false-positive filtering
* UI explanations
* duplicate prevention before saving

## Important privacy rules

* Use Gmail read-only access only.
* Do not request Gmail modify, delete, or send scopes.
* Do not store raw email bodies by default.
* Store only parsed subscription metadata after user confirmation.
* Do not log access tokens, refresh tokens, ID tokens, raw Gmail messages, or full email bodies.
* If debugging is needed, log only safe metadata such as candidate count or normalized merchant names.

## Gmail detection rules

Candidates should include:

* merchantName
* amount
* currency
* billingInterval
* category
* confidence
* confidenceLabel
* reasons
* warnings
* source

Preferred source value for Gmail candidates:

* `gmail_import`

Confidence labels:

* `høy`
* `middels`
* `lav`

Show candidates grouped as:

* Sannsynlige abonnementer
* Mulige funn

Hide very weak candidates by default.

## Known merchant normalization examples

Normalize:

* HBO Max, Max -> HBO Max
* Netflix -> Netflix
* Spotify -> Spotify
* Adobe -> Adobe
* Apple, Apple Services, iCloud -> iCloud+ or Apple Services
* Google Commerce Limited, Google Play -> try to extract product name
* YouTube -> YouTube Premium
* Microsoft -> Microsoft 365 or Microsoft
* Disney -> Disney+
* Viaplay -> Viaplay
* TV 2 Play -> TV 2 Play
* SATS -> SATS
* Storytel -> Storytel
* Duolingo -> Duolingo Plus

Avoid saving raw names like:

* Google Commerce Limited på Google Play
* Google Commerce Limited
* Google Play

unless no better product name can be found.

## Open Banking direction

The user has contacted Neonomics.

Do not implement real Neonomics yet unless specifically asked.

When Open Banking work starts:

* build provider abstraction first
* do not hardcode credentials
* do not store raw bank transactions by default
* BankID/SCA is handled by the bank/aggregator flow, not directly by Aboslutt

## Important rules

* Keep the app simple and beginner-friendly.
* Use meaningful variable names.
* Use TypeScript.
* Use Tailwind for styling.
* Keep Norwegian UI copy.
* Keep the existing visual style:

  * navy: `#0D1B2A`
  * red: `#C8102E`
  * background: `#F0F4F8`
* Do not add real BankID yet.
* Do not add real Open Banking yet.
* Do not add Outlook OAuth yet.
* Do not add real provider cancellation automation yet.
* Do not hardcode secrets.
* Do not overwrite `.env.local`.
* Do not break existing Gmail login/import.
* Do not break existing dashboard subscription CRUD.

## Environment variables

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-me
DATABASE_URL="file:./dev.db"

EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM="Aboslutt <no-reply@aboslutt.local>"

GOOGLE_CLIENT_ID=replace-me
GOOGLE_CLIENT_SECRET=replace-me

VIPPS_CLIENT_ID=
VIPPS_CLIENT_SECRET=
VIPPS_WELL_KNOWN_URL=
```

## Quality commands

Before finishing a task, run:

```bash
npm run lint
npm run build
```

If Prisma schema changes, also run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

## Done means

Before finishing a task:

* Run lint
* Run build
* Fix errors
* Summarize files changed
* Summarize commands run
* Mention remaining TODOs
