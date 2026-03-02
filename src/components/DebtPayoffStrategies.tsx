"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatCurrency";
import { Mountain, Snowflake, CalendarCheck, TrendingDown, Info } from "lucide-react";

type Debt = {
  id: string;
  name: string;
  remaining_amount: number;
  interest_rate: number;
  minimum_payment: number;
  color: string;
};

type Strategy = "avalanche" | "snowball";

type MonthSnapshot = {
  month: number;
  label: string;
  totalRemaining: number;
  totalInterest: number;
  byDebt: Record<string, number>;
};

type PayoffResult = {
  months: number;
  totalInterest: number;
  snapshots: MonthSnapshot[];
  payoffOrder: { id: string; name: string; month: number }[];
};

const MAX_MONTHS = 360; // 30 years cap

function simulatePayoff(
  debts: Debt[],
  monthlyBudget: number,
  strategy: Strategy,
): PayoffResult {
  if (debts.length === 0) {
    return { months: 0, totalInterest: 0, snapshots: [], payoffOrder: [] };
  }

  // Working balances
  const balances = new Map<string, number>();
  for (const d of debts) balances.set(d.id, d.remaining_amount);

  const monthlyRates = new Map<string, number>();
  for (const d of debts) monthlyRates.set(d.id, d.interest_rate / 100 / 12);

  const minPayments = new Map<string, number>();
  for (const d of debts) minPayments.set(d.id, d.minimum_payment);

  const snapshots: MonthSnapshot[] = [];
  const payoffOrder: { id: string; name: string; month: number }[] = [];
  let totalInterestPaid = 0;
  let month = 0;

  // Initial snapshot
  const initialByDebt: Record<string, number> = {};
  for (const d of debts) initialByDebt[d.id] = d.remaining_amount;
  snapshots.push({
    month: 0,
    label: "Now",
    totalRemaining: debts.reduce((s, d) => s + d.remaining_amount, 0),
    totalInterest: 0,
    byDebt: initialByDebt,
  });

  const activeIds = new Set(debts.map((d) => d.id));

  while (activeIds.size > 0 && month < MAX_MONTHS) {
    month++;

    // 1. Apply interest
    for (const id of activeIds) {
      const balance = balances.get(id)!;
      const rate = monthlyRates.get(id)!;
      const interest = balance * rate;
      totalInterestPaid += interest;
      balances.set(id, balance + interest);
    }

    // 2. Pay minimums first
    let budgetLeft = monthlyBudget;
    for (const id of activeIds) {
      const balance = balances.get(id)!;
      const minPay = Math.min(minPayments.get(id)!, balance, budgetLeft);
      balances.set(id, balance - minPay);
      budgetLeft -= minPay;
    }

    // 3. Apply extra to priority debt
    if (budgetLeft > 0) {
      const sortedActive = [...activeIds].sort((a, b) => {
        const debtA = debts.find((d) => d.id === a)!;
        const debtB = debts.find((d) => d.id === b)!;
        if (strategy === "avalanche") {
          return debtB.interest_rate - debtA.interest_rate;
        }
        return (balances.get(a) ?? 0) - (balances.get(b) ?? 0);
      });

      for (const id of sortedActive) {
        if (budgetLeft <= 0) break;
        const balance = balances.get(id)!;
        const extraPay = Math.min(balance, budgetLeft);
        balances.set(id, balance - extraPay);
        budgetLeft -= extraPay;
      }
    }

    // 4. Check for paid-off debts
    for (const id of [...activeIds]) {
      if ((balances.get(id) ?? 0) <= 0.01) {
        balances.set(id, 0);
        activeIds.delete(id);
        const debt = debts.find((d) => d.id === id)!;
        payoffOrder.push({ id, name: debt.name, month });
      }
    }

    // 5. Snapshot (every month for first 24, then quarterly)
    if (month <= 24 || month % 3 === 0 || activeIds.size === 0) {
      const byDebt: Record<string, number> = {};
      let totalRemaining = 0;
      for (const d of debts) {
        const bal = Math.max(balances.get(d.id) ?? 0, 0);
        byDebt[d.id] = bal;
        totalRemaining += bal;
      }

      const years = Math.floor(month / 12);
      const remainingMonths = month % 12;
      const label = years > 0
        ? `${years}y ${remainingMonths}m`
        : `${month}m`;

      snapshots.push({
        month,
        label,
        totalRemaining,
        totalInterest: totalInterestPaid,
        byDebt,
      });
    }
  }

  return {
    months: month,
    totalInterest: totalInterestPaid,
    snapshots,
    payoffOrder,
  };
}

