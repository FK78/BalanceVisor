'use server';

import { db } from '@/index';
import { accountsTable, transactionsTable, transactionSplitsTable } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';
import { checkBudgetAlerts } from '@/lib/budget-alerts';
import { encrypt } from '@/lib/encryption';
import { matchCategorisationRule } from '@/lib/auto-categorise';

type Transaction = typeof transactionsTable.$inferInsert;
type RecurringPattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

function computeNextRecurringDate(dateStr: string, pattern: string | null): string | null {
  if (!pattern) return null;
  const d = new Date(dateStr + 'T00:00:00');
  switch (pattern as RecurringPattern) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: return null;
  }
  return d.toISOString().split('T')[0];
}

export async function createTransaction(transaction: Transaction) {
  return await db.insert(transactionsTable).values({
    ...transaction,
    description: transaction.description ? encrypt(transaction.description) : transaction.description,
  }).returning({ id: transactionsTable.id });
}

function balanceDelta(type: 'income' | 'expense' | 'transfer', amount: number) {
  if (type === 'transfer') return 0;
  return type === 'income' ? amount : -amount;
}

export async function addTransaction(formData: FormData) {
  const type = formData.get('type') as 'income' | 'expense';
  const amount = parseFloat(formData.get('amount') as string);
  const accountId = Number(formData.get('account_id'));

  const isRecurring = formData.get('is_recurring') === 'true';
  const recurringPattern = isRecurring ? (formData.get('recurring_pattern') as string | null) : null;
  const txnDate = formData.get('date') as string;
  const nextRecurringDate = isRecurring && recurringPattern && txnDate
    ? computeNextRecurringDate(txnDate, recurringPattern)
    : null;

  const description = formData.get('description') as string;
  let categoryId = Number(formData.get('category_id'));

  // Auto-categorise if no category was selected
  if (!categoryId) {
    const userId = await getCurrentUserId();
    const matched = await matchCategorisationRule(userId, description);
    if (matched) categoryId = matched;
  }

  const [result] = await createTransaction({
    type,
    amount,
    description,
    is_recurring: isRecurring,
    date: txnDate,
    account_id: accountId,
    category_id: categoryId || Number(formData.get('category_id')),
    recurring_pattern: recurringPattern as typeof transactionsTable.$inferInsert['recurring_pattern'],
    next_recurring_date: nextRecurringDate,
  });

  await db.update(accountsTable)
    .set({ balance: sql`${accountsTable.balance} + ${balanceDelta(type, amount)}` })
    .where(eq(accountsTable.id, accountId));

  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/accounts');

  const userId = await getCurrentUserId();
  await checkBudgetAlerts(userId);

  return result;
}

export async function editTransaction(formData: FormData) {
  const id = Number(formData.get('id'));
  const newType = formData.get('type') as 'income' | 'expense';
  const newAmount = parseFloat(formData.get('amount') as string);
  const newAccountId = Number(formData.get('account_id'));

  // Fetch old transaction to reverse its balance effect
  const [old] = await db.select({
    type: transactionsTable.type,
    amount: transactionsTable.amount,
    account_id: transactionsTable.account_id,
  }).from(transactionsTable).where(eq(transactionsTable.id, id));

  const isRecurring = formData.get('is_recurring') === 'true';
  const recurringPattern = isRecurring ? (formData.get('recurring_pattern') as string | null) : null;
  const txnDate = formData.get('date') as string;
  const nextRecurringDate = isRecurring && recurringPattern && txnDate
    ? computeNextRecurringDate(txnDate, recurringPattern)
    : null;

  const [result] = await db.update(transactionsTable).set({
    type: newType,
    amount: newAmount,
    description: encrypt(formData.get('description') as string),
    is_recurring: isRecurring,
    date: txnDate,
    account_id: newAccountId,
    category_id: Number(formData.get('category_id')),
    recurring_pattern: recurringPattern as typeof transactionsTable.$inferInsert['recurring_pattern'],
    next_recurring_date: nextRecurringDate,
  }).where(eq(transactionsTable.id, id)).returning({ id: transactionsTable.id });

  if (old) {
    // Reverse old effect
    if (old.account_id) {
      await db.update(accountsTable)
        .set({ balance: sql`${accountsTable.balance} - ${balanceDelta(old.type, old.amount)}` })
        .where(eq(accountsTable.id, old.account_id));
    }
    // Apply new effect
    await db.update(accountsTable)
      .set({ balance: sql`${accountsTable.balance} + ${balanceDelta(newType, newAmount)}` })
      .where(eq(accountsTable.id, newAccountId));
  }

  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/accounts');

  const userId = await getCurrentUserId();
  await checkBudgetAlerts(userId);

  return result;
}

