import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F0F4F8] text-[#0D1B2A]">
      <header className="bg-[#0D1B2A] px-5 py-6 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link className="text-xl font-extrabold tracking-tight" href="/">
            Abo<span className="text-[#C8102E]">slutt</span>
          </Link>
          <Link className="text-sm font-semibold text-white/60 hover:text-white" href="/settings">
            Innstillinger
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">Kom i gang</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-extrabold tracking-tight">
          Start med abonnementene du allerede kjenner
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5F6F82]">
          Du trenger ikke koble til Gmail for å bruke Aboslutt. Legg inn
          abonnementene dine manuelt først, og bruk Gmail-skanning senere hvis du
          vil la Aboslutt foreslå flere kandidater automatisk.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <OnboardingCard
            action="Legg til manuelt"
            description="Registrer navn, pris og neste trekk for abonnementene du vet om."
            href="/dashboard?start=manual"
            recommended
            title="1. Legg inn manuelt"
          />
          <OnboardingCard
            action="Skann Gmail"
            description="Valgfritt: bruk Gmail read-only for å finne kvitteringer og mulige abonnementer."
            href="/import/email"
            title="2. Finn flere automatisk"
          />
          <OnboardingCard
            action="Se hvordan det fungerer"
            description="Gå til oversikten, velg abonnementer og marker dem som avsluttet i Aboslutt."
            href="/dashboard?start=manual"
            title="3. Følg opp"
          />
        </div>
      </section>
    </main>
  );
}

function OnboardingCard({
  title,
  description,
  action,
  href,
  recommended = false,
}: {
  title: string;
  description: string;
  action: string;
  href: string;
  recommended?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ${
        recommended ? "ring-[#C8102E]/40" : "ring-[#DBE4EE]"
      }`}
    >
      {recommended ? (
        <span className="rounded-full bg-[#F5E6E9] px-3 py-1 text-xs font-bold text-[#C8102E]">
          Anbefalt start
        </span>
      ) : null}
      <h2 className="mt-3 text-lg font-extrabold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#5F6F82]">{description}</p>
      <Link
        className={`mt-5 inline-flex rounded-xl px-4 py-3 text-sm font-bold ${
          recommended
            ? "bg-[#C8102E] text-white hover:bg-[#a90d27]"
            : "border border-[#DBE4EE] text-[#0D1B2A] hover:border-[#C8102E]/50"
        }`}
        href={href}
      >
        {action}
      </Link>
    </article>
  );
}
