import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, TrendingUp, PieChart, Shield, Landmark, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  { icon: TrendingUp, text: "Smart budget tracking with real-time alerts", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" },
  { icon: PieChart, text: "Visual spending breakdowns by category", color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30" },
  { icon: Landmark, text: "Net worth dashboard across all accounts", color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30" },
  { icon: Shield, text: "Bank-grade security with row-level isolation", color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30" },
];

export function AuthLayout({
  children,
  backHref = "/",
  backLabel = "Back to home",
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-svh">
      {/* Left branded panel — hidden on mobile */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary/8 via-amber-500/5 to-rose-400/8 p-10 lg:flex">
        <div className="absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-10 -z-10 h-64 w-64 rounded-full bg-amber-200/10 blur-3xl" />

        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
          <Image src="/logo.svg" alt="BalanceVisor" width={32} height={32} />
          <span>BalanceVisor</span>
        </Link>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Free forever
          </div>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight xl:text-3xl">
            Take control of your<br />personal finances
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Track every penny, set budgets that work, and see your complete financial
            picture — beautifully simple and always free.
          </p>
          <div className="space-y-3 pt-2">
            {highlights.map((h) => (
              <div key={h.text} className="flex items-center gap-3 text-sm">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${h.color}`}>
                  <h.icon className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground">{h.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} BalanceVisor. Free forever.
        </p>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 md:p-10">
        <Button asChild variant="ghost" size="sm" className="absolute left-6 top-6 md:left-10 md:top-10">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>

        {/* Logo on mobile only */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <Image src="/logo.svg" alt="BalanceVisor" width={30} height={30} />
          <span className="text-lg font-bold">BalanceVisor</span>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
