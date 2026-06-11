import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const gmailReadonlyScope = "https://www.googleapis.com/auth/gmail.readonly";

export async function GET() {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const googleAccount = await prisma.account.findFirst({
    where: { userId: currentUser.id, provider: "google" },
    select: { scope: true },
  });

  return NextResponse.json({
    googleConnected: Boolean(googleAccount),
    gmailScopeConnected: Boolean(googleAccount?.scope?.split(" ").includes(gmailReadonlyScope)),
  });
}