export async function addTransfer(formData: FormData) {
  const amount = parseFloat(formData.get('amount') as string);
  const fromAccountId = Number(formData.get('from_account_id'));
  const toAccountId = Number(formData.get('to_account_id'));
  const description = formData.get('description') as string || 'Transfer';
  const txnDate = formData.get('date') as string;

  if (fromAccountId === toAccountId) {
    throw new Error('Source and destination accounts must be different');
  }

  const [result] = await createTransaction({
    type: 'transfer',
    amount,
    description,
    is_recurring: false,
    date: txnDate,
    account_id: fromAccountId,
    transfer_account_id: toAccountId,
    category_id: null,
    recurring_pattern: null,
    next_recurring_date: null,
  });

  // Deduct from source account
  await db.update(accountsTable)
    .set({ balance: sql`${accountsTable.balance} - ${amount}` })
    .where(eq(accountsTable.id, fromAccountId));

  // Add to destination account
  await db.update(accountsTable)
    .set({ balance: sql`${accountsTable.balance} + ${amount}` })
    .where(eq(accountsTable.id, toAccountId));

  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard');

  return result;
}

export async function deleteTransaction(id: number) {
  // Fetch transaction to reverse its balance effect
  const [txn] = await db.select({
    type: transactionsTable.type,
    amount: transactionsTable.amount,
    account_id: transactionsTable.account_id,
    transfer_account_id: transactionsTable.transfer_account_id,
  }).from(transactionsTable).where(eq(transactionsTable.id, id));

  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));

  if (txn?.type === 'transfer') {
    // Reverse transfer: add back to source, deduct from destination
    if (txn.account_id) {
      await db.update(accountsTable)
        .set({ balance: sql`${accountsTable.balance} + ${txn.amount}` })
        .where(eq(accountsTable.id, txn.account_id));
    }
    if (txn.transfer_account_id) {
      await db.update(accountsTable)
        .set({ balance: sql`${accountsTable.balance} - ${txn.amount}` })
        .where(eq(accountsTable.id, txn.transfer_account_id));
    }
  } else if (txn?.account_id) {
    await db.update(accountsTable)
      .set({ balance: sql`${accountsTable.balance} - ${balanceDelta(txn.type, txn.amount)}` })
      .where(eq(accountsTable.id, txn.account_id));
  }

  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/accounts');
}

export type SplitInput = {
  category_id: number | null;
  amount: number;
  description: string;
};

export async function addSplitTransaction(
  type: 'income' | 'expense',
  totalAmount: number,
  description: string,
  accountId: number,
  txnDate: string,
  splits: SplitInput[],
) {
  const userId = await getCurrentUserId();

  // Create parent transaction with is_split = true, no single category
  const [parent] = await db.insert(transactionsTable).values({
    type,
    amount: totalAmount,
    description: encrypt(description),
    is_recurring: false,
    date: txnDate,
    account_id: accountId,
    category_id: null,
    recurring_pattern: null,
    next_recurring_date: null,
    is_split: true,
  }).returning({ id: transactionsTable.id });

  // Insert splits
  if (splits.length > 0) {
    await db.insert(transactionSplitsTable).values(
      splits.map((s) => ({
        transaction_id: parent.id,
        category_id: s.category_id,
        amount: s.amount,
        description: s.description ? encrypt(s.description) : null,
      }))
    );
  }

  // Update account balance
  const delta = type === 'income' ? totalAmount : -totalAmount;
  await db.update(accountsTable)
    .set({ balance: sql`${accountsTable.balance} + ${delta}` })
    .where(eq(accountsTable.id, accountId));

  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard');

  await checkBudgetAlerts(userId);

  return parent;
}