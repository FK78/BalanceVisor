import { BlurFade } from "@/components/ui/blur-fade";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { getSubscriptions, getActiveSubscriptionsTotals, toMonthlyAmount } from "@/db/queries/subscriptions";
import { getCategoriesByUser } from "@/db/queries/categories";
import { getAccountsWithDetails } from "@/db/queries/accounts";
import { getCurrentUserId } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { formatCurrency } from "@/lib/formatCurrency";
import { SubscriptionFormDialog } from "@/components/SubscriptionFormDialog";
import { DeleteSubscriptionButton } from "@/components/DeleteSubscriptionButton";
import { ToggleSubscriptionButton } from "@/components/ToggleSubscriptionButton";

const cycleLabels: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default async function SubscriptionsPage() {
  const userId = await getCurrentUserId();

  const [subscriptions, totals, categories, accounts, baseCurrency] = await Promise.all([
    getSubscriptions(userId),
    getActiveSubscriptionsTotals(userId),
    getCategoriesByUser(userId),
    getAccountsWithDetails(userId),
    getUserBaseCurrency(userId),
  ]);

  const activeCount = subscriptions.filter((s) => s.is_active).length;
  const pausedCount = subscriptions.filter((s) => !s.is_active).length;

  const today = new Date().toISOString().split("T")[0];
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const next7Str = next7.toISOString().split("T")[0];
  const upcomingCount = subscriptions.filter(
    (s) => s.is_active && s.next_billing_date >= today && s.next_billing_date <= next7Str
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between page-header-gradient">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track and manage all your recurring subscriptions.
          </p>
        </div>
        <SubscriptionFormDialog categories={categories} accounts={accounts} />
      </div>

      {/* Summary cards */}
      <BlurFade delay={0.05} inView>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Monthly Cost
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
              <DollarSign className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">
              {formatCurrency(totals.monthly, baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {activeCount} active subscription{activeCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Yearly Cost
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-violet-600">
              {formatCurrency(totals.yearly, baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Projected annual spend
            </p>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Due This Week
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30">
              <CalendarClock className="h-4 w-4 text-sky-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">
              {upcomingCount}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Renewal{upcomingCount !== 1 ? "s" : ""} in the next 7 days
            </p>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Paused
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <CreditCard className="text-muted-foreground h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">
              {pausedCount}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Inactive subscription{pausedCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>
      </BlurFade>

      {/* Subscription cards */}
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Repeat className="h-10 w-10 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">No subscriptions yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Add your first subscription to start tracking recurring costs like
              Netflix, Spotify, gym memberships, and more.
            </p>
            <SubscriptionFormDialog categories={categories} accounts={accounts} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((sub) => {
            const monthlyEquiv = toMonthlyAmount(sub.amount, sub.billing_cycle);
            const isOverdue = sub.is_active && sub.next_billing_date < today;
            const isDueSoon =
              sub.is_active &&
              sub.next_billing_date >= today &&
              sub.next_billing_date <= next7Str;

            return (
              <Card
                key={sub.id}
                className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 ${
                  !sub.is_active ? "opacity-60" : ""
                }`}
              >
                <div
                  className="absolute top-0 left-0 h-1 w-full"
                  style={{ backgroundColor: sub.is_active ? sub.color : "transparent" }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: sub.color + "18" }}
                      >
                        <Repeat className="h-4.5 w-4.5" style={{ color: sub.color }} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{sub.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {cycleLabels[sub.billing_cycle] ?? sub.billing_cycle}
                          {sub.categoryName && (
                            <>
                              {" · "}
                              <span
                                className="inline-flex items-center gap-1"
                              >
                                <span
                                  className="inline-block h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: sub.categoryColor ?? undefined }}
                                />
                                {sub.categoryName}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {sub.url && (
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <a href={sub.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <ToggleSubscriptionButton id={sub.id} isActive={sub.is_active} />
                      <SubscriptionFormDialog
                        subscription={{
                          id: sub.id,
                          name: sub.name,
                          amount: sub.amount,
                          currency: sub.currency,
                          billing_cycle: sub.billing_cycle,
                          next_billing_date: sub.next_billing_date,
                          category_id: sub.category_id,
                          account_id: sub.account_id,
                          url: sub.url,
                          notes: sub.notes,
                          color: sub.color,
                          icon: sub.icon,
                        }}
                        categories={categories}
                        accounts={accounts}
                      />
                      <DeleteSubscriptionButton id={sub.id} name={sub.name} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold tabular-nums tracking-tight">
                        {formatCurrency(sub.amount, baseCurrency)}
                      </p>
                      {sub.billing_cycle !== "monthly" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ≈ {formatCurrency(monthlyEquiv, baseCurrency)}/mo
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {!sub.is_active && (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                      {isOverdue && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                      {isDueSoon && !isOverdue && (
                        <Badge variant="outline" className="border-sky-300 text-sky-600">Due soon</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3 w-3" />
                      Next: {new Date(sub.next_billing_date + "T00:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {sub.notes && (
                    <p className="text-xs text-muted-foreground truncate">{sub.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
