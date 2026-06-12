"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { getCancellationStatusLabel } from "@/lib/cancellation";
import type { Subscription } from "@/types/subscription";

type CancellationRequestView = {
  id: string;
  status: string;
  method: string;
  recipientEmail: string;
  customerName: string;
  customerEmail: string;
  customerNumber: string | null;
  subject: string;
  body: string;
  consentConfirmed: boolean;
  sentAt: Date | string | null;
  confirmedAt: Date | string | null;
  rejectedAt: Date | string | null;
  providerResponse: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type CancellationEmailClientProps = {
  subscription: Subscription;
  currentUserName: string | null;
  currentUserEmail: string | null;
  canSend: boolean;
  initialRequest: CancellationRequestView | null;
};

type DraftForm = {
  customerName: string;
  customerEmail: string;
  customerNumber: string;
  recipientEmail: string;
  subject: string;
  body: string;
};

export function CancellationEmailClient({
  subscription,
  currentUserName,
  currentUserEmail,
  canSend,
  initialRequest,
}: CancellationEmailClientProps) {
  const generatedDraft = useMemo(
    () => createLocalDraft(subscription.name, currentUserName ?? "", currentUserEmail ?? "", ""),
    [currentUserEmail, currentUserName, subscription.name],
  );
  const [request, setRequest] = useState(initialRequest);
  const [form, setForm] = useState<DraftForm>({
    customerName: initialRequest?.customerName ?? currentUserName ?? "",
    customerEmail: initialRequest?.customerEmail ?? currentUserEmail ?? "",
    customerNumber: initialRequest?.customerNumber ?? "",
    recipientEmail: initialRequest?.recipientEmail ?? "",
    subject: initialRequest?.subject ?? generatedDraft.subject,
    body: initialRequest?.body ?? generatedDraft.body,
  });
  const [consentConfirmed, setConsentConfirmed] = useState(Boolean(initialRequest?.consentConfirmed));
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const statusLabel = getCancellationStatusLabel(request?.status);

  function updateForm(field: keyof DraftForm, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (["customerName", "customerEmail", "customerNumber"].includes(field)) {
        const nextDraft = createLocalDraft(
          subscription.name,
          next.customerName,
          next.customerEmail,
          next.customerNumber,
        );
        return { ...next, subject: next.subject || nextDraft.subject, body: nextDraft.body };
      }
      return next;
    });
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string; request?: CancellationRequestView };

      if (!response.ok || !result.request) {
        throw new Error(result.message ?? "Kunne ikke lagre utkastet.");
      }

      setRequest(result.request);
      setMessage("Utkastet er lagret. Kontroller teksten før du sender.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke lagre utkastet.");
    } finally {
      setIsWorking(false);
    }
  }

  async function sendEmail() {
    if (!request) {
      setMessage("Lagre utkastet før du sender.");
      return;
    }

    if (!consentConfirmed) {
      setMessage("Du må bekrefte samtykke før Aboslutt kan sende oppsigelsen.");
      return;
    }

    setIsWorking(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/cancellation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", requestId: request.id }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string; request?: CancellationRequestView };

      if (!response.ok || !result.request) {
        throw new Error(result.message ?? "Kunne ikke sende oppsigelsen.");
      }

      setRequest(result.request);
      setMessage("Oppsigelsen er sendt. Abonnementet er ikke markert som avsluttet før du bekrefter svar fra leverandøren.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke sende oppsigelsen.");
    } finally {
      setIsWorking(false);
    }
  }

  async function updateStatus(status: "confirmed_cancelled" | "rejected" | "manual_required") {
    if (!request) {
      return;
    }

    setIsWorking(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/cancellation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", requestId: request.id, status }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string; request?: CancellationRequestView };

      if (!response.ok || !result.request) {
        throw new Error(result.message ?? "Kunne ikke oppdatere status.");
      }

      setRequest(result.request);
      setMessage(
        status === "confirmed_cancelled"
          ? "Bekreftet som avsluttet. Abonnementet er markert som avsluttet."
          : "Status er oppdatert.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke oppdatere status.");
    } finally {
      setIsWorking(false);
    }
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(`${form.subject}\n\n${form.body}`).catch(() => null);
    setMessage("Utkastet er kopiert.");
  }

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
      <Link className="text-sm font-bold text-[#C8102E] hover:underline" href={`/subscriptions/${subscription.id}`}>
        Tilbake til abonnementet
      </Link>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
          <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">Oppsigelse</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{subscription.name}</h1>
          <dl className="mt-5 grid gap-3 text-sm">
            <InfoRow label="Potensiell sparing" value={`${subscription.monthlyCost} kr/mnd`} />
            <InfoRow label="Status" value={statusLabel ?? "Ikke sendt"} />
            <InfoRow label="Metode" value="E-post" />
          </dl>
          <div className="mt-5 rounded-xl bg-[#FFF6E8] p-4 text-sm leading-6 text-[#8A4B13]">
            Aboslutt sender bare e-post på dine vegne når du godkjenner det. Abonnementet regnes ikke som avsluttet før leverandøren bekrefter det.
          </div>
          {!canSend ? (
            <div className="mt-4 rounded-xl bg-[#F7F9FC] p-4 text-sm leading-6 text-[#5F6F82]">
              Gratis-planen kan lage og kopiere utkast. Sending via Aboslutt krever beta eller premium.
            </div>
          ) : null}
        </aside>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
          <form className="grid gap-4" onSubmit={saveDraft}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Ditt navn" onChange={(value) => updateForm("customerName", value)} required value={form.customerName} />
              <TextInput label="Din e-post" onChange={(value) => updateForm("customerEmail", value)} required type="email" value={form.customerEmail} />
              <TextInput label="Kundenummer" onChange={(value) => updateForm("customerNumber", value)} value={form.customerNumber} />
              <TextInput label="Mottaker e-post" onChange={(value) => updateForm("recipientEmail", value)} required type="email" value={form.recipientEmail} />
            </div>
            <TextInput label="Emne" onChange={(value) => updateForm("subject", value)} required value={form.subject} />
            <label className="text-sm font-semibold text-[#4A5568]">
              E-postutkast
              <textarea
                className="mt-2 min-h-72 w-full rounded-xl border border-[#DBE4EE] px-4 py-3 text-sm leading-6 text-[#0D1B2A] outline-none focus:border-[#0D1B2A]"
                onChange={(event) => updateForm("body", event.target.value)}
                required
                value={form.body}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="rounded-xl border border-[#DBE4EE] px-5 py-3 text-sm font-bold hover:border-[#C8102E]/50" disabled={isWorking} type="submit">
                Lagre utkast
              </button>
              <button className="rounded-xl border border-[#DBE4EE] px-5 py-3 text-sm font-bold hover:border-[#C8102E]/50" onClick={copyDraft} type="button">
                Kopier utkast
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-[#DBE4EE] pt-5">
            <label className="flex items-start gap-3 rounded-xl bg-[#F7F9FC] p-4 text-sm font-semibold text-[#0D1B2A]">
              <input
                checked={consentConfirmed}
                className="mt-1 h-5 w-5 accent-[#C8102E]"
                onChange={(event) => setConsentConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>Jeg bekrefter at jeg ønsker at Aboslutt sender denne oppsigelsen på mine vegne.</span>
            </label>
            <button
              className="mt-4 w-full rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white hover:bg-[#a90d27] disabled:opacity-50"
              disabled={!canSend || !request || !consentConfirmed || isWorking}
              onClick={sendEmail}
              type="button"
            >
              Send oppsigelse via Aboslutt
            </button>
          </div>

          {request ? (
            <div className="mt-6 rounded-2xl bg-[#F7F9FC] p-4">
              <h2 className="text-sm font-extrabold">Oppfølging</h2>
              <p className="mt-2 text-sm text-[#5F6F82]">
                Når leverandøren svarer, oppdaterer du status her. Først da markeres abonnementet som avsluttet.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <StatusButton disabled={isWorking} label="Bekreftet avsluttet" onClick={() => updateStatus("confirmed_cancelled")} />
                <StatusButton disabled={isWorking} label="Avvist" onClick={() => updateStatus("rejected")} />
                <StatusButton disabled={isWorking} label="Krever manuell handling" onClick={() => updateStatus("manual_required")} />
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-xl bg-[#F0F4F8] px-4 py-3 text-sm font-semibold text-[#0D1B2A]">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold text-[#4A5568]">
      {label}
      <input
        className="mt-2 w-full rounded-xl border border-[#DBE4EE] px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#0D1B2A]"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="font-semibold text-[#5F6F82]">{label}</dt>
      <dd className="text-right font-bold">{value}</dd>
    </div>
  );
}

function StatusButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      className="rounded-xl border border-[#DBE4EE] px-4 py-3 text-sm font-bold text-[#0D1B2A] hover:border-[#C8102E]/50 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function createLocalDraft(
  subscriptionName: string,
  customerName: string,
  customerEmail: string,
  customerNumber: string,
) {
  const subject = `Oppsigelse av ${subscriptionName}`;
  const customerNumberLine = customerNumber ? `Kundenummer/referanse: ${customerNumber}\n` : "";
  const body = `Hei,

Jeg ønsker å si opp abonnementet mitt på ${subscriptionName}.

Navn: ${customerName}
E-post: ${customerEmail}
${customerNumberLine}
Vennligst bekreft skriftlig at abonnementet er avsluttet, og oppgi siste dato for eventuell tilgang eller siste fakturaperiode.

Hilsen
${customerName}

--
Denne oppsigelsen er sendt via Aboslutt etter eksplisitt godkjenning fra kunden.`;

  return { subject, body };
}
