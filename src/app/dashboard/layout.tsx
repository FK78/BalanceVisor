import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";
import { AuthButton } from "@/components/AuthButton";
import { NotificationBellServer } from "@/components/NotificationBellServer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUserId } from "@/lib/auth";
import { hasCompletedOnboarding } from "@/db/queries/onboarding";
import { generateDueRecurringTransactions } from "@/lib/recurring-transactions";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ChatPanelWrapper as ChatPanel } from "@/components/ChatPanelWrapper";
import { BankSyncTrigger } from "@/components/BankSyncTrigger";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  const [onboardingComplete] = await Promise.all([
    hasCompletedOnboarding(userId),
    generateDueRecurringTransactions(userId),
  ]);

  if (!onboardingComplete) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-6 md:px-10">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight"
            >
              <Image src="/logo.svg" alt="BalanceVisor logo" width={30} height={30} />
              BalanceVisor
            </Link>
            <DashboardNav />
          </div>
          <div className="flex items-center gap-1.5">
            <ChatPanel />
            <ThemeToggle />
            <Suspense>
              <NotificationBellServer />
            </Suspense>
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </nav>
      {children}
      <InstallPrompt />
      <BankSyncTrigger />
    </div>
  );
}
