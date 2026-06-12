import { NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron";
import { sendUpcomingPaymentReminder } from "@/lib/notification-email";
import { prisma } from "@/lib/prisma";
import {
  normalizeNextPaymentDate,
  startOfDay,
  toIsoDate,
} from "@/lib/subscription-dates";
import type { BillingInterval } from "@/types/subscription";

export const runtime = "nodejs";

const activeStatuses = ["active", "trial", "yearly"];
const reminderType = "upcoming_payment";

export async function POST(request: Request) {
  const cronError = validateCronRequest(request);

  if (cronError) {
    return cronError;
  }

  const users = await prisma.user.findMany({
    where: {
      emailRemindersEnabled: true,
      email: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      reminderDaysBefore: true,
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
  let remindersCreated = 0;
  const today = startOfDay(new Date());

  for (const user of users) {
    if (!user.email) {
      continue;
    }

    const targetDate = addDays(today, user.reminderDaysBefore);
    const targetIsoDate = toIsoDate(targetDate);
    const dueSubscriptions = [];

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

      if (!normalizedNextPayment || normalizedNextPayment !== targetIsoDate) {
        continue;
      }

      const existingReminder = await prisma.reminderLog.findFirst({
        where: {
          userId: user.id,
          subscriptionId: subscription.id,
          reminderDate: normalizedNextPayment,
          type: reminderType,
        },
        select: { id: true },
      });

      if (existingReminder) {
        continue;
      }

      dueSubscriptions.push({
        id: subscription.id,
        name: subscription.name,
        monthlyCost: subscription.monthlyCost,
        nextPayment: normalizedNextPayment,
      });
    }

    if (dueSubscriptions.length === 0) {
      continue;
    }

    const emailResult = await sendUpcomingPaymentReminder({
      to: user.email,
      name: user.name,
      subscriptions: dueSubscriptions,
    });

    if (!emailResult.sent) {
      continue;
    }

    emailsSent += 1;

    await prisma.reminderLog.createMany({
      data: dueSubscriptions.map((subscription) => ({
        userId: user.id,
        subscriptionId: subscription.id,
        reminderDate: subscription.nextPayment,
        type: reminderType,
      })),
      skipDuplicates: true,
    });
    remindersCreated += dueSubscriptions.length;
  }

  return NextResponse.json({
    ok: true,
    usersChecked: users.length,
    emailsSent,
    remindersCreated,
  });
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfDay(nextDate);
}
