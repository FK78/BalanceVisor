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
import { formatCurrency, formatCompactCurrency } from "@/lib/formatCurrency";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

type BudgetItem = {
  id: number;
  budgetCategory: string;
  budgetColor: string;
  budgetAmount: number;
  budgetSpent: number;
};

export function BudgetCharts({
  budgets,
  currency,
}: {
  budgets: BudgetItem[];
  currency: string;
}) {
  const comparisonData = [...budgets]
    .map((budget) => ({
      category: budget.budgetCategory,
      budget: budget.budgetAmount,
      spent: budget.budgetSpent,
      remaining: Math.max(budget.budgetAmount - budget.budgetSpent, 0),
    }))
    .sort((a, b) => b.budget - a.budget);

  const overBudgetData = [...budgets]
    .filter((budget) => budget.budgetSpent > budget.budgetAmount)
    .map((budget) => ({
      category: budget.budgetCategory,
      over: budget.budgetSpent - budget.budgetAmount,
    }))
    .sort((a, b) => b.over - a.over);

  const comparisonConfig = {
    budget: {
      label: "Budget",
      color: "var(--color-chart-2)",
    },
    spent: {
      label: "Spent",
      color: "var(--color-chart-1)",
    },
  } satisfies ChartConfig;

  const overBudgetConfig = {
    over: {
      label: "Over Budget",
      color: "var(--destructive)",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Spent</CardTitle>
          <CardDescription>
            Compare planned budget with actual spending by category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={comparisonConfig} className="min-h-[320px] w-full">
            <BarChart
              data={comparisonData}
              accessibilityLayer
              margin={{ left: 8, right: 8, top: 8, bottom: 16 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                angle={-35}
                textAnchor="end"
                height={60}
                interval={0}
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
                    formatter={(value, name, item) => {
                      const payload = item.payload as { remaining: number };
                      return (
                        <div className="flex min-w-[10rem] items-center justify-between gap-2">
                          <div>
                            <p className="text-muted-foreground">{String(name)}</p>
                            <p className="text-muted-foreground text-[11px]">
                              Remaining: {formatCurrency(payload.remaining, currency)}
                            </p>
                          </div>
                          <span className="font-mono font-medium tabular-nums">
                            {formatCurrency(Number(value), currency)}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="budget" fill="var(--color-budget)" radius={4} />
              <Bar dataKey="spent" fill="var(--color-spent)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Over-Budget Categories</CardTitle>
          <CardDescription>
            Categories where spend exceeded budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overBudgetData.length === 0 ? (
            <div className="text-muted-foreground flex min-h-[280px] items-center justify-center text-sm">
              No categories are currently over budget.
            </div>
          ) : (
            <ChartContainer config={overBudgetConfig} className="min-h-[280px] w-full">
              <BarChart
                data={overBudgetData}
                layout="vertical"
                accessibilityLayer
                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => formatCompactCurrency(Number(value), currency)}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={120}
                  tickLine={false}
                  axisLine={false}
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
                <Bar dataKey="over" fill="var(--color-over)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
