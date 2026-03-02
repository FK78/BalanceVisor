'use server';

import { db } from '@/index';
import { categorisationRulesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';

export async function addCategorisationRule(formData: FormData) {
  const userId = await getCurrentUserId();

  await db.insert(categorisationRulesTable).values({
    user_id: userId,
    pattern: formData.get('pattern') as string,
    category_id: formData.get('category_id') as string,
    priority: Number(formData.get('priority') || '0'),
  });

  revalidatePath('/dashboard/categories');
}

export async function editCategorisationRule(id: string, formData: FormData) {
  await db.update(categorisationRulesTable).set({
    pattern: formData.get('pattern') as string,
    category_id: formData.get('category_id') as string,
    priority: Number(formData.get('priority') || '0'),
  }).where(eq(categorisationRulesTable.id, id));

  revalidatePath('/dashboard/categories');
}

export async function deleteCategorisationRule(id: string) {
  await db.delete(categorisationRulesTable).where(eq(categorisationRulesTable.id, id));
  revalidatePath('/dashboard/categories');
}
