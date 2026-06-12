"use client";

import { useState } from "react";

type JobResult = {
  ok?: boolean;
  dryRun?: boolean;
  usersChecked?: number;
  emailsSent?: number;
  remindersCreated?: number;
  message?: string;
  error?: string;
};

export function AdminJobsClient() {
  const [dryRun, setDryRun] = useState(true);
  const [isWorking, setIsWorking] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function runJob(label: string, url: string, body?: Record<string, unknown>) {
    setIsWorking(label);
    setResult(null);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const payload = (await response.json().catch(() => ({}))) as JobResult;

      if (!response.ok) {
        throw new Error(payload.message ?? "Jobben feilet.");
      }

      if (payload.message) {
        setResult(payload.message);
        return;
      }

      setResult(
        [
          payload.dryRun ? "Dry-run fullført." : "Jobb kjørt.",
          `Brukere sjekket: ${payload.usersChecked ?? 0}`,
          `E-poster: ${payload.emailsSent ?? 0}`,
          `Påminnelser: ${payload.remindersCreated ?? 0}`,
        ].join(" "),
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Jobben feilet.");
    } finally {
      setIsWorking(null);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
      <h2 className="text-lg font-extrabold tracking-tight">Test jobber</h2>
      <p className="mt-2 text-sm leading-6 text-[#5F6F82]">
        Dry-run teller hvem som ville fått e-post uten å sende noe.
      </p>

      <label className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-[#F7F9FC] p-4 text-sm font-semibold">
        <span>Dry-run</span>
        <input
          checked={dryRun}
          className="h-5 w-5 accent-[#C8102E]"
          onChange={(event) => setDryRun(event.target.checked)}
          type="checkbox"
        />
      </label>

      {result ? (
        <p className="mt-4 rounded-xl bg-[#F7F9FC] px-4 py-3 text-sm font-semibold text-[#0D1B2A]">
          {result}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          className="rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white hover:bg-[#a90d27] disabled:opacity-50"
          disabled={Boolean(isWorking)}
          onClick={() =>
            runJob("reminders", "/api/admin/jobs/reminders", {
              dryRun,
            })
          }
          type="button"
        >
          {isWorking === "reminders" ? "Kjører..." : "Test kommende trekk-varsler"}
        </button>
        <button
          className="rounded-xl bg-[#0D1B2A] px-5 py-3 text-sm font-bold text-white hover:bg-[#15283c] disabled:opacity-50"
          disabled={Boolean(isWorking)}
          onClick={() =>
            runJob("monthly", "/api/admin/jobs/monthly-summary", {
              dryRun,
            })
          }
          type="button"
        >
          {isWorking === "monthly" ? "Kjører..." : "Test månedlig oppsummering"}
        </button>
        <button
          className="rounded-xl border border-[#DBE4EE] px-5 py-3 text-sm font-bold text-[#0D1B2A] hover:border-[#C8102E]/50 disabled:opacity-50"
          disabled={Boolean(isWorking)}
          onClick={() => runJob("test-email", "/api/admin/jobs/test-email")}
          type="button"
        >
          {isWorking === "test-email" ? "Sender..." : "Send test-e-post"}
        </button>
      </div>
    </section>
  );
}
