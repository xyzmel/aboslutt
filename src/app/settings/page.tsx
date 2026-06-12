import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { isAdminUser } from "@/lib/admin";
import { isVippsConfigured } from "@/lib/auth-config-status";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const gmailReadonlyScope = "https://www.googleapis.com/auth/gmail.readonly";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let currentUser;

  try {
    currentUser = await getCurrentAppUser();
  } catch (error) {
    logServerError("settings:getCurrentUser", error);
    return <SettingsLoadError />;
  }

  if (!currentUser) {
    redirect("/login");
  }

  let googleAccount: { scope: string | null; refresh_token: string | null } | null = null;
  let vippsAccount: { provider: string } | null = null;
  let notificationPreferences = {
    emailRemindersEnabled: true,
    reminderDaysBefore: 3,
    monthlySummaryEnabled: false,
  };

  try {
    [googleAccount, vippsAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { userId: currentUser.id, provider: "google" },
        select: { scope: true, refresh_token: true },
      }),
      prisma.account.findFirst({
        where: { userId: currentUser.id, provider: "vipps" },
        select: { provider: true },
      }),
    ]);
  } catch (error) {
    logServerError("settings:providerAccounts", error, currentUser.id);
  }

  try {
    const userPreferences = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        emailRemindersEnabled: true,
        reminderDaysBefore: true,
        monthlySummaryEnabled: true,
      },
    });

    if (userPreferences) {
      notificationPreferences = {
        emailRemindersEnabled: userPreferences.emailRemindersEnabled ?? true,
        reminderDaysBefore: userPreferences.reminderDaysBefore ?? 3,
        monthlySummaryEnabled: userPreferences.monthlySummaryEnabled ?? false,
      };
    }
  } catch (error) {
    logServerError("settings:notificationPreferences", error, currentUser.id);
  }

  const gmailScopeConnected = Boolean(
    googleAccount?.scope?.split(" ").includes(gmailReadonlyScope),
  );
  const googleReconnectRequired = Boolean(
    googleAccount && gmailScopeConnected && !googleAccount.refresh_token,
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
        emailRemindersEnabled={notificationPreferences.emailRemindersEnabled}
        gmailScopeConnected={gmailScopeConnected}
        googleConnected={gmailScopeConnected && !googleReconnectRequired}
        googleReconnectRequired={googleReconnectRequired}
        isAdmin={isAdminUser(currentUser)}
        monthlySummaryEnabled={notificationPreferences.monthlySummaryEnabled}
        name={currentUser.name}
        reminderDaysBefore={notificationPreferences.reminderDaysBefore}
        vippsConnected={Boolean(vippsAccount)}
        vippsConfigured={isVippsConfigured()}
      />
    </main>
  );
}

function SettingsLoadError() {
  return (
    <main className="min-h-screen bg-[#F0F4F8] px-5 py-10 text-[#0D1B2A]">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[#DBE4EE]">
        <h1 className="text-2xl font-extrabold tracking-tight">Kunne ikke laste innstillingene akkurat nå.</h1>
        <p className="mt-3 text-sm leading-6 text-[#5F6F82]">Prøv igjen.</p>
      </section>
    </main>
  );
}

function logServerError(route: string, error: unknown, userId?: string) {
  const safeError = error instanceof Error ? { name: error.name, message: error.message } : { message: "Ukjent feil" };
  console.error("[server-render]", { route, userId, ...safeError });
}
