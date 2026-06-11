"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import type { EmailSubscriptionCandidate } from "@/lib/email-subscription-parser";

const categoryLabels: Record<EmailSubscriptionCandidate["category"], string> = {
  streaming: "Streaming",
  software: "Programvare",
  news: "Nyheter",
  health: "Helse",
};

const intervalLabels: Record<EmailSubscriptionCandidate["billingInterval"], string> = {
  monthly: "Månedlig",
  yearly: "Årlig",
  trial: "Prøveperiode",
  unknown: "Ukjent intervall",
};

export default function EmailImportPage() {
  const { data: session } = useSession();
  const [emailText, setEmailText] = useState("");
  const [candidates, setCandidates] = useState<EmailSubscriptionCandidate[]>([]);
  const [hiddenCandidateKeys, setHiddenCandidateKeys] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isScanningGmail, setIsScanningGmail] = useState(false);
  const [scannedMessages, setScannedMessages] = useState<number | null>(null);
  const [savedCandidateName, setSavedCandidateName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibleCandidates = useMemo(
    () => candidates.filter((candidate) => !hiddenCandidateKeys.includes(getCandidateKey(candidate))),
    [candidates, hiddenCandidateKeys],
  );
  const likelyCandidates = visibleCandidates.filter((candidate) => candidate.confidence >= 0.75);
  const possibleCandidates = visibleCandidates.filter(
    (candidate) => candidate.confidence >= 0.5 && candidate.confidence < 0.75,
  );

  async function parseEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsParsing(true);
    setSavedCandidateName(null);
    setScannedMessages(null);
    setErrorMessage(null);
    setHiddenCandidateKeys([]);

    try {
      const response = await fetch("/api/import/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? result.error ?? "Kunne ikke lese e-posten.");
      }

      setCandidates(result.candidates);

      if (result.candidates.length === 0) {
        setErrorMessage("Fant ingen tydelige abonnementskandidater i teksten.");
      }
    } catch (error) {
      setCandidates([]);
      setErrorMessage(error instanceof Error ? error.message : "Kunne ikke lese e-posten.");
    } finally {
      setIsParsing(false);
    }
  }

  async function scanGmail() {
    setIsScanningGmail(true);
    setSavedCandidateName(null);
    setScannedMessages(null);
    setErrorMessage(null);
    setHiddenCandidateKeys([]);

    try {
      const response = await fetch("/api/import/gmail", {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? result.error ?? "Kunne ikke skanne Gmail.");
      }

      setCandidates(result.candidates);
      setScannedMessages(result.scannedMessages);

      if (result.candidates.length === 0) {
        setErrorMessage("Gmail-skanningen fant ingen tydelige abonnementskandidater.");
      }
    } catch (error) {
      setCandidates([]);
      setErrorMessage(error instanceof Error ? error.message : "Kunne ikke skanne Gmail.");
    } finally {
      setIsScanningGmail(false);
    }
  }

  async function saveCandidate(candidate: EmailSubscriptionCandidate) {
    setErrorMessage(null);
    setSavedCandidateName(null);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...candidate,
          name: candidate.merchantName,
          monthlyCost: candidate.amount,
          status: candidate.billingInterval === "trial" ? "trial" : "active",
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? result.error ?? "Kunne ikke lagre abonnementet.");
      }

      setSavedCandidateName(candidate.merchantName);
      setEmailText("");
      ignoreCandidate(candidate);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Kunne ikke lagre abonnementet.");
    }
  }

  function ignoreCandidate(candidate: EmailSubscriptionCandidate) {
    setHiddenCandidateKeys((currentKeys) => [...currentKeys, getCandidateKey(candidate)]);
  }

  return (
    <main className="min-h-screen bg-[#F0F4F8] text-[#0D1B2A]">
      <header className="bg-[#0D1B2A] px-5 py-6 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link className="text-xl font-extrabold tracking-tight" href="/dashboard">
            Abo<span className="text-[#C8102E]">slutt</span>
          </Link>
          <Link className="text-sm font-semibold text-white/60 hover:text-white" href="/dashboard">
            Til oversikten
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-8">
        <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
          Lokal e-postimport
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Finn abonnementer fra kvitteringer
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5F6F82]">
          Skann Gmail lokalt for private MVP-tester, eller lim inn tekst fra en
          kvittering. Aboslutt lagrer ikke rå e-postinnhold, bare abonnementet
          du eventuelt bekrefter.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Gmail-skanning</h2>
              <p className="mt-2 text-sm leading-6 text-[#5F6F82]">
                Koble til Google og skann inntil 100 sannsynlige kvitteringer fra
                de siste 24 månedene. Kun Gmail read-only brukes.
              </p>
              <p className="mt-1 text-xs font-semibold text-[#5F6F82]">
                {session?.user?.email
                  ? `Innlogget som ${session.user.email}`
                  : "Logg inn med Google for å bruke Gmail-skanning."}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:w-44">
              <button
                className="rounded-xl border border-[#DBE4EE] px-5 py-3 text-sm font-bold text-[#0D1B2A] hover:border-[#C8102E]/50"
                onClick={() => signIn("google", { callbackUrl: "/import/email" })}
                type="button"
              >
                Koble til Gmail
              </button>
              <button
                className="rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white hover:bg-[#a90d27] disabled:opacity-55"
                disabled={isScanningGmail}
                onClick={scanGmail}
                type="button"
              >
                {isScanningGmail ? "Skanner..." : "Skann Gmail"}
              </button>
            </div>
          </div>
          {scannedMessages !== null ? (
            <p className="mt-4 text-sm font-semibold text-[#5F6F82]">
              Skannet {scannedMessages} meldinger.
            </p>
          ) : null}
        </div>

        <form
          className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]"
          onSubmit={parseEmail}
        >
          <label className="text-sm font-semibold text-[#4A5568]" htmlFor="emailText">
            E-posttekst
          </label>
          <textarea
            className="mt-2 min-h-56 w-full rounded-xl border border-[#DBE4EE] px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0D1B2A]"
            id="emailText"
            onChange={(event) => setEmailText(event.target.value)}
            placeholder="Eksempel: Kvittering fra Spotify. Beløp kr 129. Neste trekk 3. jul."
            required
            value={emailText}
          />
          <button
            className="mt-4 rounded-xl bg-[#0D1B2A] px-5 py-3 text-sm font-bold text-white hover:bg-[#15283c] disabled:opacity-55"
            disabled={isParsing}
            type="submit"
          >
            {isParsing ? "Leser tekst..." : "Finn abonnement"}
          </button>
        </form>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-[#F3C3CC] bg-[#F5E6E9] p-4 text-sm font-semibold text-[#C8102E]">
            {errorMessage}
          </div>
        ) : null}

        {savedCandidateName ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {savedCandidateName} ble lagt til i abonnementene dine.
          </div>
        ) : null}

        {likelyCandidates.length > 0 ? (
          <CandidateGroup
            candidates={likelyCandidates}
            onIgnore={ignoreCandidate}
            onSave={saveCandidate}
            title="Sannsynlige abonnementer"
          />
        ) : null}

        {possibleCandidates.length > 0 ? (
          <CandidateGroup
            candidates={possibleCandidates}
            onIgnore={ignoreCandidate}
            onSave={saveCandidate}
            title="Mulige funn"
          />
        ) : null}
      </section>
    </main>
  );
}

