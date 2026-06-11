import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";

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
          Finn dine første abonnementer
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5F6F82]">
          Aboslutt kan koble til Gmail med read-only tilgang, skanne sannsynlige
          kvitteringer og foreslå abonnementer. Du bekrefter alltid kandidatene
          før de lagres, og rå e-postinnhold lagres ikke.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <OnboardingCard
            action="Koble til Gmail"
            description="Logg inn med Google og gi Gmail read-only tilgang for skanning."
            href="/import/email"
            title="1. Koble til"
          />
          <OnboardingCard
            action="Importer e-post"
            description="Lim inn en kvittering eller videresendt e-post hvis du vil teste manuelt."
            href="/import/email"
            title="2. Skann eller lim inn"
          />
          <OnboardingCard
            action="Legg til manuelt"
            description="Gå til dashboardet etter at du har lagt inn eller importert første abonnement."
            href="/dashboard?start=manual"
            title="3. Bygg oversikten"
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
}: {
  title: string;
  description: string;
  action: string;
  href: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
      <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#5F6F82]">{description}</p>
      <Link
        className="mt-5 inline-flex rounded-xl bg-[#C8102E] px-4 py-3 text-sm font-bold text-white hover:bg-[#a90d27]"
        href={href}
      >
        {action}
      </Link>
    </article>
  );
}
