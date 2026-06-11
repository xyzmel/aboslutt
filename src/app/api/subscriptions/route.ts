import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/current-user";
import { normalizeMerchantKey, normalizeMerchantName } from "@/lib/email-subscription-parser";
import { prisma } from "@/lib/prisma";
import type { SubscriptionCategory, SubscriptionStatus } from "@/types/subscription";

const allowedCategories: SubscriptionCategory[] = ["streaming", "software", "news", "health"];
const allowedStatuses: SubscriptionStatus[] = ["active", "trial", "yearly", "cancelled"];

const subscriptionSelect = {
  id: true,
  name: true,
  normalizedName: true,
  category: true,
  monthlyCost: true,
  status: true,
  nextPayment: true,
  note: true,
  source: true,
  confidence: true,
} as const;

export async function GET() {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "asc" },
    select: subscriptionSelect,
  });

  return NextResponse.json(subscriptions);
}

export async function POST(request: Request) {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const payload = await request.json();
  const requestedName =
    typeof payload.merchantName === "string"
      ? payload.merchantName.trim()
      : typeof payload.name === "string"
        ? payload.name.trim()
        : "";
  const normalizedName = normalizeMerchantName(requestedName);
  const nextPayment = typeof payload.nextPayment === "string" ? payload.nextPayment.trim() : "";
  const note =
    typeof payload.note === "string"
      ? payload.note.trim()
      : typeof payload.source === "string"
        ? `Importert fra ${payload.source}`
        : "";
  const source = typeof payload.source === "string" ? payload.source.trim() : "manual";
  const confidence = typeof payload.confidence === "number" ? payload.confidence : null;
  const monthlyCost = Number(payload.amount ?? payload.monthlyCost);
  const category = payload.category as SubscriptionCategory;
  const status = getStatusFromPayload(payload);

  if (!requestedName || !nextPayment || !Number.isInteger(monthlyCost) || monthlyCost < 0) {
    return NextResponse.json({ error: "Ugyldig abonnement." }, { status: 400 });
  }

  if (!allowedCategories.includes(category) || !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Ugyldig kategori eller status." }, { status: 400 });
  }

  const duplicateSubscription = await prisma.subscription.findFirst({
    where: {
      userId: currentUser.id,
      status: { in: ["active", "trial", "yearly"] },
      OR: [
        { normalizedName: normalizeMerchantKey(normalizedName) },
        { name: { equals: normalizedName } },
      ],
    },
    select: { id: true },
  });

  if (duplicateSubscription) {
    return NextResponse.json(
      { error: "Dette abonnementet finnes allerede som aktivt abonnement." },
      { status: 409 },
    );
  }

  const subscription = await prisma.subscription.create({
    data: {
      name: normalizedName,
      normalizedName: normalizeMerchantKey(normalizedName),
      category,
      monthlyCost,
      status,
      nextPayment,
      note: note || null,
      source,
      confidence,
      userId: currentUser.id,
    },
    select: subscriptionSelect,
  });

  return NextResponse.json(subscription, { status: 201 });
}

export async function DELETE() {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const result = await prisma.subscription.deleteMany({
    where: { userId: currentUser.id },
  });

  return NextResponse.json({ ok: true, deletedCount: result.count });
}

function getStatusFromPayload(payload: Record<string, unknown>): SubscriptionStatus {
  if (typeof payload.status === "string") {
    return payload.status as SubscriptionStatus;
  }

  if (payload.billingInterval === "trial") {
    return "trial";
  }

  if (payload.billingInterval === "yearly") {
    return "yearly";
  }

  return "active";
}