function CandidateGroup({
  title,
  candidates,
  onSave,
  onIgnore,
}: {
  title: string;
  candidates: EmailSubscriptionCandidate[];
  onSave: (candidate: EmailSubscriptionCandidate) => void;
  onIgnore: (candidate: EmailSubscriptionCandidate) => void;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      <div className="mt-3 grid gap-4">
        {candidates.map((candidate) => (
          <article
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]"
            key={getCandidateKey(candidate)}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold tracking-tight">
                    {candidate.merchantName}
                  </h3>
                  <span className="rounded-full bg-[#F0F4F8] px-3 py-1 text-xs font-bold text-[#4A5568]">
                    {candidate.confidenceLabel} · {Math.round(candidate.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#5F6F82]">
                  {candidate.amount} {candidate.currency} · {categoryLabels[candidate.category]} ·{" "}
                  {intervalLabels[candidate.billingInterval]}
                </p>
                <p className="mt-1 text-sm text-[#5F6F82]">
                  Neste trekk: {candidate.nextPayment}
                </p>
                <ReasonList items={candidate.reasons} title="Hvorfor" />
                {candidate.warnings.length > 0 ? (
                  <ReasonList items={candidate.warnings} title="Varsler" warning />
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                <button
                  className="rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white hover:bg-[#a90d27]"
                  onClick={() => onSave(candidate)}
                  type="button"
                >
                  Bekreft og lagre
                </button>
                <button
                  className="rounded-xl border border-[#DBE4EE] px-5 py-3 text-sm font-bold text-[#0D1B2A] hover:border-[#C8102E]/50"
                  onClick={() => onIgnore(candidate)}
                  type="button"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReasonList({
  title,
  items,
  warning = false,
}: {
  title: string;
  items: string[];
  warning?: boolean;
}) {
  return (
    <div className="mt-4">
      <p className={`text-xs font-bold uppercase ${warning ? "text-[#C8102E]" : "text-[#4A5568]"}`}>
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[#5F6F82]">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function getCandidateKey(candidate: EmailSubscriptionCandidate) {
  return `${candidate.merchantName}-${candidate.amount}-${candidate.confidence}`;
}
