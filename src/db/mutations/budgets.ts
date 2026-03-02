'use server';

import { db } from '@/index';
import { budgetsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';

export async function addBudget(formData: FormData) {
  const userId = await getCurrentUserId();

  const [result] = await db.insert(budgetsTable).values({
    user_id: userId,
    category_id: formData.get('category_id') as string,
    amount: parseFloat(formData.get('amount') as string),
    period: formData.get('period') as 'monthly' | 'weekly',
    start_date: formData.get('start_date') as string,
  }).returning({ id: budgetsTable.id });
  revalidatePath('/onboarding');
  revalidatePath('/dashboard/budgets');
  return result;
}

export async function editBudget(id: string, formData: FormData) {
  await db.update(budgetsTable).set({
    category_id: formData.get('category_id') as string,
    amount: parseFloat(formData.get('amount') as string),
    period: formData.get('period') as 'monthly' | 'weekly',
    start_date: formData.get('start_date') as string,
  }).where(eq(budgetsTable.id, id));
  revalidatePath('/dashboard/budgets');
}

export async function deleteBudget(id: string) {
  await db.delete(budgetsTable).where(eq(budgetsTable.id, id));
  revalidatePath('/dashboard/budgets');
}
