import { NextResponse } from "next/server";
import { AdminForbiddenError, isAdminUser } from "@/lib/admin";
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type AdminBetaRequestRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: AdminBetaRequestRouteProps) {
  const adminResponse = await requireAdminResponse();

  if (adminResponse) {
    return adminResponse;
  }

  const adminUser = await getCurrentUser();
  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const action = payload && typeof payload === "object" ? payload.action : null;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { ok: false, error: "INVALID_ACTION", message: "Ugyldig handling." },
      { status: 400 },
    );
  }

  const betaRequest = await prisma.betaRequest.findUnique({
    where: { id },
    select: { id: true, email: true },
  });

  if (!betaRequest) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND", message: "Beta-forespørselen finnes ikke." },
      { status: 404 },
    );
  }

  if (action === "approve") {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { email: betaRequest.email },
        data: { plan: "beta" },
      });
      await tx.betaRequest.update({
        where: { id },
        data: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: adminUser?.id ?? null,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Beta-tilgang er godkjent. Hvis brukeren finnes, er planen satt til beta.",
    });
  }

  await prisma.betaRequest.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy: adminUser?.id ?? null,
    },
  });

  return NextResponse.json({ ok: true, message: "Beta-forespørselen er avvist." });
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
