import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  await prisma.user.delete({
    where: { id: currentUser.id },
  });

  return NextResponse.json({ ok: true });
}
