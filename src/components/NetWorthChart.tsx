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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatCurrency";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

type NetWorthPoint = {
  date: string;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  investment_value: number;
};

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export function NetWorthChart({
  data,
  currency,
}: {
  data: NetWorthPoint[];
  currency: string;
}) {
  if (data.length < 2) return null;

  const latest = data[data.length - 1];
  const earliest = data[0];
  const change = latest.net_worth - earliest.net_worth;
  const changePct =
    earliest.net_worth !== 0
      ? ((change / Math.abs(earliest.net_worth)) * 100)
      : 0;

  const chartConfig = {
    net_worth: {
      label: "Net Worth",
      color: "var(--color-chart-2)",
    },
    total_assets: {
      label: "Assets",
      color: "var(--color-chart-3)",
    },
    total_liabilities: {
      label: "Liabilities",
      color: "var(--color-chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Net Worth History</CardTitle>
            <CardDescription>
              {data.length} data point{data.length !== 1 ? "s" : ""} tracked
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(latest.net_worth, currency)}
            </p>
            <p
              className={`text-xs font-medium tabular-nums ${
                change >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {change >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(change), currency)} ({changePct >= 0 ? "+" : ""}
              {changePct.toFixed(1)}%)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
          <AreaChart
            data={data}
            accessibilityLayer
            margin={{ left: 8, right: 8, top: 8 }}
          >
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-net_worth)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-net_worth)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDateLabel}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={62}
              tickFormatter={(value) =>
                formatCompactCurrency(Number(value), currency)
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDateLabel(String(value))}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      net_worth: "Net Worth",
                      total_assets: "Assets",
                      total_liabilities: "Liabilities",
                      investment_value: "Investments",
                    };
                    return (
                      <div className="flex min-w-[10rem] items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {labels[String(name)] ?? String(name)}
                        </span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {formatCurrency(Number(value), currency)}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Area
              dataKey="total_assets"
              type="monotone"
              stroke="var(--color-total_assets)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
              dot={false}
            />
            <Area
              dataKey="total_liabilities"
              type="monotone"
              stroke="var(--color-total_liabilities)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
              dot={false}
            />
            <Area
              dataKey="net_worth"
              type="monotone"
              stroke="var(--color-net_worth)"
              strokeWidth={2.5}
              fill="url(#netWorthGradient)"
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
        <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-chart-2)" }} />
            Net Worth
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-chart-3)" }} />
            Assets
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-chart-1)" }} />
            Liabilities
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
