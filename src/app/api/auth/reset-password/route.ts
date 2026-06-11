import { NextResponse } from "next/server";
import { hashPassword, validatePassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
    confirmPassword?: string;
  };
  const token = payload.token?.trim() ?? "";
  const password = payload.password ?? "";
  const confirmPassword = payload.confirmPassword ?? "";

  if (!token) {
    return NextResponse.json({ message: "Ugyldig lenke." }, { status: 400 });
  }

  if (!validatePassword(password)) {
    return NextResponse.json(
      { message: "Passordet må være minst 8 tegn." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ message: "Passordene er ikke like." }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { userId: true, expires: true },
  });

  if (!resetToken || resetToken.expires < new Date()) {
    return NextResponse.json(
      { message: "Lenken er ugyldig eller utløpt." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.delete({
      where: { token },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    message: "Passordet er oppdatert. Du kan logge inn.",
  });
}
