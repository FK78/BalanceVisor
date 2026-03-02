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
import { type MonthlyCategorySpendPoint } from "@/db/queries/transactions";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatCurrency";
import { formatMonthLabel } from "@/lib/date";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

type TopCategoryPoint = {
  category: string;
  color: string;
  total: number;
};


export function CategoryCharts({
  topThisMonth,
  monthlyRows,
  currency,
}: {
  topThisMonth: TopCategoryPoint[];
  monthlyRows: MonthlyCategorySpendPoint[];
  currency: string;
}) {
  const topChartData = [...topThisMonth]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const monthKeys = [...new Set(monthlyRows.map((row) => row.month))].sort((a, b) => a.localeCompare(b));
  const totalsByCategory = new Map<string, { total: number; color: string }>();
  for (const row of monthlyRows) {
    const existing = totalsByCategory.get(row.category);
    if (existing) {
      existing.total += row.total;
      continue;
    }

    totalsByCategory.set(row.category, { total: row.total, color: row.color });
  }

  const topCategoriesByTrend = [...totalsByCategory.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 4);

  const categorySeries = topCategoriesByTrend.map(([category, value], index) => ({
    key: `category_${index + 1}`,
    category,
    color: value.color,
  }));

  const trendData = monthKeys.map((month) => {
    const point: Record<string, string | number> = {
      month,
      monthLabel: formatMonthLabel(month),
      other: 0,
    };

    const valuesByCategory = monthlyRows.filter((row) => row.month === month);
    for (const series of categorySeries) {
      const categoryValue = valuesByCategory
        .filter((row) => row.category === series.category)
        .reduce((sum, row) => sum + row.total, 0);
      point[series.key] = categoryValue;
    }

    const trackedSpend = categorySeries.reduce((sum, series) => sum + Number(point[series.key] ?? 0), 0);
    const monthTotal = valuesByCategory.reduce((sum, row) => sum + row.total, 0);
    point.other = Math.max(monthTotal - trackedSpend, 0);

    return point;
  });

  const topChartConfig = {
    total: {
      label: "Spend",
      color: "var(--color-chart-1)",
    },
  } satisfies ChartConfig;

  const trendChartConfig = categorySeries.reduce<ChartConfig>((config, series) => {
    config[series.key] = {
      label: series.category,
      color: series.color,
    };
    return config;
  }, {
    other: {
      label: "Other",
      color: "var(--color-chart-5)",
    },
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top Category Spend This Month</CardTitle>
          <CardDescription>
            Highest expense categories for the current month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topChartData.length === 0 ? (
            <div className="text-muted-foreground flex min-h-[280px] items-center justify-center text-sm">
              No spend data for this month yet.
            </div>
          ) : (
            <ChartContainer config={topChartConfig} className="min-h-[280px] w-full">
              <BarChart
                data={topChartData}
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
                <Bar dataKey="total" radius={4}>
                  {topChartData.map((category) => (
                    <Cell key={category.category} fill={category.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Spend Trend</CardTitle>
          <CardDescription>
            Monthly spend trend for top categories over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <div className="text-muted-foreground flex min-h-[280px] items-center justify-center text-sm">
              No historical category spend available.
            </div>
          ) : (
            <ChartContainer config={trendChartConfig} className="min-h-[280px] w-full">
              <AreaChart
                data={trendData}
                accessibilityLayer
                margin={{ left: 8, right: 8, top: 8 }}
              >
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
                        <span className="font-mono font-medium tabular-nums">
                          {formatCurrency(Number(value), currency)}
                        </span>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {categorySeries.map((series) => (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stackId="spend"
                    fill={`var(--color-${series.key})`}
                    stroke={`var(--color-${series.key})`}
                    fillOpacity={0.28}
                  />
                ))}
                <Area
                  type="monotone"
                  dataKey="other"
                  stackId="spend"
                  fill="var(--color-other)"
                  stroke="var(--color-other)"
                  fillOpacity={0.22}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
