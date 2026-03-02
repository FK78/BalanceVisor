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
import type {
  MonthlyCashflowPoint,
  MonthlyCategorySpendPoint,
} from "@/db/queries/transactions";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatCurrency";
import { formatMonthLabel } from "@/lib/date";
import {
  Area,
  AreaChart,
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
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Percent,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

type RangeOption = 3 | 6 | 12;

export function ReportsClient({
  monthlyTrend,
  monthlyCategorySpend,
  currency,
}: {
  monthlyTrend: MonthlyCashflowPoint[];
  monthlyCategorySpend: MonthlyCategorySpendPoint[];
  currency: string;
}) {
  const [range, setRange] = useState<RangeOption>(6);

  const filteredTrend = useMemo(
    () => monthlyTrend.slice(-range),
    [monthlyTrend, range],
  );

  const filteredMonthSet = useMemo(
    () => new Set(filteredTrend.map((p) => p.month)),
    [filteredTrend],
  );

  // KPIs
  const totalIncome = filteredTrend.reduce((s, p) => s + p.income, 0);
  const totalExpenses = filteredTrend.reduce((s, p) => s + p.expenses, 0);
  const totalNet = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0;
  const avgMonthlyExpense = filteredTrend.length > 0 ? totalExpenses / filteredTrend.length : 0;

  // Category pie data
  const categoryPieData = useMemo(() => {
    const totals = new Map<string, { total: number; color: string }>();
    for (const row of monthlyCategorySpend) {
      if (!filteredMonthSet.has(row.month)) continue;
      const existing = totals.get(row.category);
      if (existing) {
        existing.total += row.total;
      } else {
        totals.set(row.category, { total: row.total, color: row.color });
      }
    }

    const sorted = [...totals.entries()]
      .map(([category, v]) => ({ category, total: v.total, fill: v.color }))
      .sort((a, b) => b.total - a.total);

    if (sorted.length <= 8) return sorted;

    const top = sorted.slice(0, 7);
    const otherTotal = sorted.slice(7).reduce((s, i) => s + i.total, 0);
    return [...top, { category: "Other", total: otherTotal, fill: "var(--color-chart-5)" }];
  }, [monthlyCategorySpend, filteredMonthSet]);

  const categoryTotal = categoryPieData.reduce((s, c) => s + c.total, 0);

  // Monthly stacked category data
  const monthlyCategoryStackData = useMemo(() => {
    const months = [...filteredMonthSet].sort();
    const allCategories = new Set<string>();
    const byMonth = new Map<string, Record<string, number>>();

    for (const month of months) {
      byMonth.set(month, {});
    }

    for (const row of monthlyCategorySpend) {
      if (!filteredMonthSet.has(row.month)) continue;
      allCategories.add(row.category);
      const m = byMonth.get(row.month)!;
      m[row.category] = (m[row.category] ?? 0) + row.total;
    }

    // Get top 6 categories by total, rest as "Other"
    const catTotals = new Map<string, number>();
    for (const cat of allCategories) {
      let sum = 0;
      for (const m of byMonth.values()) sum += m[cat] ?? 0;
      catTotals.set(cat, sum);
    }
    const sortedCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
    const topCats = sortedCats.slice(0, 6).map(([c]) => c);
    const otherCats = new Set(sortedCats.slice(6).map(([c]) => c));

    return months.map((month) => {
      const m = byMonth.get(month) ?? {};
      const point: Record<string, string | number> = { month, monthLabel: formatMonthLabel(month) };
      for (const cat of topCats) {
        point[cat] = m[cat] ?? 0;
      }
      if (otherCats.size > 0) {
        let otherSum = 0;
        for (const cat of otherCats) otherSum += m[cat] ?? 0;
        point["Other"] = otherSum;
      }
      return point;
    });
  }, [monthlyCategorySpend, filteredMonthSet]);

  // Category colors map for stacked chart
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of monthlyCategorySpend) {
      if (!map.has(row.category)) map.set(row.category, row.color);
    }
    map.set("Other", "hsl(var(--muted-foreground))");
    return map;
  }, [monthlyCategorySpend]);

  const stackedCategories = useMemo(() => {
    if (monthlyCategoryStackData.length === 0) return [];
    const keys = Object.keys(monthlyCategoryStackData[0]).filter(
      (k) => k !== "month" && k !== "monthLabel",
    );
    return keys;
  }, [monthlyCategoryStackData]);

  // Cumulative net savings
  const cumulativeSavings = useMemo(() => {
    const result: { month: string; monthLabel: string; net: number; cumulative: number }[] = [];
    for (const p of filteredTrend) {
      const prev = result.length > 0 ? result[result.length - 1].cumulative : 0;
      result.push({
        month: p.month,
        monthLabel: formatMonthLabel(p.month),
        net: p.net,
        cumulative: prev + p.net,
      });
    }
    return result;
  }, [filteredTrend]);

  const incomeExpenseConfig = {
    income: { label: "Income", color: "var(--color-chart-2)" },
    expenses: { label: "Expenses", color: "var(--color-chart-1)" },
  } satisfies ChartConfig;

  const netConfig = {
    net: { label: "Net", color: "var(--color-chart-4)" },
    cumulative: { label: "Cumulative", color: "var(--color-chart-2)" },
  } satisfies ChartConfig;

  const categoryConfig = {
    spend: { label: "Spend", color: "var(--color-chart-1)" },
  } satisfies ChartConfig;

  const stackedConfig = Object.fromEntries(
    stackedCategories.map((cat) => [
      cat,
      { label: cat, color: categoryColorMap.get(cat) ?? "var(--color-chart-3)" },
    ]),
  ) as ChartConfig;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Financial insights and analytics across your accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {([3, 6, 12] as RangeOption[]).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={range === option ? "default" : "outline"}
              onClick={() => setRange(option)}
            >
              {option}mo
            </Button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">Income</CardDescription>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl tabular-nums text-emerald-600">
              {formatCurrency(totalIncome, currency)}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">{range}-month total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">Expenses</CardDescription>
            <ArrowDownLeft className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl tabular-nums text-red-600">
              {formatCurrency(totalExpenses, currency)}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">{range}-month total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">Net Savings</CardDescription>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-xl tabular-nums ${totalNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {totalNet >= 0 ? "+" : "−"}{formatCurrency(Math.abs(totalNet), currency)}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">{range}-month total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">Savings Rate</CardDescription>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-xl tabular-nums ${savingsRate >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {savingsRate.toFixed(1)}%
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">of total income</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">Avg Monthly Spend</CardDescription>
            {avgMonthlyExpense > 0 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            )}
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl tabular-nums">
              {formatCurrency(avgMonthlyExpense, currency)}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">per month</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly income vs expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses by Month</CardTitle>
          <CardDescription>
            Monthly comparison for the last {range} months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={incomeExpenseConfig} className="min-h-[280px] w-full">
            <BarChart
              data={filteredTrend.map((p) => ({ ...p, monthLabel: formatMonthLabel(p.month) }))}
              accessibilityLayer
              margin={{ left: 8, right: 8, top: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v) => formatCompactCurrency(Number(v), currency)}
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Net savings trend */}
        <Card>
          <CardHeader>
            <CardTitle>Net Savings Trend</CardTitle>
            <CardDescription>
              Monthly net and cumulative savings over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={netConfig} className="min-h-[260px] w-full">
              <LineChart data={cumulativeSavings} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={(v) => formatCompactCurrency(Number(v), currency)}
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
                <Line dataKey="net" stroke="var(--color-net)" strokeWidth={2} dot={{ r: 3 }} />
                <Line dataKey="cumulative" stroke="var(--color-cumulative)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 3" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category pie */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              Expense breakdown for the last {range} months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryPieData.length === 0 ? (
              <div className="text-muted-foreground flex min-h-[260px] items-center justify-center text-sm">
                No expense data in this range.
              </div>
            ) : (
              <>
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
                      data={categoryPieData}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={55}
                      outerRadius={95}
                      strokeWidth={2}
                    >
                      {categoryPieData.map((item) => (
                        <Cell key={item.category} fill={item.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                  {categoryPieData.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.fill }}
                        />
                        <span className="truncate text-muted-foreground">{cat.category}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="tabular-nums font-medium">
                          {formatCurrency(cat.total, currency)}
                        </span>
                        <span className="text-muted-foreground text-xs ml-1">
                          ({categoryTotal > 0 ? ((cat.total / categoryTotal) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly category breakdown stacked area */}
      {stackedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending by Category</CardTitle>
            <CardDescription>
              How your category spending changes month-to-month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={stackedConfig} className="min-h-[300px] w-full">
              <AreaChart data={monthlyCategoryStackData} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={(v) => formatCompactCurrency(Number(v), currency)}
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
                {stackedCategories.map((cat) => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stackId="1"
                    fill={categoryColorMap.get(cat) ?? "var(--color-chart-3)"}
                    stroke={categoryColorMap.get(cat) ?? "var(--color-chart-3)"}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Top categories table */}
      {categoryPieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Spending Categories</CardTitle>
            <CardDescription>
              Ranked by total spend over the last {range} months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryPieData.map((cat, i) => {
                const pct = categoryTotal > 0 ? (cat.total / categoryTotal) * 100 : 0;
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm font-medium w-5 text-right">{i + 1}</span>
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.fill }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{cat.category}</span>
                        <span className="text-sm font-semibold tabular-nums ml-2">
                          {formatCurrency(cat.total, currency)}
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: cat.fill,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
