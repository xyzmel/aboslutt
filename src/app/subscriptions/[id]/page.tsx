import { notFound, redirect } from "next/navigation";
import { SubscriptionDetailClient } from "@/components/subscriptions/SubscriptionDetailClient";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type SubscriptionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { id } = await params;
  const subscription = await prisma.subscription.findFirst({
    where: { id, userId: currentUser.id },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      category: true,
      monthlyCost: true,
      status: true,
      billingInterval: true,
      nextPayment: true,
      note: true,
      source: true,
      confidence: true,
      createdAt: true,
    },
  });

  if (!subscription) {
    notFound();
  }

  return (
    <SubscriptionDetailClient
      initialSubscription={{
        ...subscription,
        category: subscription.category as "streaming" | "software" | "news" | "health",
        status: subscription.status as "active" | "trial" | "yearly" | "cancelled",
        billingInterval: subscription.billingInterval as "monthly" | "yearly" | "unknown",
        createdAt: subscription.createdAt.toISOString(),
      }}
    />
  );
}
