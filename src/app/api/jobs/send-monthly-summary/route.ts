import { NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron";
import { sendMonthlySummaryEmail } from "@/lib/notification-email";
import { prisma } from "@/lib/prisma";
import {
  normalizeNextPaymentDate,
  parseSubscriptionDate,
  startOfDay,
} from "@/lib/subscription-dates";
import type { BillingInterval } from "@/types/subscription";

export const runtime = "nodejs";

const activeStatuses = ["active", "trial", "yearly"];

export async function POST(request: Request) {
  const cronError = validateCronRequest(request);

  if (cronError) {
    return cronError;
  }

  const users = await prisma.user.findMany({
    where: {
      monthlySummaryEnabled: true,
      email: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptions: {
        where: { status: { in: activeStatuses } },
        select: {
          id: true,
          name: true,
          monthlyCost: true,
          status: true,
          billingInterval: true,
          nextPayment: true,
        },
      },
    },
  });

  let emailsSent = 0;
  const today = startOfDay(new Date());
  const thirtyDaysFromNow = addDays(today, 30);

  for (const user of users) {
    if (!user.email) {
      continue;
    }

    const normalizedSubscriptions = [];

    for (const subscription of user.subscriptions) {
      const normalizedNextPayment = normalizeNextPaymentDate({
        nextPayment: subscription.nextPayment,
        billingInterval: subscription.billingInterval as BillingInterval,
        status: subscription.status,
      });

      if (normalizedNextPayment && normalizedNextPayment !== subscription.nextPayment) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { nextPayment: normalizedNextPayment },
        });
      }

      normalizedSubscriptions.push({
        ...subscription,
        nextPayment: normalizedNextPayment,
      });
    }

    const monthlyTotal = normalizedSubscriptions.reduce(
      (sum, subscription) => sum + getMonthlyEquivalent(subscription),
      0,
    );
    const upcomingSubscriptions = normalizedSubscriptions
      .filter((subscription) => {
        const paymentDate = parseSubscriptionDate(subscription.nextPayment);
        return Boolean(paymentDate && paymentDate >= today && paymentDate <= thirtyDaysFromNow);
      })
      .sort((a, b) => {
        const dateA = parseSubscriptionDate(a.nextPayment);
        const dateB = parseSubscriptionDate(b.nextPayment);
        return (dateA?.getTime() ?? 0) - (dateB?.getTime() ?? 0);
      });

    const emailResult = await sendMonthlySummaryEmail({
      to: user.email,
      name: user.name,
      activeCount: normalizedSubscriptions.length,
      monthlyTotal,
      yearlyEstimate: monthlyTotal * 12,
      upcomingSubscriptions,
    });

    if (emailResult.sent) {
      emailsSent += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    usersChecked: users.length,
    emailsSent,
    remindersCreated: 0,
  });
}

function getMonthlyEquivalent(subscription: { monthlyCost: number; billingInterval: string }) {
  if (subscription.billingInterval === "yearly") {
    return Math.round(subscription.monthlyCost / 12);
  }

  return subscription.monthlyCost;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfDay(nextDate);
}
