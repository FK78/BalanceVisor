import { redirect } from "next/navigation";
import {
  getDailyExpenseByCategory,
  getDailyIncomeExpenseTrend,
  getTransactionsCount,
  getTransactionsWithDetailsPaginated,
  getTotalsByType,
  searchTransactions,
} from "@/db/queries/transactions";
import { getAccountsWithDetails } from "@/db/queries/accounts";
import { getCategoriesByUser } from "@/db/queries/categories";
import { getSplitsForTransactions } from "@/db/queries/transaction-splits";
import { TransactionsClient } from "@/components/TransactionsClient";
import { getCurrentUserId } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";

const PAGE_SIZE = 10;

function normalizePage(value?: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function Transactions({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; startDate?: string; endDate?: string; search?: string; account?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestedPage = normalizePage(resolvedSearchParams?.page);
  const startDate = normalizeDate(resolvedSearchParams?.startDate);
  const endDate = normalizeDate(resolvedSearchParams?.endDate);
  const search = resolvedSearchParams?.search?.trim() || undefined;
  const accountId = resolvedSearchParams?.account || undefined;
  const userId = await getCurrentUserId();

  let transactions;
  let totalTransactions: number;
  let totalIncome: number;
  let totalExpenses: number;

  if (search) {
    const result = await searchTransactions(userId, search, requestedPage, PAGE_SIZE, startDate, endDate, accountId);
    transactions = result.transactions;
    totalTransactions = result.totalCount;
    totalIncome = result.totalIncome;
    totalExpenses = result.totalExpenses;
  } else {
    [transactions, totalTransactions, totalIncome, totalExpenses] = await Promise.all([
      getTransactionsWithDetailsPaginated(userId, requestedPage, PAGE_SIZE, startDate, endDate, accountId),
      getTransactionsCount(userId, startDate, endDate, accountId),
      getTotalsByType(userId, 'income', startDate, endDate, accountId),
      getTotalsByType(userId, 'expense', startDate, endDate, accountId),
    ]);
  }

  const [accounts, categories, dailyTrend, dailyCategoryExpenses, baseCurrency] = await Promise.all([
    getAccountsWithDetails(userId),
    getCategoriesByUser(userId),
    getDailyIncomeExpenseTrend(userId, 90),
    getDailyExpenseByCategory(userId, 90),
    getUserBaseCurrency(userId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalTransactions / PAGE_SIZE));

  if (totalTransactions > 0 && requestedPage > totalPages) {
    const params = new URLSearchParams();
    if (totalPages > 1) params.set("page", String(totalPages));
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (search) params.set("search", search);
    if (accountId) params.set("account", accountId);
    const qs = params.toString();
    redirect(`/dashboard/transactions${qs ? `?${qs}` : ""}`);
  }

  // Fetch splits for any split transactions on this page
  const splitTxnIds = transactions.filter((t) => t.is_split).map((t) => t.id);
  const splitsMap = await getSplitsForTransactions(splitTxnIds);
  const serializedSplits: Record<string, { id: string; category_id: string | null; categoryName: string | null; categoryColor: string | null; amount: number; description: string | null }[]> = {};
  for (const [txnId, rows] of splitsMap) {
    serializedSplits[txnId] = rows;
  }

  return (
    <TransactionsClient
      transactions={transactions}
      accounts={accounts}
      categories={categories}
      currentPage={requestedPage}
      pageSize={PAGE_SIZE}
      totalTransactions={totalTransactions}
      totalIncome={totalIncome}
      totalExpenses={totalExpenses}
      startDate={startDate}
      endDate={endDate}
      search={search}
      accountId={accountId}
      dailyTrend={dailyTrend}
      dailyCategoryExpenses={dailyCategoryExpenses}
      currency={baseCurrency}
      splits={serializedSplits}
    />
  );
}
