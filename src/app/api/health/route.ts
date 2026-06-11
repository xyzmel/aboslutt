import { NextResponse } from "next/server";
import { areBetaSignupsEnabled } from "@/lib/beta";
import { prisma } from "@/lib/prisma";
import { isSmtpConfigured } from "@/lib/smtp";

export async function GET() {
  try {
    const [userCount, subscriptionCount] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count(),
    ]);

    return NextResponse.json({
      ok: true,
      environment: process.env.NODE_ENV,
      databaseConnected: true,
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
        smtpConfigured: isSmtpConfigured(),
        betaSignupsEnabled: areBetaSignupsEnabled(),
        userCount: null,
        subscriptionCount: null,
      },
      { status: 503 },
    );
  }
}
