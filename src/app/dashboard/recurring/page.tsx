import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarClock,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { getRecurringTransactionsSummary } from "@/db/queries/recurring";
import { formatCurrency } from "@/lib/formatCurrency";
import { RecurringClient } from "@/components/RecurringClient";

export default async function RecurringPage() {
  const userId = await getCurrentUserId();

  const [summary, baseCurrency] = await Promise.all([
    getRecurringTransactionsSummary(userId),
    getUserBaseCurrency(userId),
  ]);

  const {
    recurring,
    incomeCount,
    expenseCount,
    monthlyExpenses,
    monthlyIncome,
    upcomingCount,
  } = summary;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between page-header-gradient">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Recurring Transactions
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage all your automatic income and expenses in one place.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Monthly Expenses
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(monthlyExpenses, baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {expenseCount} recurring expense{expenseCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Monthly Income
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-emerald-600">
              {formatCurrency(monthlyIncome, baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {incomeCount} recurring income{incomeCount !== 1 ? " items" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Net Monthly
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
              <DollarSign className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle
              className={`text-2xl ${
                monthlyIncome - monthlyExpenses >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {monthlyIncome - monthlyExpenses >= 0 ? "+" : "−"}
              {formatCurrency(
                Math.abs(monthlyIncome - monthlyExpenses),
                baseCurrency
              )}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Recurring cashflow
            </p>
          </CardContent>
        </Card>
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Due This Week
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/30">
              <CalendarClock className="h-4 w-4 text-cyan-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{upcomingCount}</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Transaction{upcomingCount !== 1 ? "s" : ""} in the next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring transactions list */}
      <RecurringClient
        recurring={recurring}
        currency={baseCurrency}
      />
    </div>
  );
}
