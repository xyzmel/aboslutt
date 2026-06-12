import { NextResponse } from "next/server";
import { AdminForbiddenError, isAdminUser } from "@/lib/admin";
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type AdminUserSubscriptionsRouteProps = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: AdminUserSubscriptionsRouteProps) {
  const adminResponse = await requireAdminResponse();

  if (adminResponse) {
    return adminResponse;
  }

  const { id } = await params;
  const result = await prisma.subscription.deleteMany({
    where: { userId: id },
  });

  return NextResponse.json({
    ok: true,
    message: `${result.count} abonnementer er slettet.`,
    deletedCount: result.count,
  });
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
