"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getProviders, signIn } from "next-auth/react";

type LoginState = "idle" | "loading" | "success" | "error";
type VippsProviderState = "checking" | "configured" | "missing";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const [vippsProviderState, setVippsProviderState] =
    useState<VippsProviderState>("checking");

  useEffect(() => {
    let isMounted = true;

    async function checkVippsProvider() {
      const providers = await getProviders();

      if (!isMounted) {
        return;
      }

      setVippsProviderState(providers?.vipps ? "configured" : "missing");
    }

    checkVippsProvider().catch(() => {
      if (isMounted) {
        setVippsProviderState("missing");
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginState("loading");

    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setLoginState("error");
      return;
    }

    setLoginState("success");
  }

  const isVippsConfigured = vippsProviderState === "configured";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-5 py-10">
      <section className="w-full max-w-md">
        <Link className="mb-6 inline-flex text-sm font-medium text-white/55 hover:text-white" href="/">
          Tilbake
        </Link>

        <div className="rounded-[1.25rem] bg-white p-7 shadow-2xl shadow-black/20 sm:p-9">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5E6E9] text-lg font-extrabold text-[#C8102E]">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">Logg inn</h1>
          <p className="mt-2 text-sm leading-6 text-[#5F6F82]">
            Få en engangslenke på e-post, eller bruk Vipps når ekte nøkler er
            konfigurert.
          </p>

          <form className="mt-7" onSubmit={sendMagicLink}>
            <label className="text-sm font-semibold text-[#4A5568]" htmlFor="email">
              E-post
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-[#DBE4EE] px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0D1B2A]"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="navn@eksempel.no"
              required
              type="email"
              value={email}
            />
            <button
              className="mt-4 w-full rounded-xl bg-[#0D1B2A] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#15283c] disabled:opacity-55"
              disabled={loginState === "loading"}
              type="submit"
            >
              {loginState === "loading" ? "Sender lenke..." : "Send innloggingslenke"}
            </button>
          </form>

          {loginState === "success" ? (
            <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Sjekk e-posten din. Vi har sendt en innloggingslenke hvis SMTP er
              konfigurert riktig.
            </p>
          ) : null}
          {loginState === "error" ? (
            <p className="mt-3 rounded-xl bg-[#F5E6E9] px-4 py-3 text-sm font-semibold text-[#C8102E]">
              Kunne ikke sende lenken. Sjekk SMTP-verdiene i{" "}
              <code className="rounded bg-white/60 px-1 py-0.5">.env.local</code>.
            </p>
          ) : null}

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            eller
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            className="w-full rounded-xl bg-[#C8102E] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#a90d27] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            disabled={!isVippsConfigured}
            onClick={() => signIn("vipps", { callbackUrl: "/dashboard" })}
            type="button"
          >
            {isVippsConfigured ? "Fortsett med Vipps" : "Vipps Login er ikke konfigurert"}
          </button>
          <p className="mt-3 text-xs leading-5 text-[#5F6F82]">
            {vippsProviderState === "checking"
              ? "Sjekker Vipps-konfigurasjon..."
              : isVippsConfigured
                ? "Vipps Login er aktivert med verdiene fra miljøvariablene."
                : "Legg inn VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET og VIPPS_WELL_KNOWN_URL i .env.local før Vipps Login testes."}
          </p>

          <Link
            className="mt-5 block text-center text-sm font-semibold text-[#0D1B2A] hover:text-[#C8102E]"
            href="/dashboard"
          >
            Se demo uten innlogging
          </Link>
        </div>
      </section>
    </main>
  );
}
