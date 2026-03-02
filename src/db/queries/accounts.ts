import { db } from '@/index'; // you'll create this shared db instance
import { transactionsTable, accountsTable, sharedAccessTable } from '@/db/schema';
import { eq, count, or, and, inArray } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export async function getAccountsWithDetails(userId: string) {
  const rows = await db.select({
    id: accountsTable.id,
    accountName: accountsTable.name,
    type: accountsTable.type,
    balance: accountsTable.balance,
    transactions: count(transactionsTable.id),
  })
    .from(accountsTable)
    .leftJoin(transactionsTable, eq(transactionsTable.account_id, accountsTable.id))
    .where(eq(accountsTable.user_id, userId))
    .groupBy(accountsTable.id, accountsTable.name, accountsTable.type, accountsTable.balance);
  return rows.map(row => ({ ...row, accountName: decrypt(row.accountName), isShared: false as boolean, sharedBy: null as string | null }));
}

export async function getSharedAccounts(userId: string, email: string) {
  // Get accepted shared account IDs
  const sharedRows = await db
    .select({
      resource_id: sharedAccessTable.resource_id,
      owner_id: sharedAccessTable.owner_id,
      shared_with_email: sharedAccessTable.shared_with_email,
    })
    .from(sharedAccessTable)
    .where(
      and(
        eq(sharedAccessTable.resource_type, "account"),
        eq(sharedAccessTable.status, "accepted"),
        or(
          eq(sharedAccessTable.shared_with_id, userId),
          eq(sharedAccessTable.shared_with_email, email),
        ),
      ),
    );

  if (sharedRows.length === 0) return [];

  const sharedAccountIds = sharedRows.map((r) => r.resource_id);
  const ownerMap = new Map(sharedRows.map((r) => [r.resource_id, r.owner_id]));

  const rows = await db
    .select({
      id: accountsTable.id,
      accountName: accountsTable.name,
      type: accountsTable.type,
      balance: accountsTable.balance,
      transactions: count(transactionsTable.id),
    })
    .from(accountsTable)
    .leftJoin(transactionsTable, eq(transactionsTable.account_id, accountsTable.id))
    .where(inArray(accountsTable.id, sharedAccountIds))
    .groupBy(accountsTable.id, accountsTable.name, accountsTable.type, accountsTable.balance);

  return rows.map((row) => ({
    ...row,
    accountName: decrypt(row.accountName),
    isShared: true as boolean,
    sharedBy: ownerMap.get(row.id) ?? null as string | null,
  }));
}
