import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  DollarSign,
  PiggyBank,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getAccountsWithDetails, getSharedAccounts } from "@/db/queries/accounts";
import { AccountFormDialog } from "@/components/AddAccountForm";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { ConnectBankButton } from "@/components/ConnectBankButton";
import { ShareDialog } from "@/components/ShareDialog";
import { PendingInvitations } from "@/components/PendingInvitations";
import { formatCurrency } from "@/lib/formatCurrency";
import { getCurrentUserId, getCurrentUserEmail } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { getSharesByOwner, getPendingInvitations } from "@/db/queries/sharing";
import { AccountCharts } from "@/components/AccountCharts";
import { getTrueLayerConnections } from "@/db/mutations/truelayer";
import { getManualHoldings, getTrading212Connection } from "@/db/queries/investments";
import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";

const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  currentAccount: { label: "Current Account", variant: "secondary" },
  savings: { label: "Savings", variant: "default" },
  creditCard: { label: "Credit Card", variant: "destructive" },
  investment: { label: "Investment", variant: "outline" },
};

export const typeIcons: Record<string, typeof Wallet> = {
  currentAccount: Wallet,
  savings: PiggyBank,
  creditCard: CreditCard,
  investment: TrendingUp,
};

export default async function Accounts() {
  const userId = await getCurrentUserId();

  const email = await getCurrentUserEmail();

  const [ownedAccounts, sharedAccounts, baseCurrency, truelayerConnections, manualHoldings, t212Connection, pendingInvitations] = await Promise.all([
    getAccountsWithDetails(userId),
    getSharedAccounts(userId, email),
    getUserBaseCurrency(userId),
    getTrueLayerConnections(),
    getManualHoldings(userId),
    getTrading212Connection(userId),
    getPendingInvitations(userId, email),
  ]);

  const allShares = await getSharesByOwner(userId);

  const accounts = [...ownedAccounts, ...sharedAccounts];
  const accountPendingInvitations = pendingInvitations.filter(i => i.resource_type === "account");

  // Build shares map: accountId -> shares[]
  const accountSharesMap = new Map<string, typeof allShares>();
  for (const share of allShares) {
    if (share.resource_type !== "account") continue;
    const existing = accountSharesMap.get(share.resource_id) ?? [];
    existing.push(share);
    accountSharesMap.set(share.resource_id, existing);
  }

  // Build a map of account_id -> count of linked investments
  const investmentCountByAccount = new Map<string, { manual: number; t212: boolean }>();
  for (const h of manualHoldings) {
    if (h.account_id) {
      const existing = investmentCountByAccount.get(h.account_id) ?? { manual: 0, t212: false };
      existing.manual++;
      investmentCountByAccount.set(h.account_id, existing);
    }
  }
  if (t212Connection?.account_id) {
    const existing = investmentCountByAccount.get(t212Connection.account_id) ?? { manual: 0, t212: false };
    existing.t212 = true;
    investmentCountByAccount.set(t212Connection.account_id, existing);
  }

  const liabilityTypes = new Set(["creditCard"]);
  const totalAssets = accounts
    .filter((a) => !liabilityTypes.has(a.type ?? ""))
    .reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => liabilityTypes.has(a.type ?? ""))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const totalBalance = totalAssets - totalLiabilities;
  const totalAbsolute = accounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between page-header-gradient">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage and monitor all your linked accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <ConnectBankButton connections={truelayerConnections} />
          <AccountFormDialog />
        </div>
      </div>

      {accountPendingInvitations.length > 0 && (
        <PendingInvitations invitations={accountPendingInvitations} />
      )}

      {/* Summary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BlurFade delay={0} inView><Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Net Worth
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
              <DollarSign className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-2xl ${totalBalance < 0 ? "text-red-600" : ""}`}>
              {totalBalance < 0 ? "−" : ""}{formatCurrency(totalBalance, baseCurrency)}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Across {accounts.length} accounts
            </p>
          </CardContent>
        </Card></BlurFade>
        <BlurFade delay={0.05} inView><Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Total Assets
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-2xl ${totalAssets < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {totalAssets < 0 ? "−" : ""}{formatCurrency(totalAssets, baseCurrency)}
            </CardTitle>
          </CardContent>
        </Card></BlurFade>
        <BlurFade delay={0.1} inView><Card className="summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-semibold">
              Total Liabilities
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <CreditCard className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(totalLiabilities, baseCurrency)}
            </CardTitle>
          </CardContent>
        </Card></BlurFade>
      </div>

      {accounts.length > 0 && (
        <AccountCharts accounts={accounts} currency={baseCurrency} />
      )}

      {/* Account cards */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Wallet className="h-10 w-10 opacity-40" />
            <div>
              <p className="text-sm font-medium text-foreground">No accounts yet</p>
              <p className="text-xs">Create your first account to start tracking balances.</p>
            </div>
            <AccountFormDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {accounts.map((account) => {
            const config = typeConfig[account.type ?? ""] ?? {
              label: account.type,
              variant: "secondary" as const,
            };
            return (
              <Card key={account.id} className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/8 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                      {(() => { const Icon = typeIcons[account.type ?? ""] ?? Wallet; return <Icon className="text-primary h-5 w-5" />; })()}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        <Link
                          href={`/dashboard/transactions?account=${account.id}`}
                          className="hover:underline"
                        >
                          {account.accountName}
                        </Link>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        <Link
                          href={`/dashboard/transactions?account=${account.id}`}
                          className="hover:underline"
                        >
                          {account.transactions} transactions
                        </Link>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    {account.isShared && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Users className="h-3 w-3" />
                        Shared
                      </Badge>
                    )}
                    {!account.isShared && (
                      <ShareDialog
                        resourceType="account"
                        resourceId={account.id}
                        resourceName={account.accountName}
                        existingShares={(accountSharesMap.get(account.id) ?? []).map(s => ({
                          id: s.id,
                          shared_with_email: s.shared_with_email,
                          permission: s.permission,
                          status: s.status,
                        }))}
                      />
                    )}
                    {!account.isShared && <AccountFormDialog account={account} />}
                    {!account.isShared && <DeleteAccountButton account={account} />}
                  </div>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/dashboard/transactions?account=${account.id}`}
                    className={`text-2xl font-bold tabular-nums hover:underline ${account.balance >= 0 ? "text-foreground" : "text-red-600"
                      }`}
                  >
                    {account.balance < 0 ? "−" : ""}
                    {formatCurrency(account.balance, baseCurrency)}
                  </Link>
                  {/* Linked investments for investment accounts */}
                  {account.type === "investment" && investmentCountByAccount.has(account.id) && (() => {
                    const info = investmentCountByAccount.get(account.id)!;
                    const parts: string[] = [];
                    if (info.t212) parts.push("Trading 212");
                    if (info.manual > 0) parts.push(`${info.manual} manual holding${info.manual !== 1 ? "s" : ""}`);
                    return (
                      <Link
                        href="/dashboard/investments"
                        className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <TrendingUp className="h-3 w-3" />
                        {parts.join(" · ")}
                      </Link>
                    );
                  })()}

                  {/* Balance bar relative to total assets */}
                  <div className="mt-3">
                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full transition-all ${account.balance >= 0 ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        style={{
                          width: `${totalAbsolute > 0 ? Math.min(
                            (Math.abs(account.balance) / totalAbsolute) * 100,
                            100
                          ) : 0}%`,
                        }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {totalAbsolute > 0 ? ((Math.abs(account.balance) / totalAbsolute) * 100).toFixed(
                        1
                      ) : "0.0"}
                      % of total
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
