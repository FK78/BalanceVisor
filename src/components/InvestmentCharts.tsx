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
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

type HoldingItem = {
  id: string;
  ticker: string;
  name: string;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
};

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];


export function InvestmentCharts({
  holdings,
  currency,
}: {
  holdings: HoldingItem[];
  currency: string;
}) {
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  // Allocation pie data — top 7 + "Other"
  const sorted = [...holdings].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const restValue = rest.reduce((s, h) => s + h.value, 0);

  const allocationData = [
    ...top.map((h, i) => ({
      ticker: h.ticker,
      label: h.ticker,
      value: h.value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
    ...(restValue > 0
      ? [{ ticker: "Other", label: "Other", value: restValue, fill: "var(--color-chart-5)" }]
      : []),
  ];

  const allocationConfig = allocationData.reduce<ChartConfig>((cfg, item) => {
    cfg[item.ticker] = { label: item.label, color: item.fill };
    return cfg;
  }, {});

  // Gain/loss bar data
  const glData = sorted.slice(0, 10).map((h) => ({
    ticker: h.ticker,
    gainLoss: h.gainLoss,
    gainLossPercent: h.gainLossPercent,
  }));

  const glConfig = {
    gainLoss: {
      label: "Gain / Loss",
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Allocation pie */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Allocation</CardTitle>
          <CardDescription>
            Distribution of value across holdings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={allocationConfig} className="min-h-[260px] w-full">
            <PieChart accessibilityLayer>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value), currency)}
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({totalValue > 0 ? ((Number(value) / totalValue) * 100).toFixed(1) : 0}%)
                        </span>
                      </span>
                    )}
                  />
                }
              />
              <Pie
                data={allocationData}
                dataKey="value"
                nameKey="ticker"
                innerRadius={60}
                outerRadius={95}
                strokeWidth={2}
              >
                {allocationData.map((entry) => (
                  <Cell key={entry.ticker} fill={`var(--color-${entry.ticker})`} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="ticker" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gain/loss bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Gain / Loss by Holding</CardTitle>
          <CardDescription>
            Profit or loss for your top holdings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={glConfig} className="min-h-[260px] w-full">
            <BarChart
              data={glData}
              layout="vertical"
              accessibilityLayer
              margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatCompactCurrency(Number(v), currency)}
              />
              <YAxis
                dataKey="ticker"
                type="category"
                width={80}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(_, __, item) => {
                      const p = item.payload as {
                        ticker: string;
                        gainLoss: number;
                        gainLossPercent: number;
                      };
                      return (
                        <div className="flex min-w-[11rem] items-center justify-between gap-2">
                          <span className="text-muted-foreground">{p.ticker}</span>
                          <div className="text-right">
                            <p className={`font-mono font-medium tabular-nums ${p.gainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {p.gainLoss >= 0 ? "+" : "−"}
                              {formatCurrency(Math.abs(p.gainLoss), currency)}
                            </p>
                            <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
                              {p.gainLossPercent >= 0 ? "+" : ""}{p.gainLossPercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="gainLoss" radius={4}>
                {glData.map((entry) => (
                  <Cell
                    key={entry.ticker}
                    fill={entry.gainLoss >= 0 ? "var(--color-chart-2)" : "var(--color-chart-3)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
