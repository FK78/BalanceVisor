"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CreditCard,
  Filter,
  Heart,
  Landmark,
  LineChart,
  PieChart,
  Receipt,
  Repeat,
  Shield,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { DotPattern } from "@/components/ui/dot-pattern";

const features = [
  {
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    title: "Smart Budget Tracking",
    description:
      "Set monthly or weekly budgets per category with real-time progress bars. Get nudges before you overspend.",
  },
  {
    icon: PieChart,
    color: "text-sky-600",
    bg: "bg-sky-100 dark:bg-sky-900/30",
    title: "Spending Breakdown",
    description:
      "Beautiful colour-coded charts that show exactly where every penny goes.",
  },
  {
    icon: CreditCard,
    color: "text-violet-600",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    title: "Multi-Account Management",
    description:
      "Current accounts, savings, credit cards, and investment accounts — all in one cosy place.",
  },
  {
    icon: LineChart,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    title: "Investment Portfolio",
    description:
      "Connect Trading 212 to auto-sync positions, or track manual holdings with live Yahoo Finance prices.",
  },
  {
    icon: Target,
    color: "text-pink-600",
    bg: "bg-pink-100 dark:bg-pink-900/30",
    title: "Savings Goals",
    description:
      "Set targets with deadlines, track contributions, and watch your progress bar fill up over time.",
  },
  {
    icon: Wallet,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
    title: "Debt Tracker",
    description:
      "Track loans, credit cards, and finance with interest rates, minimum payments, and payoff progress.",
  },
  {
    icon: CalendarClock,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
    title: "Subscription Manager",
    description:
      "Keep tabs on Netflix, Spotify, gym — see monthly and yearly costs at a glance with renewal reminders.",
  },
  {
    icon: Repeat,
    color: "text-lime-600",
    bg: "bg-lime-100 dark:bg-lime-900/30",
    title: "Recurring Transactions",
    description:
      "Set up daily, weekly, or monthly recurring income and expenses that auto-generate when due.",
  },
  {
    icon: BarChart3,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    title: "Cashflow Charts",
    description:
      "Income vs expenses over time with trends and rolling averages. Spot patterns early.",
  },
  {
    icon: Bell,
    color: "text-rose-600",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    title: "Budget Alerts",
    description:
      "Browser and email notifications when you&apos;re approaching your budget limit.",
  },
  {
    icon: Tag,
    color: "text-teal-600",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    title: "Custom Categories",
    description:
      "Your own categories with custom colours and icons, or start with sensible defaults.",
  },
  {
    icon: Filter,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    title: "Auto-Categorisation",
    description:
      "Pattern-matching rules so Tesco → Groceries and Netflix → Subscriptions, automatically.",
  },
  {
    icon: Receipt,
    color: "text-cyan-600",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    title: "Transaction Management",
    description:
      "Full pagination, search, sorting, date filtering, CSV import & export.",
  },
  {
    icon: Landmark,
    color: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    title: "Net Worth Dashboard",
    description:
      "Your complete financial picture — net worth, investments, budgets, spending, and goals on one screen.",
  },
];

