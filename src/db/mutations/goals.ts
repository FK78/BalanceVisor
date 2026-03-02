'use server';

import { db } from '@/index';
import { goalsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';

export async function addGoal(formData: FormData) {
  const userId = await getCurrentUserId();

  const [result] = await db.insert(goalsTable).values({
    user_id: userId,
    name: formData.get('name') as string,
    target_amount: parseFloat(formData.get('target_amount') as string),
    saved_amount: parseFloat(formData.get('saved_amount') as string) || 0,
    target_date: (formData.get('target_date') as string) || null,
    icon: (formData.get('icon') as string) || null,
    color: (formData.get('color') as string) || '#6366f1',
  }).returning({ id: goalsTable.id });
  revalidatePath('/dashboard/goals');
  revalidatePath('/dashboard');
  return result;
}

export async function editGoal(id: string, formData: FormData) {
  await db.update(goalsTable).set({
    name: formData.get('name') as string,
    target_amount: parseFloat(formData.get('target_amount') as string),
    saved_amount: parseFloat(formData.get('saved_amount') as string) || 0,
    target_date: (formData.get('target_date') as string) || null,
    icon: (formData.get('icon') as string) || null,
    color: (formData.get('color') as string) || '#6366f1',
  }).where(eq(goalsTable.id, id));
  revalidatePath('/dashboard/goals');
  revalidatePath('/dashboard');
}

export async function deleteGoal(id: string) {
  await db.delete(goalsTable).where(eq(goalsTable.id, id));
  revalidatePath('/dashboard/goals');
  revalidatePath('/dashboard');
}

export async function contributeToGoal(id: string, amount: number) {
  const [goal] = await db.select({ saved_amount: goalsTable.saved_amount })
    .from(goalsTable)
    .where(eq(goalsTable.id, id));

  if (!goal) return;

  await db.update(goalsTable).set({
    saved_amount: goal.saved_amount + amount,
  }).where(eq(goalsTable.id, id));
  revalidatePath('/dashboard/goals');
  revalidatePath('/dashboard');
}
