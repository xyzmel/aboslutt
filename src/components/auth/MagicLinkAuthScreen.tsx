"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getProviders, signIn } from "next-auth/react";

type AuthMode = "login" | "register";
type RequestState = "idle" | "loading" | "success" | "error";

type MagicLinkAuthScreenProps = {
  mode: AuthMode;
};

export function MagicLinkAuthScreen({ mode }: MagicLinkAuthScreenProps) {
  const [email, setEmail] = useState("");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [betaSignupsEnabled, setBetaSignupsEnabled] = useState(true);
  const [providers, setProviders] = useState({ google: false, vipps: false, email: false });

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      const [providerList, emailStatusResponse] = await Promise.all([
        getProviders(),
        fetch("/api/auth/email-status", { cache: "no-store" }),
      ]);
      const emailStatus = (await emailStatusResponse.json()) as {
        smtpConfigured: boolean;
        betaSignupsEnabled: boolean;
      };

      if (!isMounted) {
        return;
      }

      setProviders({
        google: Boolean(providerList?.google),
        vipps: Boolean(providerList?.vipps),
        email: Boolean(providerList?.email),
      });
      setSmtpConfigured(emailStatus.smtpConfigured);
      setBetaSignupsEnabled(emailStatus.betaSignupsEnabled);
    }

    loadStatus().catch(() => {
      if (isMounted) {
        setSmtpConfigured(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState("loading");
    setMessage(null);

    try {
      const preflightResponse = await fetch("/api/auth/email-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mode }),
      });
      const preflight = (await preflightResponse.json()) as {
        allowed: boolean;
        message?: string | null;
      };

      if (!preflightResponse.ok || !preflight.allowed) {
        throw new Error(preflight.message ?? "E-postinnlogging er ikke tilgjengelig.");
      }

      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        throw new Error("Kunne ikke sende innloggingslenken akkurat nå.");
      }

      setRequestState("success");
      setMessage("Sjekk e-posten din for innloggingslenken.");
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Kunne ikke sende innloggingslenken.");
    }
  }

  const isRegister = mode === "register";
  const title = isRegister ? "Opprett konto" : "Logg inn";
  const canUseEmail = smtpConfigured && providers.email && (!isRegister || betaSignupsEnabled);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-5 py-10">
      <section className="w-full max-w-md">
        <Link className="mb-6 inline-flex text-sm font-medium text-white/55 hover:text-white" href="/">
          Tilbake
        </Link>

        <div className="rounded-[1.25rem] bg-white p-7 shadow-2xl shadow-black/20 sm:p-9">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5E6E9] text-lg font-extrabold text-[#C8102E]">
              A
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#C8102E]">Aboslutt</p>
              <h1 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">{title}</h1>
            </div>
          </div>
          <p className="text-sm leading-6 text-[#5F6F82]">
            {isRegister
              ? "Opprett konto med en sikker e-postlenke. Ingen passord trengs."
              : "Velkommen tilbake. Velg innloggingsmetoden som passer best."}
          </p>

          <div className="mt-6 grid gap-3">
            <button
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#DBE4EE] bg-white px-5 py-3.5 text-sm font-bold text-[#0D1B2A] transition hover:border-[#C8102E]/50 disabled:opacity-55"
              disabled={!providers.google}
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              type="button"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#DBE4EE] text-sm font-black">
                G
              </span>
              Fortsett med Google
            </button>

            <button
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#F3C3CC] bg-[#C8102E] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#a90d27] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"
              disabled={!providers.vipps}
              onClick={() => signIn("vipps", { callbackUrl: "/dashboard" })}
              type="button"
            >
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-black">Vipps</span>
              {providers.vipps ? "Fortsett med Vipps" : "Vipps kommer snart"}
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            e-post
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {!smtpConfigured ? (
            <p className="mb-4 rounded-xl bg-[#F5E6E9] px-4 py-3 text-sm font-semibold text-[#C8102E]">
              E-postinnlogging er ikke konfigurert enda.
            </p>
          ) : null}

          {isRegister && !betaSignupsEnabled ? (
            <p className="mb-4 rounded-xl bg-[#F5E6E9] px-4 py-3 text-sm font-semibold text-[#C8102E]">
              Beta-registrering er midlertidig stengt.
            </p>
          ) : null}

          <form onSubmit={requestMagicLink}>
            <label className="text-sm font-semibold text-[#4A5568]" htmlFor="email">
              E-post
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-[#DBE4EE] px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0D1B2A] disabled:bg-slate-100"
              disabled={!canUseEmail}
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="navn@eksempel.no"
              required
              type="email"
              value={email}
            />
            <button
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-[#0D1B2A] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#15283c] disabled:opacity-55"
              disabled={!canUseEmail || requestState === "loading"}
              type="submit"
            >
              <span aria-hidden="true">@</span>
              {requestState === "loading" ? "Sender lenke..." : "Fortsett med e-post"}
            </button>
          </form>

          {message ? (
            <p
              className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                requestState === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#F5E6E9] text-[#C8102E]"
              }`}
            >
              {message}
            </p>
          ) : null}

          <Link
            className="mt-5 block text-center text-sm font-semibold text-[#0D1B2A] hover:text-[#C8102E]"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Har du allerede konto? Logg inn" : "Ny bruker? Opprett konto"}
          </Link>
        </div>
      </section>
    </main>
  );
}
