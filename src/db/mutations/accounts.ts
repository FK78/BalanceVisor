'use server';

import { db } from '@/index';
import { accountsTable, transactionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';
import { getUserBaseCurrency } from '@/db/queries/onboarding';
import { encrypt } from '@/lib/encryption';

export async function addAccount(formData: FormData) {
  const userId = await getCurrentUserId();
  const baseCurrency = await getUserBaseCurrency(userId);

  const [result] = await db.insert(accountsTable).values({
    user_id: userId,
    name: encrypt(formData.get('name') as string),
    type: formData.get('type') as 'currentAccount' | 'savings' | 'creditCard' | 'investment',
    balance: parseFloat(formData.get('balance') as string),
    currency: baseCurrency,
  }).returning({ id: accountsTable.id });
  revalidatePath('/onboarding');
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard');
  return result;
}

export async function editAccount(id: string, formData: FormData) {
  const userId = await getCurrentUserId();
  const baseCurrency = await getUserBaseCurrency(userId);

  await db.update(accountsTable).set({
    name: encrypt(formData.get('name') as string),
    type: formData.get('type') as 'currentAccount' | 'savings' | 'creditCard' | 'investment',
    balance: parseFloat(formData.get('balance') as string),
    currency: baseCurrency,
  }).where(eq(accountsTable.id, id));
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard');
}

export async function deleteAccount(id: string) {
  await db.delete(transactionsTable).where(eq(transactionsTable.account_id, id));
  await db.delete(accountsTable).where(eq(accountsTable.id, id));
  revalidatePath('/dashboard/accounts');
}