const steps = [
  {
    step: "1",
    emoji: "👋",
    title: "Create your account",
    description: "Sign up in seconds with email. No credit card, no trial — just free.",
  },
  {
    step: "2",
    emoji: "🏦",
    title: "Set up your finances",
    description: "Add accounts, budgets, goals, debts, subscriptions, and investments in a guided onboarding flow.",
  },
  {
    step: "3",
    emoji: "✨",
    title: "Track everything",
    description: "Log transactions, watch budgets, grow investments, and crush your financial goals.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <Image src="/logo.svg" alt="BalanceVisor logo" width={30} height={30} />
            <span>BalanceVisor</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden px-6 py-28 sm:py-36 lg:py-44">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.10),transparent)]" />
        <DotPattern className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
        <div className="absolute top-20 left-1/4 -z-10 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-10 right-1/4 -z-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-96 w-96 rounded-full bg-violet-200/10 blur-3xl animate-pulse-glow" style={{ animationDelay: '3s' }} />

        <div className="mx-auto max-w-3xl text-center">
          <BlurFade delay={0} inView>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-sm font-medium text-primary shadow-sm shadow-primary/5">
              <AnimatedShinyText className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                100% free — no ads, no premium tier
              </AnimatedShinyText>
            </div>
          </BlurFade>
          <BlurFade delay={0.1} inView>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              Your money, finally{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent">
                under control
              </span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.2} inView>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              BalanceVisor helps you track spending, set budgets, manage investments,
              crush savings goals, and see your full financial picture in one beautifully simple dashboard.
            </p>
          </BlurFade>
          <BlurFade delay={0.3} inView>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/auth/sign-up">
                <ShimmerButton
                  shimmerColor="#a78bfa"
                  shimmerSize="0.05em"
                  background="linear-gradient(135deg, #6366f1, #8b5cf6)"
                  className="w-full sm:w-auto text-base px-8 py-3 font-semibold"
                >
                  Start tracking for free <ArrowRight className="ml-2 h-4 w-4 inline" />
                </ShimmerButton>
              </Link>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/auth/login">I already have an account</Link>
              </Button>
            </div>
          </BlurFade>
        </div>
      </header>

      {/* Social proof stats */}
      <section className="border-y border-border/40 bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 px-6 py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {[
            { value: 14, label: "Feature areas", prefix: "" },
            { value: 5, label: "Account types", prefix: "" },
            { value: 6, label: "Chart views", prefix: "" },
            { value: 0, label: "Forever", prefix: "£" },
          ].map((stat) => (
            <BlurFade key={stat.label} delay={0.1} inView>
              <div className="space-y-1">
                <p className="text-3xl font-extrabold gradient-text">
                  {stat.prefix}
                  <NumberTicker value={stat.value} />
                </p>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="relative px-6 py-24 sm:py-32 overflow-hidden">
        <div className="absolute top-1/4 right-0 -z-10 h-96 w-96 rounded-full bg-indigo-100/30 dark:bg-indigo-900/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-80 w-80 rounded-full bg-cyan-100/20 dark:bg-cyan-900/10 blur-3xl" />
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything you need to manage your money
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No bloat, no upsells. Every feature is included from day one.
            </p>
          </div>
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <BlurFade key={f.title} delay={0.05 * i} inView>
                <div
                  className="group rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.bg} transition-transform duration-300 group-hover:scale-110`}>
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <h3 className="mt-5 text-base font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/40 bg-gradient-to-b from-muted/40 to-muted/20 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No complicated setup. Just start adding your data.
            </p>
          </div>
          <div className="mt-16 grid gap-10 sm:grid-cols-3 relative">
            <div className="hidden sm:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            {steps.map((s, i) => (
              <BlurFade key={s.step} delay={0.15 * i} inView>
                <div className="flex flex-col items-center text-center relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 text-3xl ring-4 ring-background shadow-lg shadow-primary/5">
                    {s.emoji}
                  </div>
                  <h3 className="mt-5 text-base font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Security callout */}
      <section className="px-6 py-24">
        <BlurFade delay={0.1} inView>
          <div className="relative mx-auto max-w-3xl rounded-3xl border border-primary/10 bg-gradient-to-br from-indigo-500/5 via-card to-cyan-500/5 p-8 sm:p-12 shadow-lg shadow-primary/5 overflow-hidden">
            <BorderBeam size={200} duration={8} colorFrom="#6366f1" colorTo="#06b6d4" />
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Your data stays yours</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  BalanceVisor uses Supabase with row-level security — your financial data is
                  isolated and encrypted. We don&apos;t sell data, serve ads, or share anything
                  with third parties. Ever.
                </p>
              </div>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* Final CTA */}
      <section className="relative border-t border-border/40 px-6 py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(99,102,241,0.04),transparent)]" />
        <DotPattern className="absolute inset-0 -z-10 opacity-[0.02] dark:opacity-[0.04] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]" />
        <BlurFade delay={0.1} inView>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to take control?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join BalanceVisor today — it takes less than a minute and
              it&apos;s completely free. No catches.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/auth/sign-up">
                <ShimmerButton
                  shimmerColor="#a78bfa"
                  shimmerSize="0.05em"
                  background="linear-gradient(135deg, #6366f1, #8b5cf6)"
                  className="w-full sm:w-auto text-base px-8 py-3 font-semibold"
                >
                  Create your free account <ArrowRight className="ml-2 h-4 w-4 inline" />
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <Image src="/logo.svg" alt="BalanceVisor" width={22} height={22} />
            BalanceVisor
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/auth/sign-up" className="hover:text-foreground transition-colors">Sign Up</Link>
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Made with <Heart className="h-3 w-3 text-violet-400 fill-violet-400" /> using Next.js &amp; Supabase
          </p>
        </div>
      </footer>
    </div>
  );
}
