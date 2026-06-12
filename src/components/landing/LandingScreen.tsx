"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { MethodCard } from "@/components/landing/MethodCard";
import { PublicFooter } from "@/components/public/PublicFooter";

const privacyPoints = [
  "Gmail-skanningen bruker read-only tilgang.",
  "Du ser forslagene før noe lagres.",
  "Rå e-postinnhold lagres ikke.",
];

type LandingScreenProps = {
  user: {
    name: string | null;
    email: string | null;
    isAdmin: boolean;
  } | null;
};

export function LandingScreen({ user }: LandingScreenProps) {
  const userLabel = user?.name ?? user?.email ?? "";

  return (
    <main className="min-h-screen bg-[#0D1B2A] text-white">
      <section className="relative overflow-hidden px-5 py-10 sm:py-14">
        <div className="absolute -right-44 -top-44 h-[34rem] w-[34rem] rounded-full bg-[#C8102E]/15 blur-2xl" />
        <div className="relative z-10 mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-12 flex items-center justify-between gap-4">
              <Link className="inline-flex items-center gap-3" href="/">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C8102E] text-lg font-black text-white">
                  A
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-white">
                  Abo<span className="text-[#C8102E]">slutt</span>
                </span>
              </Link>
              {user ? (
                <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold">
                  <Link className="text-white/60 hover:text-white" href="/dashboard">
                    Oversikt
                  </Link>
                  <Link className="text-white/60 hover:text-white" href="/import/email">
                    Importer e-post
                  </Link>
                  <Link className="text-white/60 hover:text-white" href="/settings">
                    Innstillinger
                  </Link>
                  {user.isAdmin ? (
                    <Link className="text-white/60 hover:text-white" href="/admin">
                      Admin
                    </Link>
                  ) : null}
                  <button
                    className="text-white/60 hover:text-white"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    type="button"
                  >
                    Logg ut
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 text-sm font-semibold">
                  <Link className="text-white/60 hover:text-white" href="/login">
                    Logg inn
                  </Link>
                  <Link className="text-white/60 hover:text-white" href="/register">
                    Opprett konto
                  </Link>
                </div>
              )}
            </div>

            <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
              Abonnementsoversikt i beta
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Få kontroll på abonnementene dine
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
              Aboslutt hjelper deg å finne faste trekk, prøveperioder og tjenester
              du kanskje ikke bruker lenger. Betaen kan skanne Gmail med read-only
              tilgang, foreslå abonnementer og la deg bekrefte hvert funn før det
              lagres i oversikten.
            </p>
            {user ? (
              <p className="mt-4 text-sm font-semibold text-white/70">
                Du er logget inn som {userLabel}.
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <>
                  <Link
                    className="rounded-xl bg-[#C8102E] px-5 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#a90d27]"
                    href="/dashboard"
                  >
                    Gå til oversikt
                  </Link>
                  <Link
                    className="rounded-xl border border-white/15 px-5 py-3.5 text-center text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.06]"
                    href="/import/email"
                  >
                    Importer e-post
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    className="rounded-xl bg-[#C8102E] px-5 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#a90d27]"
                    href="/register"
                  >
                    Start gratis beta
                  </Link>
                  <Link
                    className="rounded-xl border border-white/15 px-5 py-3.5 text-center text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.06]"
                    href="/login"
                  >
                    Logg inn
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Beta</p>
                <p className="text-xs text-white/50">For tidlige brukere</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">
                Gratis
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <MethodCard
                badge="Anbefalt"
                description={
                  user
                    ? "Gå til oversikten og legg inn abonnementer manuelt."
                    : "Opprett konto med e-post og passord."
                }
                href={user ? "/dashboard" : "/register"}
                icon="@"
                recommended
                title="E-post"
              />
              <MethodCard
                description="Koble til Google for Gmail read-only import."
                href={user ? "/import/email" : "/login"}
                icon="G"
                title="Google"
              />
              <MethodCard
                badge="Senere"
                description="Vipps Login kommer snart."
                href="/login"
                icon="V"
                title="Vipps Login"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F0F4F8] px-5 py-12 text-[#0D1B2A]">
        <div className="mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-3">
          {privacyPoints.map((point) => (
            <div key={point} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm font-bold">{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">Priser</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Enkel beta-prising</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Aboslutt er gratis i beta mens tjenesten testes. Betalte planer
              kommer senere når produktet er mer modent.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#C8102E]/40 bg-[#C8102E]/15 p-5">
              <p className="text-sm font-semibold text-white/70">Beta</p>
              <p className="mt-3 text-3xl font-black">Gratis</p>
              <p className="mt-2 text-sm text-white/60">For testing og tidlige brukere.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-sm font-semibold text-white/70">Fremtidig plan</p>
              <p className="mt-3 text-3xl font-black">Kommer senere</p>
              <p className="mt-2 text-sm text-white/60">
                Pris og funksjoner bestemmes etter beta.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
