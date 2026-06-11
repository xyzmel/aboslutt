import { getServerSession } from "next-auth";
import { LandingScreen } from "@/components/landing/LandingScreen";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <LandingScreen
      user={
        session?.user
          ? {
              name: session.user.name ?? null,
              email: session.user.email ?? null,
            }
          : null
      }
    />
  );
}
