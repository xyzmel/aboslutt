import { NextResponse } from "next/server";
import { AdminForbiddenError, isAdminUser } from "@/lib/admin";
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user";
import { isValidPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

type AdminUserRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: AdminUserRouteProps) {
  const adminResponse = await requireAdminResponse();

  if (adminResponse) {
    return adminResponse;
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST", message: "Ugyldig forespørsel." },
      { status: 400 },
    );
  }

  const data: { emailVerified?: Date; plan?: string } = {};

  if ("emailVerified" in payload) {
    if (payload.emailVerified !== true) {
      return NextResponse.json(
        { ok: false, error: "INVALID_EMAIL_VERIFICATION", message: "Ugyldig e-postbekreftelse." },
        { status: 400 },
      );
    }
    data.emailVerified = new Date();
  }

  if ("plan" in payload) {
    if (typeof payload.plan !== "string" || !isValidPlan(payload.plan)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PLAN", message: "Ugyldig plan." },
        { status: 400 },
      );
    }
    data.plan = payload.plan;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { ok: false, error: "NO_CHANGES", message: "Ingen endringer å lagre." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id },
    data,
    select: { id: true },
  });

  return NextResponse.json({ ok: true, message: "Brukeren er oppdatert." });
}

export async function DELETE(request: Request, { params }: AdminUserRouteProps) {
  const adminResponse = await requireAdminResponse();

  if (adminResponse) {
    return adminResponse;
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload || payload.confirm !== "SLETT") {
    return NextResponse.json(
      { ok: false, error: "CONFIRMATION_REQUIRED", message: "Sletting må bekreftes." },
      { status: 400 },
    );
  }

  await prisma.user.delete({
    where: { id },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, message: "Brukeren er slettet." });
}

async function requireAdminResponse() {
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

  return null;
}
