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
  Folder,
} from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { getTrading212Connection, getManualHoldings } from "@/db/queries/investments";
import { getAccountsWithDetails } from "@/db/queries/accounts";
import { getGroupsByUser } from "@/db/queries/investment-groups";
import { getT212AccountSummary, getT212Positions, type T212Position } from "@/lib/trading212";
import { getQuotes } from "@/lib/yahoo-finance";
import { decrypt } from "@/lib/encryption";
import { formatCurrency } from "@/lib/formatCurrency";
import { ConnectTrading212Dialog } from "@/components/ConnectTrading212Dialog";
import { AddHoldingDialog } from "@/components/AddHoldingDialog";
import { DeleteHoldingButton } from "@/components/DeleteHoldingButton";
import { RefreshPricesButton } from "@/components/RefreshPricesButton";
import { InvestmentCharts } from "@/components/InvestmentCharts";
import { InvestmentGroupDialog } from "@/components/InvestmentGroupDialog";
import { DeleteGroupButton } from "@/components/DeleteGroupButton";

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
  accountId?: string | null;
  accountName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  groupColor?: string | null;
};

export default async function InvestmentsPage() {
  const userId = await getCurrentUserId();

  const [t212Connection, manualHoldings, baseCurrency, allAccounts, allGroups] = await Promise.all([
    getTrading212Connection(userId),
    getManualHoldings(userId),
    getUserBaseCurrency(userId),
    getAccountsWithDetails(userId),
    getGroupsByUser(userId),
  ]);

  const groupMap = new Map(allGroups.map((g) => [g.id, g]));
  const groupOptions = allGroups.map((g) => ({ id: g.id, name: g.name, color: g.color, account_id: g.account_id }));

  const investmentAccounts = allAccounts
    .filter((a) => a.type === "investment")
    .map((a) => ({ id: a.id, accountName: a.accountName }));

  const t212AccountName = t212Connection?.account_id
    ? investmentAccounts.find((a) => a.id === t212Connection.account_id)?.accountName ?? null
    : null;

  const isT212Connected = !!t212Connection;

  // Fetch Trading 212 data
  let t212Positions: T212Position[] = [];
  let t212Cash = 0;
  let t212Error: string | null = null;

  if (isT212Connected) {
    try {
      const apiKey = decrypt(t212Connection.api_key_encrypted);
      const apiSecret = decrypt(t212Connection.api_secret_encrypted);
      const [summary, positions] = await Promise.all([
        getT212AccountSummary(apiKey, apiSecret, t212Connection.environment),
        getT212Positions(apiKey, apiSecret, t212Connection.environment),
      ]);
      t212Positions = positions;
      t212Cash = summary.cash.availableToTrade;
    } catch {
      t212Error = "Unable to sync your Trading 212 data right now. Try again later or reconnect your account.";
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
      accountId: t212Connection?.account_id,
      accountName: t212AccountName,
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
      accountId: h.account_id,
      accountName: h.accountName,
      groupId: h.group_id,
      groupName: h.group_id ? groupMap.get(h.group_id)?.name ?? null : null,
      groupColor: h.group_id ? groupMap.get(h.group_id)?.color ?? null : null,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between page-header-gradient">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Investments</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your portfolio across Trading 212 and manual holdings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConnectTrading212Dialog
            isConnected={isT212Connected}
            investmentAccounts={investmentAccounts}
            currentAccountId={t212Connection?.account_id}
          />
          <InvestmentGroupDialog investmentAccounts={investmentAccounts} />
          <AddHoldingDialog investmentAccounts={investmentAccounts} groups={groupOptions} />
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
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Total Value
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
              <DollarSign className="text-primary h-4 w-4" />
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
        <Card className="summary-card">
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
        <Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Total Invested
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/30">
              <BarChart3 className="text-cyan-500 h-4 w-4" />
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
              <ConnectTrading212Dialog isConnected={false} investmentAccounts={investmentAccounts} />
              <AddHoldingDialog investmentAccounts={investmentAccounts} groups={groupOptions} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Group by account */}
          {(() => {
            // Build hierarchy: account -> groups -> holdings
            type AccountSection = {
              accountId: string | null;
              accountName: string | null;
              groups: { group: typeof allGroups[number] | null; holdings: NormalisedHolding[] }[];
            };

            // Collect unique account IDs from holdings
            const accountIds = [...new Set(sortedHoldings.map((h) => h.accountId ?? "__none__"))];
            const sections: AccountSection[] = accountIds.map((aid) => {
              const accountHoldings = sortedHoldings.filter(
                (h) => (h.accountId ?? "__none__") === aid
              );
              const acctName = accountHoldings[0]?.accountName ?? null;
              const realAid = aid === "__none__" ? null : aid;

              // Groups within this account
              const accountGroups = allGroups.filter(
                (g) => g.account_id === realAid
              );

              const groupSections: AccountSection["groups"] = [];

              for (const group of accountGroups) {
                const groupHoldings = accountHoldings.filter(
                  (h) => h.groupId === group.id
                );
                if (groupHoldings.length > 0) {
                  groupSections.push({ group, holdings: groupHoldings });
                } else {
                  // Show empty group so user can see it
                  groupSections.push({ group, holdings: [] });
                }
              }

              // Ungrouped holdings
              const ungrouped = accountHoldings.filter(
                (h) => !h.groupId || !accountGroups.some((g) => g.id === h.groupId)
              );
              if (ungrouped.length > 0) {
                groupSections.push({ group: null, holdings: ungrouped });
              }

              return { accountId: realAid, accountName: acctName, groups: groupSections };
            });

            return sections.map((section) => (
              <Card key={section.accountId ?? "unlinked"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {section.accountName ?? "Unlinked Holdings"}
                      </CardTitle>
                      <CardDescription>
                        {section.groups.reduce((s, g) => s + g.holdings.length, 0)} holding{section.groups.reduce((s, g) => s + g.holdings.length, 0) !== 1 ? "s" : ""}
                        {section.groups.filter((g) => g.group).length > 0 &&
                          ` · ${section.groups.filter((g) => g.group).length} group${section.groups.filter((g) => g.group).length !== 1 ? "s" : ""}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {section.groups.map((gs) => (
                    <div key={gs.group?.id ?? "ungrouped"}>
                      {/* Group header */}
                      {gs.group ? (
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-lg"
                              style={{ backgroundColor: gs.group.color + "20" }}
                            >
                              <Folder className="h-3.5 w-3.5" style={{ color: gs.group.color }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{gs.group.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {gs.holdings.length} holding{gs.holdings.length !== 1 ? "s" : ""}
                                {gs.holdings.length > 0 && (
                                  <> · {formatCurrency(gs.holdings.reduce((s, h) => s + h.value, 0), baseCurrency)} total</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <InvestmentGroupDialog
                              group={{ id: gs.group.id, name: gs.group.name, color: gs.group.color, account_id: gs.group.account_id }}
                              investmentAccounts={investmentAccounts}
                            />
                            <DeleteGroupButton group={{ id: gs.group.id, name: gs.group.name }} />
                          </div>
                        </div>
                      ) : section.groups.some((g) => g.group) ? (
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-muted-foreground">Individual Holdings</p>
                        </div>
                      ) : null}

                      {/* Holdings table for this group */}
                      {gs.holdings.length > 0 ? (
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
                            {gs.holdings.map((h) => (
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
                                          account_id: h.accountId,
                                          group_id: h.groupId,
                                        }}
                                        investmentAccounts={investmentAccounts}
                                        groups={groupOptions}
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
                      ) : gs.group ? (
                        <p className="text-xs text-muted-foreground italic py-2 pl-9">
                          No holdings in this group yet.
                        </p>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
