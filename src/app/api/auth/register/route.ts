import { NextResponse } from "next/server";
import { createEmailVerificationToken, sendEmailVerification } from "@/lib/email-verification";
import { hashPassword, validatePassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  const name = payload.name?.trim() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  const confirmPassword = payload.confirmPassword ?? "";

  if (!name || !email || !password || !confirmPassword) {
    return NextResponse.json({ message: "Fyll ut alle feltene." }, { status: 400 });
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

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { message: "Det finnes allerede en bruker med denne e-postadressen." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
    select: { id: true },
  });

  const verificationToken = await createEmailVerificationToken(user.id);
  const emailResult = await sendEmailVerification({
    to: email,
    token: verificationToken.token,
  });

  return NextResponse.json(
    {
      ok: true,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? "Kontoen er opprettet. Sjekk e-posten din for å bekrefte kontoen."
        : "Kontoen er opprettet, men SMTP er ikke konfigurert for verifisering.",
    },
    { status: 201 },
  );
}
