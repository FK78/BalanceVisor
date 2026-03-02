'use server';

import { db } from '@/index';
import { categoriesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';

export async function addCategory(formData: FormData) {
  const userId = await getCurrentUserId();

  const [result] = await db.insert(categoriesTable).values({
    user_id: userId,
    name: formData.get('name') as string,
    color: formData.get('color') as string,
    icon: (formData.get('icon') as string) || null,
  }).returning({ id: categoriesTable.id });
  revalidatePath('/onboarding');
  revalidatePath('/dashboard/categories');
  return result;
}

export async function editCategory(id: string, formData: FormData) {
  await db.update(categoriesTable).set({
    name: formData.get('name') as string,
    color: formData.get('color') as string,
    icon: (formData.get('icon') as string) || null,
  }).where(eq(categoriesTable.id, id));
  revalidatePath('/dashboard/categories');
}

export async function deleteCategory(id: string) {
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  revalidatePath('/dashboard/categories');
}
