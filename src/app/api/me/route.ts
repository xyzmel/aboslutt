import { NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorizedResponse();
  }

  const accounts = await prisma.account.findMany({
    where: { userId: currentUser.id },
    select: { provider: true },
  });
  const providerSet = new Set(accounts.map((account) => account.provider));

  return NextResponse.json({
    ok: true,
    user: {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      image: currentUser.image,
      providers: {
        email: Boolean(currentUser.passwordHash || currentUser.emailVerified),
        google: providerSet.has("google"),
        vipps: providerSet.has("vipps"),
      },
    },
  });
}
