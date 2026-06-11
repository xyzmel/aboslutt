import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      userCount,
      subscriptionCount,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        environment: process.env.NODE_ENV,
        databaseConnected: false,
        userCount: null,
        subscriptionCount: null,
      },
      { status: 503 },
    );
  }
}
