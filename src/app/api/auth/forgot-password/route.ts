import { NextResponse } from "next/server";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const safeMessage = "Hvis e-posten finnes, sender vi deg en lenke.";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { email?: string };
  const email = payload.email?.trim().toLowerCase() ?? "";

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (user?.passwordHash) {
      const resetToken = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail({ to: email, token: resetToken.token }).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true, message: safeMessage });
}
