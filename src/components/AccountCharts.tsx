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

type AccountItem = {
  id: number;
  accountName: string;
  type: string | null;
  balance: number;
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  currentAccount: "var(--color-chart-1)",
  savings: "var(--color-chart-2)",
  creditCard: "var(--color-chart-3)",
  investment: "var(--color-chart-4)",
  other: "var(--color-chart-5)",
};

function formatTypeLabel(type: string) {
  if (type === "currentAccount") {
    return "Current Account";
  }

  if (type === "creditCard") {
    return "Credit Card";
  }

  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AccountCharts({
  accounts,
  currency,
}: {
  accounts: AccountItem[];
  currency: string;
}) {
  const totalsByType = new Map<string, number>();
  for (const account of accounts) {
    const key = account.type ?? "other";
    totalsByType.set(key, (totalsByType.get(key) ?? 0) + Math.abs(account.balance));
  }

  const typeData = [...totalsByType.entries()]
    .map(([type, total]) => ({
      type,
      label: formatTypeLabel(type),
      total,
      fill: ACCOUNT_TYPE_COLORS[type] ?? ACCOUNT_TYPE_COLORS.other,
    }))
    .sort((a, b) => b.total - a.total);

  const totalBalanceAbs = accounts.reduce((sum, account) => sum + Math.abs(account.balance), 0);
  const balanceShareData = [...accounts]
    .map((account) => ({
      id: account.id,
      accountName: account.accountName,
      balanceAbs: Math.abs(account.balance),
      share: totalBalanceAbs > 0 ? (Math.abs(account.balance) / totalBalanceAbs) * 100 : 0,
      rawBalance: account.balance,
    }))
    .sort((a, b) => b.balanceAbs - a.balanceAbs);

  const typeChartConfig = typeData.reduce<ChartConfig>((config, item) => {
    config[item.type] = {
      label: item.label,
      color: item.fill,
    };
    return config;
  }, {});

  const shareChartConfig = {
    share: {
      label: "Balance Share",
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Allocation by Account Type</CardTitle>
          <CardDescription>
            Distribution of balances across account types.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={typeChartConfig} className="min-h-[260px] w-full">
            <PieChart accessibilityLayer>
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
              <Pie
                data={typeData}
                dataKey="total"
                nameKey="type"
                innerRadius={60}
                outerRadius={95}
                strokeWidth={2}
              >
                {typeData.map((entry) => (
                  <Cell key={entry.type} fill={`var(--color-${entry.type})`} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="type" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Balance Share</CardTitle>
          <CardDescription>
            Relative balance contribution by account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={shareChartConfig} className="min-h-[260px] w-full">
            <BarChart
              data={balanceShareData}
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
                tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
              />
              <YAxis
                dataKey="accountName"
                type="category"
                width={120}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(_, __, item) => {
                      const payload = item.payload as {
                        accountName: string;
                        share: number;
                        balanceAbs: number;
                        rawBalance: number;
                      };

                      return (
                        <div className="flex min-w-[11rem] items-center justify-between gap-2">
                          <span className="text-muted-foreground">{payload.accountName}</span>
                          <div className="text-right">
                            <p className="font-mono font-medium tabular-nums">
                              {payload.share.toFixed(1)}%
                            </p>
                            <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
                              {formatCompactCurrency(payload.rawBalance, currency)}
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey="share"
                fill="var(--color-share)"
                radius={4}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
