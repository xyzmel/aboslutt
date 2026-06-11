import { NextResponse } from "next/server";
import { createEmailVerificationToken, sendEmailVerification } from "@/lib/email-verification";
import { hashPassword, validatePassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

type RegisterResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

export async function POST(request: Request) {
  try {
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
      return registerError("Fyll ut alle feltene.", 400);
    }

    if (!validatePassword(password)) {
      return registerError("Passordet må være minst 8 tegn.", 400);
    }

    if (password !== confirmPassword) {
      return registerError("Passordene er ikke like.", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return registerError("Det finnes allerede en bruker med denne e-postadressen.", 409);
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
    }).catch(() => ({ sent: false }));

    return NextResponse.json(
      {
        ok: true,
        message: emailResult.sent
          ? "Kontoen er opprettet. Sjekk e-posten din for å bekrefte kontoen."
          : "Kontoen er opprettet, men e-postverifisering er ikke konfigurert.",
      } satisfies RegisterResponse,
      { status: 201 },
    );
  } catch (error) {
    const duplicate = /Unique constraint/i.test(String(error));
    return registerError(
      duplicate
        ? "Det finnes allerede en bruker med denne e-postadressen."
        : "Kunne ikke opprette konto akkurat nå. Prøv igjen senere.",
      duplicate ? 409 : 500,
    );
  }
}

function registerError(error: string, status: number) {
  return NextResponse.json({ ok: false, error } satisfies RegisterResponse, { status });
}
