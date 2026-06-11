"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ConfirmCancellation } from "@/components/cancellation/ConfirmCancellation";
import { SuccessScreen } from "@/components/cancellation/SuccessScreen";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import type {
  Subscription,
  SubscriptionCategory,
  SubscriptionStatus,
} from "@/types/subscription";

type DashboardStep = "overview" | "confirm" | "success";
type CategoryFilter = "all" | SubscriptionCategory;

type SubscriptionForm = {
  name: string;
  category: SubscriptionCategory;
  monthlyCost: string;
  status: SubscriptionStatus;
  nextPayment: string;
  note: string;
};

const filters: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "streaming", label: "Streaming" },
  { value: "software", label: "Programvare" },
  { value: "news", label: "Nyheter" },
  { value: "health", label: "Helse" },
];

const defaultForm: SubscriptionForm = {
  name: "",
  category: "streaming",
  monthlyCost: "",
  status: "active",
  nextPayment: "",
  note: "",
};

export function DashboardClient() {
  const { data: session } = useSession();
  const [subscriptionList, setSubscriptionList] = useState<Subscription[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [step, setStep] = useState<DashboardStep>("overview");
  const [lastCancelledCount, setLastCancelledCount] = useState(0);
  const [lastMonthlySavings, setLastMonthlySavings] = useState(0);
  const [form, setForm] = useState<SubscriptionForm>(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubscriptions() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/subscriptions", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Kunne ikke hente abonnementer.");
        }
        const subscriptions = (await response.json()) as Subscription[];
        setSubscriptionList(subscriptions);
      } catch {
        setErrorMessage("Kunne ikke hente abonnementer fra databasen.");
      } finally {
        setIsLoading(false);
      }
    }

    loadSubscriptions();
  }, []);

  const cancellableSubscriptions = subscriptionList.filter(
    (subscription) => subscription.status !== "cancelled",
  );
  const visibleSubscriptions = subscriptionList.filter(
    (subscription) => activeFilter === "all" || subscription.category === activeFilter,
  );
  const selectedSubscriptions = subscriptionList.filter((subscription) =>
    selectedIds.includes(subscription.id),
  );

  const totalMonthlyCost = useMemo(
    () =>
      subscriptionList
        .filter((subscription) => subscription.status !== "cancelled")
        .reduce((sum, subscription) => sum + subscription.monthlyCost, 0),
    [subscriptionList],
  );
  const activeCount = subscriptionList.filter((subscription) =>
    ["active", "trial", "yearly"].includes(subscription.status),
  ).length;
  const trialCount = subscriptionList.filter((subscription) => subscription.status === "trial").length;
  const monthlySavings = selectedSubscriptions.reduce(
    (sum, subscription) => sum + subscription.monthlyCost,
    0,
  );
  const userLabel = session?.user?.name ?? session?.user?.email ?? "Demo-bruker";
  const userInitials = getUserInitials(session?.user?.name, session?.user?.email);

  function toggleSubscription(id: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((selectedId) => selectedId !== id)
        : [...currentIds, id],
    );
  }

  function toggleSelectAll() {
    const visibleCancellableIds = visibleSubscriptions
      .filter((subscription) => subscription.status !== "cancelled")
      .map((subscription) => subscription.id);
    const allVisibleSelected = visibleCancellableIds.every((id) => selectedIds.includes(id));

    setSelectedIds((currentIds) =>
      allVisibleSelected
        ? currentIds.filter((id) => !visibleCancellableIds.includes(id))
        : Array.from(new Set([...currentIds, ...visibleCancellableIds])),
    );
  }

  async function addSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monthlyCost: Number(form.monthlyCost),
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke legge til abonnementet.");
      }

      const subscription = (await response.json()) as Subscription;
      setSubscriptionList((currentSubscriptions) => [...currentSubscriptions, subscription]);
      setForm(defaultForm);
    } catch {
      setErrorMessage("Kunne ikke legge til abonnementet.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSubscription(id: string) {
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Kunne ikke slette abonnementet.");
      }

      setSubscriptionList((currentSubscriptions) =>
        currentSubscriptions.filter((subscription) => subscription.id !== id),
      );
      setSelectedIds((currentIds) => currentIds.filter((selectedId) => selectedId !== id));
    } catch {
      setErrorMessage("Kunne ikke slette abonnementet.");
    }
  }

  async function confirmCancellation() {
    const subscriptionsToCancel = [...selectedSubscriptions];
    setErrorMessage(null);

    try {
      const updatedSubscriptions = await Promise.all(
        subscriptionsToCancel.map(async (subscription) => {
          const response = await fetch(`/api/subscriptions/${subscription.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
          });

          if (!response.ok) {
            throw new Error("Kunne ikke avslutte abonnementet.");
          }

          return (await response.json()) as Subscription;
        }),
      );

      const updatedById = new Map(
        updatedSubscriptions.map((subscription) => [subscription.id, subscription]),
      );
      setLastCancelledCount(subscriptionsToCancel.length);
      setLastMonthlySavings(monthlySavings);
      setSubscriptionList((currentSubscriptions) =>
        currentSubscriptions.map((subscription) => updatedById.get(subscription.id) ?? subscription),
      );
      setSelectedIds([]);
      setStep("success");
    } catch {
      setErrorMessage("Kunne ikke lagre avslutningen. Prøv igjen.");
      setStep("overview");
    }
  }

  return (
    <main className="min-h-screen bg-[#F0F4F8] pb-28 text-[#0D1B2A]">
      <header className="bg-[#0D1B2A] px-5 py-6 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link className="text-xl font-extrabold tracking-tight" href="/">
            Abo<span className="text-[#C8102E]">slutt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              className="text-sm font-semibold text-white/60 hover:text-white"
              href="/import/email"
            >
              Importer e-post
            </Link>
            <Link className="text-sm font-semibold text-white/60 hover:text-white" href="/connect">
              Koble til mer
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3">
              <div className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#C8102E] px-2 text-xs font-black text-white">
                {userInitials}
              </div>
              <span className="hidden max-w-40 truncate text-sm font-semibold text-white/80 sm:block">
                {userLabel}
              </span>
            </div>
            {session ? (
              <button
                className="text-sm font-semibold text-white/60 hover:text-white"
                onClick={() => signOut({ callbackUrl: "/" })}
                type="button"
              >
                Logg ut
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-[#F3C3CC] bg-[#F5E6E9] p-4 text-sm font-semibold text-[#C8102E]">
            {errorMessage}
          </div>
        ) : null}

        {step === "confirm" ? (
          <ConfirmCancellation
            monthlySavings={monthlySavings}
            onBack={() => setStep("overview")}
            onConfirm={confirmCancellation}
            selectedSubscriptions={selectedSubscriptions}
          />
        ) : null}

        {step === "success" ? (
          <SuccessScreen
            cancelledCount={lastCancelledCount}
            monthlySavings={lastMonthlySavings}
            onDone={() => setStep("overview")}
          />
        ) : null}

        {step === "overview" ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
                  Demo-oversikt
                </p>
                {/* TODO: Require an authenticated session here when Vipps or email login is production-ready. */}
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Abonnementene dine
                </h1>
              </div>
              <button
                className="rounded-xl border border-[#DBE4EE] bg-white px-4 py-3 text-sm font-bold text-[#0D1B2A] hover:border-[#C8102E]/50"
                onClick={toggleSelectAll}
                type="button"
              >
                Velg alle synlige
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <SummaryCard label="Totalt per måned" value={`${totalMonthlyCost} kr`} />
              <SummaryCard label="Aktive abonnementer" value={String(activeCount)} />
              <SummaryCard label="Prøveperioder" value={String(trialCount)} />
            </div>

            <form
              className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]"
              onSubmit={addSubscription}
            >
              <h2 className="text-lg font-extrabold tracking-tight">Legg til abonnement</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-6">
                <TextInput
                  label="Navn"
                  onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                  placeholder="F.eks. HBO Max"
                  value={form.name}
                />
                <TextInput
                  inputMode="numeric"
                  label="Kr/mnd"
                  onChange={(value) => setForm((current) => ({ ...current, monthlyCost: value }))}
                  placeholder="149"
                  value={form.monthlyCost}
                />
                <SelectInput
                  label="Kategori"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      category: value as SubscriptionCategory,
                    }))
                  }
                  options={[
                    ["streaming", "Streaming"],
                    ["software", "Programvare"],
                    ["news", "Nyheter"],
                    ["health", "Helse"],
                  ]}
                  value={form.category}
                />
                <SelectInput
                  label="Status"
                  onChange={(value) =>
                    setForm((current) => ({ ...current, status: value as SubscriptionStatus }))
                  }
                  options={[
                    ["active", "Aktiv"],
                    ["trial", "Prøveperiode"],
                    ["yearly", "Årlig"],
                  ]}
                  value={form.status}
                />
                <TextInput
                  label="Neste trekk"
                  onChange={(value) => setForm((current) => ({ ...current, nextPayment: value }))}
                  placeholder="12. aug"
                  value={form.nextPayment}
                />
                <TextInput
                  label="Notat"
                  onChange={(value) => setForm((current) => ({ ...current, note: value }))}
                  placeholder="Valgfritt"
                  value={form.note}
                />
              </div>
              <button
                className="mt-4 rounded-xl bg-[#0D1B2A] px-5 py-3 text-sm font-bold text-white hover:bg-[#15283c] disabled:opacity-50"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Lagrer..." : "Legg til"}
              </button>
            </form>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {filters.map((filter) => (
                <button
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                    activeFilter === filter.value
                      ? "bg-[#0D1B2A] text-white"
                      : "bg-white text-[#4A5568] ring-1 ring-[#DBE4EE] hover:text-[#0D1B2A]"
                  }`}
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="mt-4 rounded-2xl bg-white p-6 text-center text-sm text-[#5F6F82] ring-1 ring-[#DBE4EE]">
                Henter abonnementer...
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {visibleSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    isSelected={selectedIds.includes(subscription.id)}
                    key={subscription.id}
                    onDelete={deleteSubscription}
                    onToggle={toggleSubscription}
                    subscription={subscription}
                  />
                ))}
              </div>
            )}

            {!isLoading && visibleSubscriptions.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-white p-6 text-center text-sm text-[#5F6F82] ring-1 ring-[#DBE4EE]">
                Ingen abonnementer i denne visningen.
              </div>
            ) : null}

            {!isLoading && cancellableSubscriptions.length === 0 && subscriptionList.length > 0 ? (
              <div className="mt-6 rounded-2xl bg-white p-6 text-center text-sm text-[#5F6F82] ring-1 ring-[#DBE4EE]">
                Alle abonnementer i demoen er markert som avsluttet.
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {step === "overview" && selectedIds.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-[#DBE4EE] bg-white/95 px-5 py-4 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">{selectedIds.length} valgt</p>
              <p className="text-sm text-[#5F6F82]">
                Mulig besparelse: {monthlySavings} kr/mnd
              </p>
            </div>
            <button
              className="rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white hover:bg-[#a90d27]"
              onClick={() => setStep("confirm")}
              type="button"
            >
              Fortsett
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function getUserInitials(name?: string | null, email?: string | null) {
  if (!name && !email) {
    return "DEMO";
  }

  const source = name ?? email ?? "";
  const parts = source
    .replace("@", " ")
    .split(" ")
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#DBE4EE]">
      <p className="text-sm font-semibold text-[#5F6F82]">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-[#0D1B2A]">{value}</p>
    </div>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-semibold text-[#4A5568] md:col-span-1">
      {label}
      <input
        className="mt-2 w-full rounded-xl border border-[#DBE4EE] px-3 py-2.5 text-sm text-[#0D1B2A] outline-none focus:border-[#0D1B2A]"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={label !== "Notat"}
        value={value}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-semibold text-[#4A5568] md:col-span-1">
      {label}
      <select
        className="mt-2 w-full rounded-xl border border-[#DBE4EE] bg-white px-3 py-2.5 text-sm text-[#0D1B2A] outline-none focus:border-[#0D1B2A]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
