import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";

const plans = [
  {
    name: "Gratis",
    price: "0 kr",
    description: "Manuell abonnementssporing for deg som vil komme i gang uten integrasjoner.",
    features: ["Opptil 10 abonnementer", "Månedlig og årlig oversikt", "Kategori, intervall og neste trekk", "Grunnleggende dashboard"],
  },
  {
    name: "Beta",
    price: "Gratis for utvalgte",
    description: "Automatiske funksjoner for tidlige brukere mens Aboslutt testes.",
    features: ["Alt i Gratis", "Gmail- og e-postskanning", "E-postvarsler før trekk", "Månedlig oppsummering"],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "Kommer senere",
    description: "Betalt plan er planlagt, men betaling er ikke aktivert ennå.",
    features: ["Ubegrensede abonnementer", "Automatisk skanning", "Varsler og innsikt", "Fremtidige bank/Open Banking-funksjoner"],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0D1B2A] text-white">
      <header className="px-5 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link className="inline-flex items-center gap-3" href="/">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C8102E] text-lg font-black text-white">
              A
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Abo<span className="text-[#C8102E]">slutt</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-semibold">
            <Link className="text-white/60 hover:text-white" href="/#produkt">
              Produkt
            </Link>
            <Link className="text-white/60 hover:text-white" href="/login">
              Logg inn
            </Link>
            <Link className="rounded-xl bg-[#C8102E] px-4 py-2 text-white hover:bg-[#a90d27]" href="/register">
              Opprett konto
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">Priser</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Start gratis med manuell oversikt
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/68">
            Manuell abonnementssporing er gratis. Automatisk skanning, varsler og oppsummeringer testes som
            SaaS-funksjoner i beta. Premium betaling kommer senere.
          </p>

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
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#DBE4EE]">
          <h2 className="text-2xl font-extrabold tracking-tight">Ingen betaling er aktivert ennå</h2>
          <p className="mt-3 text-sm leading-6 text-[#5F6F82]">
            Aboslutt tar ikke betalt i beta nå. Fremtidige premiumfunksjoner annonseres tydelig før betaling blir
            aktuelt.
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
