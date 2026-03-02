import { db } from '@/index';
import { transactionsTable, categoriesTable, accountsTable } from '@/db/schema';
import { and, eq, isNotNull, desc } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export type RecurringTransaction = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | null;
  recurring_pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null;
  next_recurring_date: string | null;
  date: string | null;
  account_id: string | null;
  accountName: string;
  category: string | null;
  category_id: string | null;
  categoryColor: string | null;
};

export async function getRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
  const rows = await db
    .select({
      id: transactionsTable.id,
      description: transactionsTable.description,
      amount: transactionsTable.amount,
      type: transactionsTable.type,
      recurring_pattern: transactionsTable.recurring_pattern,
      next_recurring_date: transactionsTable.next_recurring_date,
      date: transactionsTable.date,
      account_id: transactionsTable.account_id,
      accountName: accountsTable.name,
      category: categoriesTable.name,
      category_id: transactionsTable.category_id,
      categoryColor: categoriesTable.color,
    })
    .from(transactionsTable)
    .innerJoin(accountsTable, eq(transactionsTable.account_id, accountsTable.id))
    .leftJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
    .where(
      and(
        eq(accountsTable.user_id, userId),
        eq(transactionsTable.is_recurring, true),
        isNotNull(transactionsTable.recurring_pattern),
      )
    )
    .orderBy(desc(transactionsTable.next_recurring_date));

  return rows.map((row) => ({
    ...row,
    description: row.description ? decrypt(row.description) : '',
    accountName: row.accountName ? decrypt(row.accountName) : '',
  }));
}

export async function getRecurringTransactionsSummary(userId: string) {
  const recurring = await getRecurringTransactions(userId);

  const today = new Date().toISOString().split('T')[0];
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const next7Str = next7.toISOString().split('T')[0];

  const upcoming = recurring.filter(
    (r) => r.next_recurring_date && r.next_recurring_date >= today && r.next_recurring_date <= next7Str
  );

  return {
    recurring,
    totalCount: recurring.length,
    incomeCount: recurring.filter((r) => r.type === 'income').length,
    expenseCount: recurring.filter((r) => r.type === 'expense').length,
    monthlyExpenses: recurring
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + toMonthlyEquivalent(r.amount, r.recurring_pattern), 0),
    monthlyIncome: recurring
      .filter((r) => r.type === 'income')
      .reduce((s, r) => s + toMonthlyEquivalent(r.amount, r.recurring_pattern), 0),
    upcomingCount: upcoming.length,
  };
}

export function toMonthlyEquivalent(
  amount: number,
  pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null,
): number {
  switch (pattern) {
    case 'daily': return amount * 30;
    case 'weekly': return amount * (52 / 12);
    case 'biweekly': return amount * (26 / 12);
    case 'monthly': return amount;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}
