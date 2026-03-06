import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getLatestFiveTransactionsWithDetails,
  getTotalsByType,
  getSavingsDepositTotal,
  getTotalSpendByCategoryThisMonth,
  getMonthlyIncomeExpenseTrend,
  getMonthlyCategorySpendTrend,
} from "@/db/queries/transactions";
import { getAccountsWithDetails } from "@/db/queries/accounts";
import { getBudgets } from "@/db/queries/budgets";
import { getGoals } from "@/db/queries/goals";
import { getInvestmentValue } from "@/lib/investment-value";
import { getUpcomingRenewals, getActiveSubscriptionsTotals } from "@/db/queries/subscriptions";
import { getDebtsSummary } from "@/db/queries/debts";
import { getNetWorthHistory } from "@/db/queries/net-worth";
import { snapshotNetWorthIfNeeded } from "@/lib/snapshot-net-worth";
import { getMonthRange } from "@/lib/date";
import { getSummaryCards } from "@/lib/summaryCards";
import { generateInsights } from "@/lib/insights";
import { SummaryCard } from "@/components/SummaryCard";
import { TransactionRow } from "@/components/TransactionRow";
import { AccountCard } from "@/components/AccountCard";
import { SpendCategoryRow } from "@/components/SpendCategoryRow";
import { SpendingInsights } from "@/components/SpendingInsights";
import { getCurrentUserId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { CashflowCharts } from "@/components/CashflowCharts";
import { NetWorthChart } from "@/components/NetWorthChart";
import { QuickAddTransaction } from "@/components/QuickAddTransaction";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/formatCurrency";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  ArrowRight,
  CalendarClock,
  Landmark,
  Repeat,
  Trophy,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Wallet,
} from "lucide-react";

