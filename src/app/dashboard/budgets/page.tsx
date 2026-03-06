import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { getBudgets, getSharedBudgets } from "@/db/queries/budgets";
import { getCategoriesByUser } from "@/db/queries/categories";
import { formatCurrency } from "@/lib/formatCurrency";
import { BudgetFormDialog } from "@/components/AddBudgetForm";
import { DeleteBudgetButton } from "@/components/DeleteBudgetButton";
import { ShareDialog } from "@/components/ShareDialog";
import { PendingInvitations } from "@/components/PendingInvitations";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { getCurrentUserId, getCurrentUserEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { BudgetCharts } from "@/components/BudgetCharts";
import { BudgetAlertSettings } from "@/components/BudgetAlertSettings";
import { getAlertPreferencesByUser } from "@/db/queries/budget-alerts";
import { getSharesByOwner, getPendingInvitations } from "@/db/queries/sharing";

export default async function Budgets() {
  const userId = await getCurrentUserId();
  const email = await getCurrentUserEmail();
  
  const [ownedBudgets, sharedBudgetRows, categories, baseCurrency, alertPrefs, allShares, pendingInvitations] = await Promise.all([
    getBudgets(userId),
    getSharedBudgets(userId, email),
    getCategoriesByUser(userId),
    getUserBaseCurrency(userId),
    getAlertPreferencesByUser(userId),
    getSharesByOwner(userId),
    getPendingInvitations(userId, email),
  ]);

  const budgets = [...ownedBudgets, ...sharedBudgetRows];
  const budgetPendingInvitations = pendingInvitations.filter(i => i.resource_type === "budget");

  const budgetSharesMap = new Map<string, typeof allShares>();
  for (const share of allShares) {
    if (share.resource_type !== "budget") continue;
    const existing = budgetSharesMap.get(share.resource_id) ?? [];
    existing.push(share);
    budgetSharesMap.set(share.resource_id, existing);
  }

  const alertPrefsMap = new Map(alertPrefs.map(p => [p.budget_id, p]));

  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.budgetSpent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetCount = budgets.filter((b) => b.budgetSpent > b.budgetAmount).length;
  const spentPercent = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : "0";
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between page-header-gradient">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your spending against monthly budgets.
          </p>
        </div>
        {categories.length === 0 ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/categories">Add Categories First</Link>
          </Button>
        ) : (
          <BudgetFormDialog categories={categories} />
        )}
      </div>

      {budgetPendingInvitations.length > 0 && (
        <PendingInvitations invitations={budgetPendingInvitations} />
      )}

      {/* Summary */}
      <BlurFade delay={0.05} inView>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Total Budget
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
              <Target className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">
              {formatCurrency(totalBudget, baseCurrency)}
            </CardTitle>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Spent
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-violet-600">
              {formatCurrency(totalSpent, baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {spentPercent}% of total budget
            </p>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Remaining
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-emerald-600">
              {formatCurrency(totalRemaining, baseCurrency)}
            </CardTitle>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Over Budget
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">
              {overBudgetCount}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {overBudgetCount === 0
                ? "You're on track!"
                : `${overBudgetCount} categor${overBudgetCount === 1 ? "y" : "ies"} exceeded`}
            </p>
          </CardContent>
        </Card>
      </div>
      </BlurFade>

      {budgets.length > 0 && (
        <BudgetCharts budgets={budgets} currency={baseCurrency} />
      )}

      {/* Budget cards */}
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Target className="h-10 w-10 opacity-40" />
            <div>
              <p className="text-sm font-medium text-foreground">No budgets yet</p>
              <p className="text-xs">Set category limits to monitor spending.</p>
            </div>
            {categories.length === 0 ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/categories">Add a category first</Link>
              </Button>
            ) : (
              <BudgetFormDialog categories={categories} />
            )}
          </CardContent>
        </Card>
      ) : (
        <BlurFade delay={0.1} inView>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const percent = Math.min(
              (budget.budgetSpent / budget.budgetAmount) * 100,
              100
            );
            const remaining = budget.budgetAmount - budget.budgetSpent;
            const isOver = budget.budgetSpent > budget.budgetAmount;
            const isNear = percent >= 80 && !isOver;
            const Icon = getCategoryIcon(budget.budgetIcon);

            return (
              <Card key={budget.id} className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                <div className="p-5 space-y-4">
                  {/* Header: icon + name + actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {Icon ? (
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: budget.budgetColor + "15" }}
                        >
                          <Icon className="h-4.5 w-4.5" style={{ color: budget.budgetColor }} />
                        </div>
                      ) : (
                        <div
                          className="h-10 w-10 shrink-0 rounded-xl"
                          style={{ backgroundColor: budget.budgetColor + "15" }}
                        />
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate">{budget.budgetCategory}</h3>
                        <p className="text-[11px] text-muted-foreground capitalize">{budget.budgetPeriod} budget</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {budget.isShared && (
                        <Badge variant="outline" className="gap-1 text-[10px] mr-1">
                          <Users className="h-3 w-3" />
                          Shared
                        </Badge>
                      )}
                      {!budget.isShared && (
                        <ShareDialog
                          resourceType="budget"
                          resourceId={budget.id}
                          resourceName={budget.budgetCategory}
                          existingShares={(budgetSharesMap.get(budget.id) ?? []).map(s => ({
                            id: s.id,
                            shared_with_email: s.shared_with_email,
                            permission: s.permission,
                            status: s.status,
                          }))}
                        />
                      )}
                      <BudgetAlertSettings
                        budgetId={budget.id}
                        budgetCategory={budget.budgetCategory}
                        prefs={alertPrefsMap.get(budget.id) ?? null}
                      />
                      {!budget.isShared && <BudgetFormDialog categories={categories} budget={budget} />}
                      {!budget.isShared && <DeleteBudgetButton budget={budget} />}
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold tabular-nums tracking-tight">
                        {formatCurrency(budget.budgetSpent, baseCurrency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        of {formatCurrency(budget.budgetAmount, baseCurrency)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        isOver
                          ? "destructive"
                          : isNear
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {isOver ? "Over" : isNear ? "Almost" : "On track"}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver
                            ? "bg-red-400"
                            : isNear
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="text-muted-foreground tabular-nums">
                        {percent.toFixed(0)}% used
                      </span>
                      <span
                        className={`tabular-nums ${
                          isOver
                            ? "font-medium text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isOver
                          ? `${formatCurrency(Math.abs(remaining), baseCurrency)} over`
                          : `${formatCurrency(remaining, baseCurrency)} left`}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        </BlurFade>
      )}
    </div>
  );
}
