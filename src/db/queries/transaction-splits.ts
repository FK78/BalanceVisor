import { db } from '@/index';
import { transactionSplitsTable, categoriesTable } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

const splitSelect = {
  id: transactionSplitsTable.id,
  transaction_id: transactionSplitsTable.transaction_id,
  category_id: transactionSplitsTable.category_id,
  categoryName: categoriesTable.name,
  categoryColor: categoriesTable.color,
  amount: transactionSplitsTable.amount,
  description: transactionSplitsTable.description,
};

export async function getSplitsForTransaction(transactionId: string) {
  return await db
    .select(splitSelect)
    .from(transactionSplitsTable)
    .leftJoin(categoriesTable, eq(transactionSplitsTable.category_id, categoriesTable.id))
    .where(eq(transactionSplitsTable.transaction_id, transactionId));
}

export async function getSplitsForTransactions(transactionIds: string[]) {
  if (transactionIds.length === 0) return new Map<string, SplitRow[]>();

  const rows = await db
    .select(splitSelect)
    .from(transactionSplitsTable)
    .leftJoin(categoriesTable, eq(transactionSplitsTable.category_id, categoriesTable.id))
    .where(inArray(transactionSplitsTable.transaction_id, transactionIds));

  const map = new Map<string, SplitRow[]>();
  for (const row of rows) {
    const existing = map.get(row.transaction_id) ?? [];
    existing.push(row);
    map.set(row.transaction_id, existing);
  }
  return map;
}

export type SplitRow = Awaited<ReturnType<typeof getSplitsForTransaction>>[number];
