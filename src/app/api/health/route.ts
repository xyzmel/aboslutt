import { NextResponse } from "next/server";
import { areBetaSignupsEnabled } from "@/lib/beta";
import { sessionStrategy } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSmtpConfigured } from "@/lib/smtp";

export async function GET() {
  const authConfigured = Boolean(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET);

  try {
    const [userCount, subscriptionCount] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count(),
    ]);

    return NextResponse.json({
      ok: true,
      environment: process.env.NODE_ENV,
      databaseConnected: true,
      authConfigured,
      sessionStrategy,
      smtpConfigured: isSmtpConfigured(),
      betaSignupsEnabled: areBetaSignupsEnabled(),
      userCount,
      subscriptionCount,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        environment: process.env.NODE_ENV,
        databaseConnected: false,
        authConfigured,
        sessionStrategy,
        smtpConfigured: isSmtpConfigured(),
        betaSignupsEnabled: areBetaSignupsEnabled(),
        userCount: null,
        subscriptionCount: null,
      },
      { status: 503 },
    );
  }
}
