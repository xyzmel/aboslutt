import type { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { BetaRequestForm } from "@/components/beta/BetaRequestForm";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { authOptions } from "@/lib/auth";

const plans = [
  {
    name: "Gratis",
    price: "0 kr",
    description: "For deg som vil ha kontroll manuelt uten integrasjoner.",
    features: [
      "Opptil 10 manuelle abonnementer",
      "Månedlig og årlig oversikt",
      "Grunnleggende dashboard",
      "Pris, kategori, intervall og neste trekk",
    ],
  },
  {
    name: "Beta",
    price: "Gratis for utvalgte",
    description: "For tidlige brukere som tester automatiske SaaS-funksjoner.",
    features: [
      "Ubegrensede abonnementer",
      "Gmail- og e-postskanning",
      "E-postvarsler før trekk",
      "Månedlig oppsummering",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "Kommer senere",
    description: "Planlagt betalt plan. Betaling er ikke aktivert ennå.",
    features: [
      "Automatisk skanning",
      "Varsler og innsikt",
      "Fremtidige bank/Open Banking-funksjoner",
      "Fremtidig hjelp til oppsigelse",
    ],
  },
];

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user ? { email: session.user.email ?? null } : null;

  return (
    <main className="min-h-screen bg-[#0D1B2A] text-white">
      <PublicHeader />

      <section className="px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">Priser</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Start gratis med manuell oversikt
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/68">
            Manuell abonnementssporing er gratis. Automatisk Gmail-/e-postskanning, varsler og
            oppsummeringer er SaaS-funksjoner for beta og fremtidig premium. Aboslutt tar ikke betalt ennå.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <>
                <PrimaryLink href="/dashboard">Gå til oversikt</PrimaryLink>
                <SecondaryLink href="/import/email">Importer e-post</SecondaryLink>
              </>
            ) : (
              <>
                <PrimaryLink href="/register">Start gratis</PrimaryLink>
                <SecondaryLink href="/login">Logg inn</SecondaryLink>
              </>
            )}
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                className={`rounded-2xl p-6 ring-1 ${
                  plan.highlighted
                    ? "bg-[#C8102E] text-white ring-[#C8102E]"
                    : "bg-white/[0.06] text-white ring-white/10"
                }`}
                key={plan.name}
              >
                <p className="text-sm font-semibold text-white/70">{plan.name}</p>
                <p className="mt-3 text-3xl font-black">{plan.price}</p>
                <p className="mt-3 min-h-16 text-sm leading-6 text-white/70">{plan.description}</p>
                <ul className="mt-6 grid gap-2 text-sm font-semibold">
                  {plan.features.map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F0F4F8] px-5 py-12 text-[#0D1B2A]">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <InfoPanel
            title="Gratis er manuelt"
            text="Alle kan starte med å legge inn abonnementer selv. Du trenger ikke Gmail for å bruke Aboslutt."
          />
          <InfoPanel
            title="Beta er for automasjon"
            text="Gmail-skanning, varsler og månedlig oppsummering er aktivert for beta-, premium- og admin-brukere."
          />
          <InfoPanel
            title="Betaling kommer senere"
            text="Premium er en planlagt betalt plan. Ingen checkout eller betaling er live nå."
          />
        </div>
      </section>

      <section className="bg-white px-5 py-14 text-[#0D1B2A]" id="beta">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">Beta</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Be om beta-tilgang</h2>
            <p className="mt-4 text-sm leading-6 text-[#5F6F82]">
              Vil du teste Gmail-skanning, varsler og månedlig oppsummering? Send en kort forespørsel, så kan
              vi gi beta-tilgang fra admin når det passer.
            </p>
          </div>
          <div className="rounded-2xl bg-[#F0F4F8] p-5 ring-1 ring-[#DBE4EE]">
            <BetaRequestForm />
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="rounded-xl bg-[#C8102E] px-5 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#a90d27]" href={href}>
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="rounded-xl border border-white/15 px-5 py-3.5 text-center text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.06]" href={href}>
      {children}
    </Link>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
      <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#5F6F82]">{text}</p>
    </article>
  );
}
