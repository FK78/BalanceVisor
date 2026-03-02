'use server';

import { db } from '@/index';
import {
  accountsTable,
  budgetAlertPreferencesTable,
  budgetNotificationsTable,
  budgetsTable,
  categoriesTable,
  categorisationRulesTable,
  goalsTable,
  manualHoldingsTable,
  subscriptionsTable,
  trading212ConnectionsTable,
  transactionsTable,
  truelayerConnectionsTable,
  userOnboardingTable,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { normalizeBaseCurrency } from '@/lib/currency';

export async function updateDisplayName(formData: FormData) {
  const supabase = await createClient();
  const displayName = (formData.get('display_name') as string)?.trim();

  if (!displayName) return { error: 'Display name is required.' };

  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function updateBaseCurrency(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const baseCurrency = normalizeBaseCurrency(formData.get('base_currency') as string | null);

    await db.transaction(async (tx) => {
      await tx.update(userOnboardingTable)
        .set({ base_currency: baseCurrency })
        .where(eq(userOnboardingTable.user_id, userId));

      await tx.update(accountsTable)
        .set({ currency: baseCurrency })
        .where(eq(accountsTable.user_id, userId));
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/accounts');
    revalidatePath('/dashboard/transactions');
    revalidatePath('/dashboard/budgets');
    return { success: true };
  } catch {
    return { error: 'Failed to update currency.' };
  }
}

export async function deleteAccount(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const userId = user.id;

  // Get all account IDs so we can delete their transactions
  const userAccounts = await db.select({ id: accountsTable.id })
    .from(accountsTable)
    .where(eq(accountsTable.user_id, userId));
  const accountIds = userAccounts.map(a => a.id);

  await db.transaction(async (tx) => {
    // Delete in order respecting FK constraints
    await tx.delete(budgetNotificationsTable).where(eq(budgetNotificationsTable.user_id, userId));
    await tx.delete(budgetAlertPreferencesTable).where(eq(budgetAlertPreferencesTable.user_id, userId));
    await tx.delete(subscriptionsTable).where(eq(subscriptionsTable.user_id, userId));
    await tx.delete(goalsTable).where(eq(goalsTable.user_id, userId));
    await tx.delete(categorisationRulesTable).where(eq(categorisationRulesTable.user_id, userId));
    await tx.delete(manualHoldingsTable).where(eq(manualHoldingsTable.user_id, userId));
    await tx.delete(trading212ConnectionsTable).where(eq(trading212ConnectionsTable.user_id, userId));
    if (accountIds.length > 0) {
      await tx.delete(transactionsTable).where(inArray(transactionsTable.account_id, accountIds));
    }
    await tx.delete(budgetsTable).where(eq(budgetsTable.user_id, userId));
    await tx.delete(categoriesTable).where(eq(categoriesTable.user_id, userId));
    await tx.delete(accountsTable).where(eq(accountsTable.user_id, userId));
    await tx.delete(truelayerConnectionsTable).where(eq(truelayerConnectionsTable.user_id, userId));
    await tx.delete(userOnboardingTable).where(eq(userOnboardingTable.user_id, userId));
  });

  await supabase.auth.signOut();
  return { success: true };
}

export async function exportUserData() {
  const userId = await getCurrentUserId();

  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.user_id, userId));
  const accountIds = accounts.map(a => a.id);

  const [categories, transactions, budgets, goals, subscriptions] = await Promise.all([
    db.select().from(categoriesTable).where(eq(categoriesTable.user_id, userId)),
    accountIds.length > 0
      ? db.select().from(transactionsTable).where(inArray(transactionsTable.account_id, accountIds))
      : Promise.resolve([]),
    db.select().from(budgetsTable).where(eq(budgetsTable.user_id, userId)),
    db.select().from(goalsTable).where(eq(goalsTable.user_id, userId)),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.user_id, userId)),
  ]);

  return {
    exported_at: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    subscriptions,
  };
}
