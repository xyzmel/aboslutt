import { NextResponse } from "next/server";
import { AdminForbiddenError, isAdminUser } from "@/lib/admin";
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user";
import { runMonthlySummary } from "@/lib/notification-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorizedResponse();
  }

  if (!isAdminUser(currentUser)) {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN", message: new AdminForbiddenError().message },
      { status: 403 },
    );
  }

  const payload = await request.json().catch(() => ({}));
  const dryRun = Boolean(payload?.dryRun);

  try {
    const result = await runMonthlySummary({
      dryRun,
      triggeredByEmail: currentUser.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    logAdminJobError("admin/jobs/monthly-summary", error, currentUser.id);
    return NextResponse.json(
      { ok: false, error: "MONTHLY_SUMMARY_JOB_FAILED", message: "Kunne ikke teste månedsoppsummering." },
      { status: 500 },
    );
  }
}

function logAdminJobError(route: string, error: unknown, userId?: string) {
  const safeError =
    error instanceof Error ? { name: error.name, message: error.message } : { message: "Ukjent feil" };
  console.error("[admin-job]", { route, userId, ...safeError });
}
