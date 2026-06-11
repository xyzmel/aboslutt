import type { Subscription } from "@/types/subscription";

type SubscriptionCardProps = {
  subscription: Subscription;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

const categoryLabels: Record<Subscription["category"], string> = {
  streaming: "Streaming",
  software: "Programvare",
  news: "Nyheter",
  health: "Helse",
};

const statusLabels: Record<Subscription["status"], string> = {
  active: "Aktiv",
  trial: "Prøveperiode",
  yearly: "Årlig",
  cancelled: "Avsluttet",
};

export function SubscriptionCard({
  subscription,
  isSelected,
  onToggle,
  onDelete,
}: SubscriptionCardProps) {
  const isCancelled = subscription.status === "cancelled";

  return (
    <article
      className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
        isSelected
          ? "border-[#C8102E] ring-2 ring-[#C8102E]/15"
          : "border-[#DBE4EE] hover:border-[#C8102E]/40"
      } ${isCancelled ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-extrabold tracking-tight text-[#0D1B2A]">
            {subscription.name}
          </p>
          <p className="mt-1 text-sm text-[#5F6F82]">{categoryLabels[subscription.category]}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isCancelled
              ? "bg-emerald-100 text-emerald-700"
              : subscription.status === "trial"
                ? "bg-amber-100 text-amber-700"
                : "bg-[#F0F4F8] text-[#4A5568]"
          }`}
        >
          {statusLabels[subscription.status]}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-black text-[#0D1B2A]">{subscription.monthlyCost} kr</p>
          <p className="text-sm text-[#5F6F82]">per måned</p>
        </div>
        <p className="max-w-[9rem] text-right text-sm leading-5 text-[#5F6F82]">
          Neste trekk: {subscription.nextPayment}
          {subscription.note ? ` · ${subscription.note}` : ""}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            isSelected
              ? "bg-[#C8102E] text-white"
              : "border border-[#DBE4EE] text-[#0D1B2A] hover:border-[#C8102E]/50"
          }`}
          disabled={isCancelled}
          onClick={() => onToggle(subscription.id)}
          type="button"
        >
          {isSelected ? "Valgt" : isCancelled ? "Avsluttet" : "Velg"}
        </button>
        <button
          className="rounded-xl border border-[#F3C3CC] px-4 py-2.5 text-sm font-bold text-[#C8102E] hover:bg-[#F5E6E9]"
          onClick={() => onDelete(subscription.id)}
          type="button"
        >
          Slett
        </button>
      </div>
    </article>
  );
}
