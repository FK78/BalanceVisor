"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { type MonthlyCashflowPoint } from "@/db/queries/transactions";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatCurrency";
import { formatMonthLabel } from "@/lib/date";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

export function CashflowCharts({
  data,
  currency,
}: {
  data: MonthlyCashflowPoint[];
  currency: string;
}) {
  const chartData = data.map((point, index) => {
    const rollingWindow = data.slice(Math.max(0, index - 2), index + 1);
    const incomeRollingAvg = rollingWindow.reduce((sum, row) => sum + row.income, 0) / rollingWindow.length;
    const expensesRollingAvg = rollingWindow.reduce((sum, row) => sum + row.expenses, 0) / rollingWindow.length;
    const savingsRate = point.income > 0
      ? ((point.income - point.expenses) / point.income) * 100
      : 0;

    return {
      ...point,
      monthLabel: formatMonthLabel(point.month),
      incomeRollingAvg,
      expensesRollingAvg,
      savingsRate,
    };
  });

  const totalIncome = data.reduce((sum, point) => sum + point.income, 0);
  const totalExpenses = data.reduce((sum, point) => sum + point.expenses, 0);
  const recentNet = data[data.length - 1]?.net ?? 0;
  const avgSavingsRate = chartData.length > 0
    ? chartData.reduce((sum, point) => sum + point.savingsRate, 0) / chartData.length
    : 0;
  const latestSavingsRate = chartData[chartData.length - 1]?.savingsRate ?? 0;

  const spendingChartConfig = {
    expenses: {
      label: "Expenses",
      color: "var(--color-chart-1)",
    },
  } satisfies ChartConfig;

  const incomeExpenseChartConfig = {
    income: {
      label: "Income",
      color: "var(--color-chart-2)",
    },
    expenses: {
      label: "Expenses",
      color: "var(--color-chart-1)",
    },
    incomeRollingAvg: {
      label: "Income (3-mo avg)",
      color: "var(--color-chart-3)",
    },
    expensesRollingAvg: {
      label: "Expenses (3-mo avg)",
      color: "var(--color-chart-4)",
    },
  } satisfies ChartConfig;

  const savingsRateChartConfig = {
    savingsRate: {
      label: "Savings Rate",
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
          <CardDescription>
            Expense totals by month for the most recent period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Total expenses</p>
              <p className="text-xl font-semibold">
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              {data.length} month{data.length === 1 ? "" : "s"}
            </p>
          </div>
          <ChartContainer config={spendingChartConfig} className="min-h-[220px] w-full">
            <BarChart data={chartData} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(value) => formatCompactCurrency(Number(value), currency)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value), currency)}
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
          <CardDescription>
            Month-by-month cashflow comparison with rolling averages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--color-chart-2)" }}
                />
                Income {formatCurrency(totalIncome, currency)}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--color-chart-1)" }}
                />
                Expenses {formatCurrency(totalExpenses, currency)}
              </div>
            </div>
            <p className={`text-sm font-medium ${recentNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              Latest net: {recentNet >= 0 ? "+" : "−"}{formatCurrency(recentNet, currency)}
            </p>
          </div>
          <ChartContainer config={incomeExpenseChartConfig} className="min-h-[220px] w-full">
            <LineChart data={chartData} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(value) => formatCompactCurrency(Number(value), currency)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value), currency)}
                      </span>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="income"
                type="monotone"
                stroke="var(--color-income)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="expenses"
                type="monotone"
                stroke="var(--color-expenses)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="incomeRollingAvg"
                type="monotone"
                stroke="var(--color-incomeRollingAvg)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                dataKey="expensesRollingAvg"
                type="monotone"
                stroke="var(--color-expensesRollingAvg)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Savings Rate Trend</CardTitle>
          <CardDescription>
            Percentage of income retained each month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Average savings rate</p>
              <p className="text-xl font-semibold tabular-nums">
                {avgSavingsRate.toFixed(1)}%
              </p>
            </div>
            <p className={`text-sm font-medium ${latestSavingsRate >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              Latest: {latestSavingsRate.toFixed(1)}%
            </p>
          </div>
          <ChartContainer config={savingsRateChartConfig} className="min-h-[220px] w-full">
            <BarChart data={chartData} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={42}
                tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {Number(value).toFixed(1)}%
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="savingsRate" fill="var(--color-savingsRate)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
