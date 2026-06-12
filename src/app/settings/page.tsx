import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const gmailReadonlyScope = "https://www.googleapis.com/auth/gmail.readonly";

export default async function SettingsPage() {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    redirect("/login");
  }

  const googleAccount = await prisma.account.findFirst({
    where: { userId: currentUser.id, provider: "google" },
    select: { scope: true },
  });
  const gmailScopeConnected = Boolean(
    googleAccount?.scope?.split(" ").includes(gmailReadonlyScope),
  );

  return (
    <main className="min-h-screen bg-[#F0F4F8] text-[#0D1B2A]">
      <header className="bg-[#0D1B2A] px-5 py-6 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link className="text-xl font-extrabold tracking-tight" href="/dashboard">
            Abo<span className="text-[#C8102E]">slutt</span>
          </Link>
          <Link className="text-sm font-semibold text-white/60 hover:text-white" href="/dashboard">
            Til oversikten
          </Link>
        </div>
      </header>

      <SettingsClient
        email={currentUser.email}
        emailRemindersEnabled={currentUser.emailRemindersEnabled}
        gmailScopeConnected={gmailScopeConnected}
        googleConnected={Boolean(googleAccount)}
        monthlySummaryEnabled={currentUser.monthlySummaryEnabled}
        name={currentUser.name}
        reminderDaysBefore={currentUser.reminderDaysBefore}
      />
    </main>
  );
}
