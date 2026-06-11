"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";

type SettingsClientProps = {
  name: string | null;
  email: string | null;
  googleConnected: boolean;
  gmailScopeConnected: boolean;
};

export function SettingsClient({
  name,
  email,
  googleConnected,
  gmailScopeConnected,
}: SettingsClientProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function deleteAllSubscriptions() {
    if (!window.confirm("Vil du slette alle abonnementene dine?")) {
      return;
    }

    setIsWorking(true);
    setMessage(null);

    try {
      const response = await fetch("/api/subscriptions", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Kunne ikke slette abonnementene.");
      }
      setMessage("Alle abonnementer er slettet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke slette abonnementene.");
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteAccountData() {
    if (
      !window.confirm(
        "Vil du slette kontodata, tilkoblinger og abonnementer? Du blir logget ut etterpå.",
      )
    ) {
      return;
    }

    setIsWorking(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Kunne ikke slette kontodata.");
      }
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke slette kontodata.");
      setIsWorking(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-5 py-8">
      <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">Konto</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Innstillinger</h1>

      {message ? (
        <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold text-[#0D1B2A] ring-1 ring-[#DBE4EE]">
          {message}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
          <h2 className="text-lg font-extrabold tracking-tight">Profil</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-[#5F6F82]">Navn</dt>
              <dd>{name ?? "Ikke satt"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#5F6F82]">E-post</dt>
              <dd>{email ?? "Ikke satt"}</dd>
            </div>
          </dl>
          <button
            className="mt-5 rounded-xl border border-[#DBE4EE] px-5 py-3 text-sm font-bold hover:border-[#C8102E]/50"
            onClick={() => signOut({ callbackUrl: "/login" })}
            type="button"
          >
            Logg ut
          </button>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
          <h2 className="text-lg font-extrabold tracking-tight">Tilkoblinger</h2>
          <div className="mt-4 space-y-2 text-sm text-[#5F6F82]">
            <p>Google/Gmail: {googleConnected ? "Google/Gmail er tilkoblet" : "Ikke koblet til"}</p>
            <p>Gmail read-only: {gmailScopeConnected ? "Aktiv" : "Mangler"}</p>
          </div>
          {!googleConnected ? (
            <button
              className="mt-5 rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white hover:bg-[#a90d27]"
              onClick={() => signIn("google", { callbackUrl: "/settings" })}
              type="button"
            >
              Koble til Google/Gmail
            </button>
          ) : (
            <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Google/Gmail er tilkoblet.
            </div>
          )}
          <p className="mt-4 text-sm leading-6 text-[#5F6F82]">
            Full tilbakekalling hos Google er ikke implementert ennå. Du kan fjerne
            tilgangen i Google-kontoen din under tredjepartstilganger.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
          <h2 className="text-lg font-extrabold tracking-tight">Personvern</h2>
          <p className="mt-3 text-sm leading-6 text-[#5F6F82]">
            Aboslutt lagrer ikke rå e-postinnhold. Bare abonnementene du bekrefter
            lagres i databasen.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-xl border border-[#F3C3CC] px-5 py-3 text-sm font-bold text-[#C8102E] hover:bg-[#F5E6E9] disabled:opacity-50"
              disabled={isWorking}
              onClick={deleteAllSubscriptions}
              type="button"
            >
              Slett alle abonnementer
            </button>
            <button
              className="rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white hover:bg-[#a90d27] disabled:opacity-50"
              disabled={isWorking}
              onClick={deleteAccountData}
              type="button"
            >
              Slett kontodata
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
