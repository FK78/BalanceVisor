import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { getTrading212Connection, getManualHoldings } from "@/db/queries/investments";
import { getT212AccountSummary, getT212Positions, type T212Position } from "@/lib/trading212";
import { getQuotes } from "@/lib/yahoo-finance";
import { decrypt } from "@/lib/encryption";
import { formatCurrency } from "@/lib/formatCurrency";
import { ConnectTrading212Dialog } from "@/components/ConnectTrading212Dialog";
import { AddHoldingDialog } from "@/components/AddHoldingDialog";
import { DeleteHoldingButton } from "@/components/DeleteHoldingButton";
import { RefreshPricesButton } from "@/components/RefreshPricesButton";
import { InvestmentCharts } from "@/components/InvestmentCharts";

type NormalisedHolding = {
  id: string;
  source: "trading212" | "manual";
  ticker: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency: string;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  manualId?: string;
};

export default async function InvestmentsPage() {
  const userId = await getCurrentUserId();

  const [t212Connection, manualHoldings, baseCurrency] = await Promise.all([
    getTrading212Connection(userId),
    getManualHoldings(userId),
    getUserBaseCurrency(userId),
  ]);

  const isT212Connected = !!t212Connection;

  // Fetch Trading 212 data
  let t212Positions: T212Position[] = [];
  let t212Cash = 0;
  let t212Error: string | null = null;

  if (isT212Connected) {
    try {
      const apiKey = decrypt(t212Connection.api_key_encrypted);
      const [summary, positions] = await Promise.all([
        getT212AccountSummary(apiKey, t212Connection.environment),
        getT212Positions(apiKey, t212Connection.environment),
      ]);
      t212Positions = positions;
      t212Cash = summary.cash.availableToTrade;
    } catch (e) {
      t212Error = e instanceof Error ? e.message : "Failed to fetch Trading 212 data";
    }
  }

  // Refresh stale manual holding prices (>15 min old)
  const now = new Date();
  const staleTickers = manualHoldings
    .filter((h) => {
      if (!h.last_price_update) return true;
      const age = now.getTime() - new Date(h.last_price_update).getTime();
      return age > 15 * 60 * 1000;
    })
    .map((h) => h.ticker);

  const freshQuotes = staleTickers.length > 0 ? await getQuotes(staleTickers) : new Map();

  // Normalise all holdings into a unified list
  const holdings: NormalisedHolding[] = [];

  // T212 positions
  for (const pos of t212Positions) {
    const avgPrice = parseFloat(String(pos.averagePricePaid));
    const cost = avgPrice * pos.quantity;
    const value = pos.walletImpact?.currentValue ?? pos.currentPrice * pos.quantity;
    const gainLoss = pos.walletImpact?.profitLoss ?? value - cost;
    const gainLossPercent =
      pos.walletImpact?.profitLossPercent ?? (cost > 0 ? (gainLoss / cost) * 100 : 0);

    holdings.push({
      id: `t212-${pos.instrument.ticker}`,
      source: "trading212",
      ticker: pos.instrument.ticker,
      name: pos.instrument.name ?? pos.instrument.shortName ?? pos.instrument.ticker,
      quantity: pos.quantity,
      averagePrice: avgPrice,
      currentPrice: pos.currentPrice,
      currency: pos.instrument.currencyCode ?? baseCurrency,
      value,
      gainLoss,
      gainLossPercent,
    });
  }

  // Manual holdings
  for (const h of manualHoldings) {
    const quote = freshQuotes.get(h.ticker);
    const currentPrice = quote?.currentPrice ?? h.current_price ?? h.average_price;
    const value = currentPrice * h.quantity;
    const cost = h.average_price * h.quantity;
    const gainLoss = value - cost;
    const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0;

    holdings.push({
      id: `manual-${h.id}`,
      source: "manual",
      ticker: h.ticker,
      name: h.name,
      quantity: h.quantity,
      averagePrice: h.average_price,
      currentPrice,
      currency: h.currency,
      value,
      gainLoss,
      gainLossPercent,
      manualId: h.id,
    });
  }

  // Totals
  const totalInvestmentValue = holdings.reduce((s, h) => s + h.value, 0) + t212Cash;
  const totalCost =
    holdings.reduce((s, h) => s + h.averagePrice * h.quantity, 0);
  const totalGainLoss = holdings.reduce((s, h) => s + h.gainLoss, 0);
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Investments</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your portfolio across Trading 212 and manual holdings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConnectTrading212Dialog isConnected={isT212Connected} />
          <AddHoldingDialog />
          {manualHoldings.length > 0 && <RefreshPricesButton />}
        </div>
      </div>

      {/* Error banner */}
      {t212Error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Trading 212 sync failed</p>
              <p className="text-xs text-muted-foreground">{t212Error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Total Value
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <DollarSign className="text-muted-foreground h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">
              {formatCurrency(totalInvestmentValue, baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
              {t212Cash > 0 && ` + ${formatCurrency(t212Cash, baseCurrency)} cash`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Total Gain / Loss
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle
              className={`text-2xl ${totalGainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {totalGainLoss >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(totalGainLoss), baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {totalGainLossPercent >= 0 ? "+" : ""}
              {totalGainLossPercent.toFixed(2)}% overall return
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Total Invested
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <BarChart3 className="text-muted-foreground h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">
              {formatCurrency(totalCost, baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Cost basis across all holdings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {holdings.length > 0 && (
        <InvestmentCharts holdings={sortedHoldings} currency={baseCurrency} />
      )}

      {/* Holdings table */}
      {holdings.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Wallet className="h-10 w-10 opacity-40" />
            <div>
              <p className="text-sm font-medium text-foreground">No investments yet</p>
              <p className="text-xs">
                Connect Trading 212 or add holdings manually to start tracking.
              </p>
            </div>
            <div className="flex gap-2">
              <ConnectTrading212Dialog isConnected={false} />
              <AddHoldingDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>
              {(() => {
                const t212Count = holdings.filter((h) => h.source === "trading212").length;
                const manualCount = holdings.filter((h) => h.source === "manual").length;
                return [
                  t212Count > 0 && `${t212Count} from Trading 212`,
                  manualCount > 0 && `${manualCount} manual`,
                ].filter(Boolean).join(" · ");
              })()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holding</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Gain / Loss</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{h.ticker}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {h.name}
                          </p>
                        </div>
                        <Badge
                          variant={h.source === "trading212" ? "default" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {h.source === "trading212" ? "T212" : "Manual"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {h.quantity.toFixed(h.quantity % 1 === 0 ? 0 : 4)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(h.averagePrice, h.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(h.currentPrice, h.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(h.value, baseCurrency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`tabular-nums text-sm font-medium ${
                          h.gainLoss >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {h.gainLoss >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(h.gainLoss), baseCurrency)}
                      </span>
                      <p
                        className={`text-xs ${
                          h.gainLossPercent >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {h.gainLossPercent >= 0 ? "+" : ""}
                        {h.gainLossPercent.toFixed(2)}%
                      </p>
                    </TableCell>
                    <TableCell>
                      {h.source === "manual" && h.manualId && (
                        <div className="flex items-center gap-1 justify-end">
                          <AddHoldingDialog
                            holding={{
                              id: h.manualId,
                              ticker: h.ticker,
                              name: h.name,
                              quantity: h.quantity,
                              average_price: h.averagePrice,
                            }}
                          />
                          <DeleteHoldingButton
                            holding={{
                              id: h.manualId,
                              ticker: h.ticker,
                              name: h.name,
                            }}
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
