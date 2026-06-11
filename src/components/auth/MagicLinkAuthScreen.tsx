"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getProviders, signIn } from "next-auth/react";

type AuthMode = "login" | "register";
type RequestState = "idle" | "loading" | "success" | "error";

type MagicLinkAuthScreenProps = {
  mode: AuthMode;
};

const defaultForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function MagicLinkAuthScreen({ mode }: MagicLinkAuthScreenProps) {
  const [form, setForm] = useState(defaultForm);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const errorCode = new URLSearchParams(window.location.search).get("error");
    return errorCode ? getAuthErrorMessage(errorCode) : null;
  });
  const [providers, setProviders] = useState({ google: false, vipps: false });
  const callbackUrl = getSafeCallbackUrl();

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      const providerList = await getProviders();
      if (!isMounted) {
        return;
      }
      setProviders({
        google: Boolean(providerList?.google),
        vipps: Boolean(providerList?.vipps),
      });
    }

    loadProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState("loading");
    setMessage(null);
    setAuthErrorMessage(null);

    try {
      if (mode === "register") {
        await registerUser();
        return;
      }

      await loginUser();
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Noe gikk galt. Prøv igjen.");
    }
  }

  async function registerUser() {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(result.error ?? result.message ?? "Kunne ikke opprette konto.");
    }

    setRequestState("success");
    setMessage(result.message ?? "Kontoen er opprettet. Sjekk e-posten din.");
    setForm(defaultForm);
  }

  async function loginUser() {
    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      throw new Error(getAuthErrorMessage(result.error));
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  function updateField(field: keyof typeof defaultForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const isRegister = mode === "register";
  const title = isRegister ? "Opprett konto" : "Logg inn";
  const submitText = isRegister ? "Opprett konto" : "Logg inn";

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
              ? "Opprett konto med e-post og passord. Du må bekrefte e-posten før innlogging."
              : "Logg inn med e-post og passord, eller fortsett med Google."}
          </p>

          {authErrorMessage ? (
            <p className="mt-4 rounded-xl bg-[#F5E6E9] px-4 py-3 text-sm font-semibold text-[#C8102E]">
              {authErrorMessage}
            </p>
          ) : null}

          <form className="mt-6 grid gap-4" onSubmit={submitAuth}>
            {isRegister ? (
              <TextInput
                label="Navn"
                onChange={(value) => updateField("name", value)}
                placeholder="Navnet ditt"
                value={form.name}
              />
            ) : null}
            <TextInput
              label="E-post"
              onChange={(value) => updateField("email", value)}
              placeholder="navn@eksempel.no"
              type="email"
              value={form.email}
            />
            <TextInput
              label="Passord"
              minLength={8}
              onChange={(value) => updateField("password", value)}
              placeholder="Minst 8 tegn"
              type="password"
              value={form.password}
            />
            {isRegister ? (
              <TextInput
                label="Bekreft passord"
                minLength={8}
                onChange={(value) => updateField("confirmPassword", value)}
                placeholder="Gjenta passord"
                type="password"
                value={form.confirmPassword}
              />
            ) : null}
            <button
              className="rounded-xl bg-[#0D1B2A] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#15283c] disabled:opacity-55"
              disabled={requestState === "loading"}
              type="submit"
            >
              {requestState === "loading"
                ? "Jobber..."
                : isRegister
                  ? submitText
                  : "Fortsett med e-post"}
            </button>
            {!isRegister ? (
              <Link
                className="text-center text-sm font-semibold text-[#5F6F82] hover:text-[#C8102E]"
                href="/forgot-password"
              >
                Glemt passord?
              </Link>
            ) : null}
          </form>

          {message ? (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                requestState === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#F5E6E9] text-[#C8102E]"
              }`}
            >
              {message}
            </p>
          ) : null}

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            eller
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-3">
            <button
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#DBE4EE] bg-white px-5 py-3.5 text-sm font-bold text-[#0D1B2A] transition hover:border-[#C8102E]/50 disabled:opacity-55"
              disabled={!providers.google}
              onClick={() => signIn("google", { callbackUrl })}
              type="button"
            >
              <GoogleIcon />
              Fortsett med Google
            </button>
            <button
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#F3C3CC] bg-[#C8102E] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#a90d27] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"
              disabled={!providers.vipps}
              onClick={() => signIn("vipps", { callbackUrl })}
              type="button"
            >
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-black">Vipps</span>
              {providers.vipps ? "Fortsett med Vipps" : "Vipps Login kommer snart"}
            </button>
          </div>

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

async function safeReadJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return {} as { ok?: boolean; message?: string; error?: string };
  }

  try {
    return JSON.parse(text) as { ok?: boolean; message?: string; error?: string };
  } catch {
    return {
      ok: false,
      error: "Serveren svarte uventet. Prøv igjen om litt.",
    };
  }
}

function getAuthErrorMessage(errorCode: string) {
  if (errorCode === "OAuthAccountNotLinked") {
    return "Denne e-posten er allerede brukt med en annen innloggingsmetode. Logg inn med e-post/passord først, og koble Google fra innstillinger.";
  }

  if (errorCode === "EMAIL_NOT_VERIFIED") {
    return "E-posten din er ikke bekreftet ennå. Sjekk e-posten din før du logger inn.";
  }

  if (errorCode === "OAuthAccountNotLinked") {
    return "Denne e-posten er allerede brukt med en annen innloggingsmetode. Prøv Google eller e-post/passord.";
  }

  if (errorCode === "AccessDenied") {
    return "Innloggingen ble avvist. Prøv igjen eller bruk en annen innloggingsmetode.";
  }

  return "Kunne ikke logge inn. Sjekk e-post, passord og at kontoen er verifisert.";
}

function getSafeCallbackUrl() {
  if (typeof window === "undefined") {
    return "/dashboard";
  }

  const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");

  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/dashboard";
  }

  return callbackUrl;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.2Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-0.9 6.6-2.5l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  type = "text",
  minLength,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "email" | "password";
  minLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-semibold text-[#4A5568]">
      {label}
      <input
        className="mt-2 w-full rounded-xl border border-[#DBE4EE] px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0D1B2A]"
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
