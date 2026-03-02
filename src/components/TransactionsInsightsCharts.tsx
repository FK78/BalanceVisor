"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  type DailyCashflowPoint,
  type DailyCategoryExpensePoint,
} from "@/db/queries/transactions";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatCurrency";
import { formatDayLabel } from "@/lib/date";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

type RangeOption = 7 | 30 | 90;

function getWeekStartKey(dayKey: string) {
  const date = new Date(dayKey);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - diffToMonday);
  return monday.toISOString().split("T")[0];
}

export function TransactionsInsightsCharts({
  dailyTrend,
  dailyCategoryExpenses,
  currency,
}: {
  dailyTrend: DailyCashflowPoint[];
  dailyCategoryExpenses: DailyCategoryExpensePoint[];
  currency: string;
}) {
  const [range, setRange] = useState<RangeOption>(30);

  const filteredDailyTrend = useMemo(() => dailyTrend.slice(-range), [dailyTrend, range]);

  const filteredDaySet = useMemo(() => {
    return new Set(filteredDailyTrend.map((point) => point.day));
  }, [filteredDailyTrend]);

  const weeklyData = useMemo(() => {
    const byWeek = new Map<string, { income: number; expenses: number }>();

    for (const point of filteredDailyTrend) {
      const weekKey = getWeekStartKey(point.day);
      const existing = byWeek.get(weekKey) ?? { income: 0, expenses: 0 };
      existing.income += point.income;
      existing.expenses += point.expenses;
      byWeek.set(weekKey, existing);
    }

    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, totals]) => ({
        week,
        weekLabel: formatDayLabel(week),
        income: totals.income,
        expenses: totals.expenses,
      }));
  }, [filteredDailyTrend]);

  const categoryShareData = useMemo(() => {
    const totals = new Map<string, { total: number; color: string }>();

    for (const row of dailyCategoryExpenses) {
      if (!filteredDaySet.has(row.day)) {
        continue;
      }

      const existing = totals.get(row.category);
      if (existing) {
        existing.total += row.total;
        continue;
      }

      totals.set(row.category, { total: row.total, color: row.color });
    }

    const sorted = [...totals.entries()]
      .map(([category, value]) => ({
        category,
        total: value.total,
        fill: value.color,
      }))
      .sort((a, b) => b.total - a.total);

    if (sorted.length <= 6) {
      return sorted;
    }

    const top = sorted.slice(0, 6);
    const otherTotal = sorted.slice(6).reduce((sum, item) => sum + item.total, 0);
    return [
      ...top,
      { category: "Other", total: otherTotal, fill: "var(--color-chart-5)" },
    ];
  }, [dailyCategoryExpenses, filteredDaySet]);

  const totalNet = filteredDailyTrend.reduce((sum, point) => sum + point.net, 0);
  const totalIncome = filteredDailyTrend.reduce((sum, point) => sum + point.income, 0);
  const totalExpenses = filteredDailyTrend.reduce((sum, point) => sum + point.expenses, 0);

  const dailyConfig = {
    income: { label: "Income", color: "var(--color-chart-2)" },
    expenses: { label: "Expenses", color: "var(--color-chart-1)" },
    net: { label: "Net", color: "var(--color-chart-4)" },
  } satisfies ChartConfig;

  const weeklyConfig = {
    income: { label: "Income", color: "var(--color-chart-2)" },
    expenses: { label: "Expenses", color: "var(--color-chart-1)" },
  } satisfies ChartConfig;

  const categoryConfig = {
    spend: { label: "Spend", color: "var(--color-chart-1)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">Chart range</p>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={range === option ? "default" : "outline"}
              onClick={() => setRange(option as RangeOption)}
            >
              {option}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Daily Cashflow Trend</CardTitle>
            <CardDescription>
              Income, expenses, and net cashflow over the last {range} days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                Income: <span className="text-foreground font-mono tabular-nums">{formatCurrency(totalIncome, currency)}</span>
              </span>
              <span className="text-muted-foreground">
                Expenses: <span className="text-foreground font-mono tabular-nums">{formatCurrency(totalExpenses, currency)}</span>
              </span>
              <span className={totalNet >= 0 ? "text-emerald-600" : "text-red-600"}>
                Net: {totalNet >= 0 ? "+" : "−"}{formatCurrency(totalNet, currency)}
              </span>
            </div>
            <ChartContainer config={dailyConfig} className="min-h-[260px] w-full">
              <LineChart data={filteredDailyTrend} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatDayLabel}
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
                      labelFormatter={(value) => formatDayLabel(String(value))}
                      formatter={(value) => (
                        <span className="font-mono font-medium tabular-nums">
                          {formatCurrency(Number(value), currency)}
                        </span>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="income" stroke="var(--color-income)" strokeWidth={2} dot={false} />
                <Line dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
                <Line dataKey="net" stroke="var(--color-net)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Split</CardTitle>
            <CardDescription>
              Expense mix by category for the last {range} days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryShareData.length === 0 ? (
              <div className="text-muted-foreground flex min-h-[260px] items-center justify-center text-sm">
                No expense data in this range.
              </div>
            ) : (
              <ChartContainer config={categoryConfig} className="min-h-[260px] w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-mono font-medium tabular-nums">
                            {formatCurrency(Number(value), currency)}
                          </span>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={categoryShareData}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={50}
                    outerRadius={90}
                    strokeWidth={2}
                  >
                    {categoryShareData.map((item) => (
                      <Cell key={item.category} fill={item.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses by Week</CardTitle>
          <CardDescription>
            Weekly comparison for the selected range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={weeklyConfig} className="min-h-[240px] w-full">
            <BarChart data={weeklyData} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="weekLabel"
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
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value), currency)}
                      </span>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={4} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
