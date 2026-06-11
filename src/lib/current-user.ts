import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const demoUserEmail = "demo@aboslutt.local";

export async function getCurrentAppUser() {
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email?.trim().toLowerCase();

  if (sessionEmail) {
    const sessionName = session?.user?.name ?? null;
    const sessionImage = session?.user?.image ?? null;

    return prisma.user.upsert({
      where: { email: sessionEmail },
      update: {
        name: sessionName ?? undefined,
        image: sessionImage ?? undefined,
      },
      create: {
        email: sessionEmail,
        name: sessionName,
        image: sessionImage,
      },
    });
  }

  if (process.env.NODE_ENV !== "production") {
    // TODO: Remove before the local development flow no longer needs seeded demo data.
    return prisma.user.upsert({
      where: { email: demoUserEmail },
      update: {},
      create: {
        email: demoUserEmail,
        name: "Demo-bruker",
      },
    });
  }

  return null;
}
