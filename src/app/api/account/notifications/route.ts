import { NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const allowedReminderDays = [1, 3, 7];

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorizedResponse();
  }

  const payload = await request.json();
  const data: {
    emailRemindersEnabled?: boolean;
    reminderDaysBefore?: number;
    monthlySummaryEnabled?: boolean;
  } = {};

  if (payload.emailRemindersEnabled !== undefined) {
    if (typeof payload.emailRemindersEnabled !== "boolean") {
      return NextResponse.json({ ok: false, error: "Ugyldig varselvalg." }, { status: 400 });
    }
    data.emailRemindersEnabled = payload.emailRemindersEnabled;
  }

  if (payload.monthlySummaryEnabled !== undefined) {
    if (typeof payload.monthlySummaryEnabled !== "boolean") {
      return NextResponse.json({ ok: false, error: "Ugyldig oppsummeringsvalg." }, { status: 400 });
    }
    data.monthlySummaryEnabled = payload.monthlySummaryEnabled;
  }

  if (payload.reminderDaysBefore !== undefined) {
    const reminderDaysBefore = Number(payload.reminderDaysBefore);
    if (!allowedReminderDays.includes(reminderDaysBefore)) {
      return NextResponse.json({ ok: false, error: "Ugyldig påminnelsestid." }, { status: 400 });
    }
    data.reminderDaysBefore = reminderDaysBefore;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data,
      select: {
        emailRemindersEnabled: true,
        reminderDaysBefore: true,
        monthlySummaryEnabled: true,
      },
    });

    return NextResponse.json({ ok: true, preferences: updatedUser });
  } catch (error) {
    logServerError("api/account/notifications:patch", error, currentUser.id);
    return NextResponse.json(
      {
        ok: false,
        error: "NOTIFICATION_SETTINGS_UNAVAILABLE",
        message: "Varselinnstillinger er ikke tilgjengelige akkurat nå.",
      },
      { status: 503 },
    );
  }
}

function logServerError(route: string, error: unknown, userId?: string) {
  const safeError = error instanceof Error ? { name: error.name, message: error.message } : { message: "Ukjent feil" };
  console.error("[api]", { route, userId, ...safeError });
}
