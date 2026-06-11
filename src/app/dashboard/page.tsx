import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type DashboardPageProps = {
  searchParams: Promise<{ start?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const currentUser = await getCurrentAppUser();
  const params = await searchParams;

  if (!currentUser) {
    redirect("/login");
  }

  const subscriptionCount = await prisma.subscription.count({
    where: { userId: currentUser.id },
  });

  if (subscriptionCount === 0 && params.start !== "manual") {
    redirect("/onboarding");
  }

  return <DashboardClient />;
}
