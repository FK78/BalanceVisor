'use server';

import { db } from '@/index';
import { transactionsTable, accountsTable } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';

/**
 * Stop a recurring transaction — sets is_recurring to false and clears
 * recurring_pattern / next_recurring_date. The transaction itself remains
 * as a historical record.
 */
export async function cancelRecurring(transactionId: string) {
  const userId = await getCurrentUserId();

  // Verify ownership
  const [txn] = await db
    .select({ account_id: transactionsTable.account_id })
    .from(transactionsTable)
    .innerJoin(accountsTable, eq(transactionsTable.account_id, accountsTable.id))
    .where(
      and(
        eq(transactionsTable.id, transactionId),
        eq(accountsTable.user_id, userId),
      )
    );

  if (!txn) throw new Error('Transaction not found');

  await db
    .update(transactionsTable)
    .set({
      is_recurring: false,
      recurring_pattern: null,
      next_recurring_date: null,
    })
    .where(eq(transactionsTable.id, transactionId));

  revalidatePath('/dashboard/recurring');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard');
}

/**
 * Update the recurring pattern and/or next date for a recurring transaction.
 */
export async function updateRecurringPattern(formData: FormData) {
  const userId = await getCurrentUserId();
  const transactionId = formData.get('id') as string;
  const pattern = formData.get('recurring_pattern') as string;
  const nextDate = formData.get('next_recurring_date') as string;

  // Verify ownership
  const [txn] = await db
    .select({ account_id: transactionsTable.account_id })
    .from(transactionsTable)
    .innerJoin(accountsTable, eq(transactionsTable.account_id, accountsTable.id))
    .where(
      and(
        eq(transactionsTable.id, transactionId),
        eq(accountsTable.user_id, userId),
      )
    );

  if (!txn) throw new Error('Transaction not found');

  await db
    .update(transactionsTable)
    .set({
      recurring_pattern: pattern as typeof transactionsTable.$inferInsert['recurring_pattern'],
      next_recurring_date: nextDate || null,
    })
    .where(eq(transactionsTable.id, transactionId));

  revalidatePath('/dashboard/recurring');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard');
}
