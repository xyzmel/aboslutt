import { prisma } from "@/lib/prisma";

export const cancellationStatuses = [
  "draft",
  "ready",
  "sent",
  "awaiting_confirmation",
  "confirmed_cancelled",
  "rejected",
  "manual_required",
] as const;

export type CancellationStatus = (typeof cancellationStatuses)[number];

export function isCancellationStatus(value: string): value is CancellationStatus {
  return cancellationStatuses.includes(value as CancellationStatus);
}

export function getCancellationStatusLabel(status?: string | null) {
  const labels: Record<CancellationStatus, string> = {
    draft: "Utkast",
    ready: "Klar",
    sent: "Oppsigelse sendt",
    awaiting_confirmation: "Venter på bekreftelse",
    confirmed_cancelled: "Avsluttet",
    rejected: "Avvist",
    manual_required: "Krever manuell handling",
  };

  return status && isCancellationStatus(status) ? labels[status] : null;
}

export function createCancellationDraft({
  subscriptionName,
  customerName,
  customerEmail,
  customerNumber,
}: {
  subscriptionName: string;
  customerName: string;
  customerEmail: string;
  customerNumber?: string | null;
}) {
  const subject = `Oppsigelse av ${subscriptionName}`;
  const customerNumberLine = customerNumber
    ? `Kundenummer/referanse: ${customerNumber}\n`
    : "";
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

export async function logCancellationAudit({
  userId,
  subscriptionId,
  cancellationRequestId,
  action,
  metadata = {},
}: {
  userId: string;
  subscriptionId?: string | null;
  cancellationRequestId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.cancellationAuditLog.create({
    data: {
      userId,
      subscriptionId,
      cancellationRequestId,
      action,
      metadataJson: JSON.stringify(sanitizeMetadata(metadata)),
    },
    select: { id: true },
  });
}

function sanitizeMetadata(metadata: Record<string, unknown>) {
  const blocked = /token|secret|password|authorization|cookie|raw|access|refresh/i;

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blocked.test(key))
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 300) : value]),
  );
}