export default async function Home() {
  const userId = await getCurrentUserId();
  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(1);

  const [
    lastFiveTransactions,
    accounts,
    budgets,
    goals,
    income,
    expenses,
    lastMonthIncome,
    lastMonthExpenses,
    savingsThisMonth,
    spendByCategory,
    monthlyTrend,
    categoryTrend,
    baseCurrency,
    investmentValue,
    upcomingRenewals,
    subscriptionTotals,
    ,
    netWorthHistory,
    debtSummary,
  ] = await Promise.all([
    getLatestFiveTransactionsWithDetails(userId),
    getAccountsWithDetails(userId),
    getBudgets(userId),
    getGoals(userId),
    getTotalsByType(userId, "income", thisMonth.start, thisMonth.end),
    getTotalsByType(userId, "expense", thisMonth.start, thisMonth.end),
    getTotalsByType(userId, "income", lastMonth.start, lastMonth.end),
    getTotalsByType(userId, "expense", lastMonth.start, lastMonth.end),
    getSavingsDepositTotal(userId, thisMonth.start, thisMonth.end),
    getTotalSpendByCategoryThisMonth(userId),
    getMonthlyIncomeExpenseTrend(userId, 6),
    getMonthlyCategorySpendTrend(userId, 4),
    getUserBaseCurrency(userId),
    getInvestmentValue(userId),
    getUpcomingRenewals(userId, 14),
    getActiveSubscriptionsTotals(userId),
    snapshotNetWorthIfNeeded(userId),
    getNetWorthHistory(userId, 90),
    getDebtsSummary(userId),
  ]);

  const savingsBalance = accounts
    .filter((a: { type: string | null }) => a.type === "savings")
    .reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);

  const liabilityTypes = new Set(["creditCard"]);
  const totalAssets = accounts
    .filter((a: { type: string | null }) => !liabilityTypes.has(a.type ?? ""))
    .reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a: { type: string | null }) => liabilityTypes.has(a.type ?? ""))
    .reduce(
      (sum: number, a: { balance: number }) => sum + Math.abs(a.balance),
      0
    );
  const netWorth = totalAssets - totalLiabilities + investmentValue;

  const summaryCards = getSummaryCards(
    income,
    expenses,
    lastMonthIncome,
    lastMonthExpenses,
    savingsBalance,
    savingsThisMonth,
    baseCurrency
  );

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const monthName = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date());
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

  const spendingInsights = generateInsights(monthlyTrend, categoryTrend, baseCurrency);

  const budgetsAtRisk = budgets.filter((b) => {
    const pct = b.budgetAmount > 0 ? (b.budgetSpent / b.budgetAmount) * 100 : 0;
    return pct >= 80;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      {/* Header with greeting and quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between page-header-gradient">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Welcome back,{" "}
            <span className="font-semibold text-foreground">
              {user?.user_metadata?.display_name ||
                user?.user_metadata?.full_name ||
                user?.email}
            </span>
            . Here&apos;s your overview for {monthName}.
          </p>
        </div>
        <div className="flex gap-2">
          <QuickAddTransaction />
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/transactions">
              Transactions <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/budgets">
              Budgets <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Net Worth banner */}
      {accounts.length > 0 && (
        <Card className="bg-gradient-to-br from-indigo-500/6 via-violet-500/4 to-cyan-400/6 border-primary/15">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Landmark className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Net Worth
                </p>
                <p
                  className={`text-3xl font-bold tabular-nums ${
                    netWorth >= 0 ? "text-foreground" : "text-red-600"
                  }`}
                >
                  {netWorth < 0 ? "−" : ""}
                  {formatCurrency(netWorth, baseCurrency)}
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-muted-foreground text-xs">Assets</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(totalAssets, baseCurrency)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-muted-foreground text-xs">Liabilities</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(totalLiabilities, baseCurrency)}
                  </p>
                </div>
              </div>
              {investmentValue > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">Investments</p>
                    <p className="font-semibold tabular-nums">
                      {formatCurrency(investmentValue, baseCurrency)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net Worth History Chart */}
      {netWorthHistory.length >= 2 && (
        <NetWorthChart data={netWorthHistory} currency={baseCurrency} />
      )}

      {/* Month progress + Summary cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Month progress</span>
          <span>
            Day {dayOfMonth} of {daysInMonth} ({monthProgress}%)
          </span>
        </div>
        <div className="bg-muted h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all"
            style={{ width: `${monthProgress}%` }}
          />
        </div>
      </div>

      <BlurFade delay={0.05} inView>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.title} {...card} />
          ))}
        </div>
      </BlurFade>

      {/* Spending Insights + Charts */}
      {spendingInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending Insights</CardTitle>
            <CardDescription>Notable patterns and anomalies based on your recent activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingInsights insights={spendingInsights} />
          </CardContent>
        </Card>
      )}

      <CashflowCharts data={monthlyTrend} currency={baseCurrency} />

      {/* Budget progress + Spending by category */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Budget Progress</CardTitle>
                <CardDescription>
                  How your budgets are tracking this period.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/budgets">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-6 text-center">
                <p className="text-sm font-medium text-foreground">
                  No budgets set
                </p>
                <p className="text-xs">
                  Create a budget to track your spending limits.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/budgets">Set up budgets</Link>
                </Button>
              </div>
            ) : (
              budgets.slice(0, 5).map((budget) => {
                const pct =
                  budget.budgetAmount > 0
                    ? Math.min(
                        (budget.budgetSpent / budget.budgetAmount) * 100,
                        100
                      )
                    : 0;
                const isOver = budget.budgetSpent > budget.budgetAmount;
                const isWarning = pct >= 80 && !isOver;
                return (
                  <div key={budget.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {budget.budgetCategory}
                      </span>
                      <span
                        className={`text-xs tabular-nums ${
                          isOver
                            ? "text-red-600 font-semibold"
                            : isWarning
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(budget.budgetSpent, baseCurrency)} /{" "}
                        {formatCurrency(budget.budgetAmount, baseCurrency)}
                      </span>
                    </div>
                    <div className="bg-muted h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver
                            ? "bg-red-400"
                            : isWarning
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
            {budgetsAtRisk.length > 0 && (
              <p className="text-xs text-amber-600 pt-1 font-medium">
                {budgetsAtRisk.length} budget
                {budgetsAtRisk.length > 1 ? "s" : ""} at or over 80% spent
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              This month&apos;s expense breakdown (
              {formatCurrency(expenses, baseCurrency)} total).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {spendByCategory.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-6 text-center">
                <p className="text-sm font-medium text-foreground">
                  No category spend yet
                </p>
                <p className="text-xs">
                  Your expense breakdown appears once transactions are added.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/transactions">Add transaction</Link>
                </Button>
              </div>
            ) : (
              spendByCategory.map((cat) => (
                <SpendCategoryRow
                  key={cat.category}
                  category={cat.category}
                  total={cat.total}
                  color={cat.color}
                  totalExpenses={expenses}
                  currency={baseCurrency}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals summary */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Savings Goals</CardTitle>
                <CardDescription>Progress towards your targets.</CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/goals">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.slice(0, 4).map((goal) => {
              const pct = goal.target_amount > 0
                ? Math.min(Math.round((goal.saved_amount / goal.target_amount) * 100), 100)
                : 0;
              const isComplete = goal.saved_amount >= goal.target_amount;
              return (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5" style={{ color: goal.color }} />
                      <span className="font-medium">{goal.name}</span>
                    </div>
                    <span className={`text-xs tabular-nums ${isComplete ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                      {isComplete ? "Complete!" : `${formatCurrency(goal.saved_amount, baseCurrency)} / ${formatCurrency(goal.target_amount, baseCurrency)}`}
                    </span>
                  </div>
                  <div className="bg-muted h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-400" : ""}`}
                      style={{ width: `${pct}%`, backgroundColor: isComplete ? undefined : goal.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Subscriptions */}
      {(upcomingRenewals.length > 0 || subscriptionTotals.count > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Subscriptions
                </CardTitle>
                <CardDescription>
                  {formatCurrency(subscriptionTotals.monthly, baseCurrency)}/mo · {subscriptionTotals.count} active
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/subscriptions">View all</Link>
              </Button>
            </div>
          </CardHeader>
          {upcomingRenewals.length > 0 && (
            <CardContent className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Due in the next 14 days</p>
              {upcomingRenewals.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: sub.color + "18" }}
                    >
                      <Repeat className="h-3.5 w-3.5" style={{ color: sub.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{sub.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {new Date(sub.next_billing_date + "T00:00:00").toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(sub.amount, baseCurrency)}
                  </span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Debt Summary */}
      {debtSummary.activeCount > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Debt Tracker
                </CardTitle>
                <CardDescription>
                  {formatCurrency(debtSummary.totalRemaining, baseCurrency)} remaining · {debtSummary.activeCount} active debt{debtSummary.activeCount !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/debts">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {debtSummary.active.slice(0, 4).map((debt) => {
              const paid = debt.original_amount - debt.remaining_amount;
              const pct = debt.original_amount > 0 ? Math.min(Math.round((paid / debt.original_amount) * 100), 100) : 0;
              return (
                <div key={debt.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: debt.color + "18" }}
                      >
                        <CreditCard className="h-3.5 w-3.5" style={{ color: debt.color }} />
                      </div>
                      <span className="font-medium truncate">{debt.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums text-red-600">
                      {formatCurrency(debt.remaining_amount, baseCurrency)}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: debt.color }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>{debtSummary.overallPct}% paid off overall</span>
              {debtSummary.totalMinimumPayment > 0 && (
                <span>{formatCurrency(debtSummary.totalMinimumPayment, baseCurrency)}/mo minimum</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions + Accounts */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your last 5 transactions.</CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/transactions">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lastFiveTransactions.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  No transactions yet
                </p>
                <p className="text-xs">
                  Add a transaction to populate your dashboard.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/transactions">Go to transactions</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastFiveTransactions.map((t) => (
                    <TransactionRow key={t.id} t={t} currency={baseCurrency} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Accounts</CardTitle>
                <CardDescription>
                  {accounts.length} account{accounts.length !== 1 ? "s" : ""}{" "}
                  linked.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/accounts">Manage</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-6 text-center">
                <Wallet className="h-8 w-8 opacity-40" />
                <p className="text-sm font-medium text-foreground">
                  No accounts linked
                </p>
                <p className="text-xs">
                  Create an account to start tracking balances.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/accounts">Add account</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <AccountCard
                    key={account.accountName}
                    account={account}
                    currency={baseCurrency}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