export function DebtPayoffStrategies({
  debts,
  totalMinimumPayment,
  currency,
}: {
  debts: Debt[];
  totalMinimumPayment: number;
  currency: string;
}) {
  const activeDebts = debts.filter((d) => d.remaining_amount > 0);
  const defaultBudget = Math.max(totalMinimumPayment, 1);
  const [extraPayment, setExtraPayment] = useState(0);
  const monthlyBudget = defaultBudget + extraPayment;

  const avalanche = useMemo(
    () => simulatePayoff(activeDebts, monthlyBudget, "avalanche"),
    [activeDebts, monthlyBudget],
  );

  const snowball = useMemo(
    () => simulatePayoff(activeDebts, monthlyBudget, "snowball"),
    [activeDebts, monthlyBudget],
  );

  const minimumOnly = useMemo(
    () => simulatePayoff(activeDebts, defaultBudget, "avalanche"),
    [activeDebts, defaultBudget],
  );

  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>("avalanche");
  const selected = selectedStrategy === "avalanche" ? avalanche : snowball;

  if (activeDebts.length < 2) return null;

  const interestSavedVsMinimum = minimumOnly.totalInterest - selected.totalInterest;
  const monthsSavedVsMinimum = minimumOnly.months - selected.months;

  // Chart config for stacked area
  const chartConfig = Object.fromEntries(
    activeDebts.map((d) => [
      String(d.id),
      { label: d.name, color: d.color },
    ]),
  ) as ChartConfig;

  function formatMonths(m: number) {
    const years = Math.floor(m / 12);
    const months = m % 12;
    if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
    if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
    return `${years}y ${months}m`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Payoff Strategies</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Compare strategies to find the fastest, cheapest way to become debt-free.
        </p>
      </div>

      {/* Monthly budget control */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Label htmlFor="extra-payment">Extra Monthly Payment</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="extra-payment"
                  type="number"
                  min={0}
                  step={10}
                  value={extraPayment || ""}
                  onChange={(e) => setExtraPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  on top of {formatCurrency(defaultBudget, currency)} minimums
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Monthly Budget</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(monthlyBudget, currency)}/mo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy comparison cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Avalanche */}
        <Card
          className={`cursor-pointer transition-all ${
            selectedStrategy === "avalanche"
              ? "ring-2 ring-primary"
              : "hover:border-primary/30"
          }`}
          onClick={() => setSelectedStrategy("avalanche")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
                  <Mountain className="h-4.5 w-4.5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Avalanche</CardTitle>
                  <CardDescription className="text-xs">Highest interest first</CardDescription>
                </div>
              </div>
              {selectedStrategy === "avalanche" && (
                <Badge>Selected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Debt-free in</p>
                <p className="text-lg font-bold tabular-nums">{formatMonths(avalanche.months)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Interest</p>
                <p className="text-lg font-bold tabular-nums text-red-600">
                  {formatCurrency(avalanche.totalInterest, currency)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
              <Info className="h-3 w-3 shrink-0" />
              <span>Saves the most on interest — mathematically optimal.</span>
            </div>
          </CardContent>
        </Card>

        {/* Snowball */}
        <Card
          className={`cursor-pointer transition-all ${
            selectedStrategy === "snowball"
              ? "ring-2 ring-primary"
              : "hover:border-primary/30"
          }`}
          onClick={() => setSelectedStrategy("snowball")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
                  <Snowflake className="h-4.5 w-4.5 text-sky-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Snowball</CardTitle>
                  <CardDescription className="text-xs">Smallest balance first</CardDescription>
                </div>
              </div>
              {selectedStrategy === "snowball" && (
                <Badge>Selected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Debt-free in</p>
                <p className="text-lg font-bold tabular-nums">{formatMonths(snowball.months)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Interest</p>
                <p className="text-lg font-bold tabular-nums text-red-600">
                  {formatCurrency(snowball.totalInterest, currency)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
              <Info className="h-3 w-3 shrink-0" />
              <span>Quick wins for motivation — pay off small debts first.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings vs minimum-only */}
      {extraPayment > 0 && (monthsSavedVsMinimum > 0 || interestSavedVsMinimum > 0) && (
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-400/5 border-emerald-500/15">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingDown className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Extra {formatCurrency(extraPayment, currency)}/mo saves you:
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              {monthsSavedVsMinimum > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Time Saved</p>
                  <p className="font-bold tabular-nums text-emerald-600">
                    {formatMonths(monthsSavedVsMinimum)}
                  </p>
                </div>
              )}
              {interestSavedVsMinimum > 1 && (
                <div>
                  <p className="text-xs text-muted-foreground">Interest Saved</p>
                  <p className="font-bold tabular-nums text-emerald-600">
                    {formatCurrency(interestSavedVsMinimum, currency)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payoff timeline chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payoff Timeline — {selectedStrategy === "avalanche" ? "Avalanche" : "Snowball"}
          </CardTitle>
          <CardDescription>
            How your debt balances decrease over time with this strategy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <AreaChart data={selected.snapshots} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
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
              {activeDebts.map((d) => (
                <Area
                  key={d.id}
                  type="monotone"
                  dataKey={`byDebt.${d.id}`}
                  name={d.name}
                  stackId="1"
                  fill={d.color}
                  stroke={d.color}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Payoff order */}
      <Card>
        <CardHeader>
          <CardTitle>Payoff Order</CardTitle>
          <CardDescription>
            The sequence your debts get eliminated using the {selectedStrategy} strategy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selected.payoffOrder.map((item, i) => {
              const debt = activeDebts.find((d) => d.id === item.id);
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {i + 1}
                  </span>
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: debt?.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item.name}</span>
                    {debt && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatCurrency(debt.remaining_amount, currency)} at {debt.interest_rate}%
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="tabular-nums font-medium">{formatMonths(item.month)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
