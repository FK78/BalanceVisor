'use server';

import { db } from '@/index';
import { categorisationRulesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';
import { requireString, requireUUID, sanitizeNumber } from '@/lib/sanitize';

export async function addCategorisationRule(formData: FormData) {
  const userId = await getCurrentUserId();

  const pattern = requireString(formData.get('pattern') as string, 'Pattern');
  const category_id = requireUUID(formData.get('category_id') as string, 'Category');
  const priority = sanitizeNumber(formData.get('priority') as string, 'Priority');

  await db.insert(categorisationRulesTable).values({
    user_id: userId,
    pattern,
    category_id,
    priority,
  });

  revalidatePath('/dashboard/categories');
}

export async function editCategorisationRule(id: string, formData: FormData) {
  const pattern = requireString(formData.get('pattern') as string, 'Pattern');
  const category_id = requireUUID(formData.get('category_id') as string, 'Category');
  const priority = sanitizeNumber(formData.get('priority') as string, 'Priority');

  await db.update(categorisationRulesTable).set({
    pattern,
    category_id,
    priority,
  }).where(eq(categorisationRulesTable.id, id));

  revalidatePath('/dashboard/categories');
}

export async function deleteCategorisationRule(id: string) {
  await db.delete(categorisationRulesTable).where(eq(categorisationRulesTable.id, id));
  revalidatePath('/dashboard/categories');
}

/**
 * Create a categorisation rule from a manual category correction.
 * Called when a user re-categorises a transaction and wants future
 * transactions with the same description to auto-categorise.
 */
export async function learnCategorisationRule(pattern: string, categoryId: string) {
  const userId = await getCurrentUserId();

  const rules = await db
    .select({
      id: categorisationRulesTable.id,
      pattern: categorisationRulesTable.pattern,
      category_id: categorisationRulesTable.category_id,
    })
    .from(categorisationRulesTable)
    .where(eq(categorisationRulesTable.user_id, userId));

  // Already exists with same pattern + category — nothing to do
  const exact = rules.find(
    (r) => r.pattern.toLowerCase() === pattern.toLowerCase() && r.category_id === categoryId
  );
  if (exact) return;

  // Same pattern but different category — update it
  const samePattern = rules.find(
    (r) => r.pattern.toLowerCase() === pattern.toLowerCase()
  );

  if (samePattern) {
    await db.update(categorisationRulesTable)
      .set({ category_id: categoryId })
      .where(eq(categorisationRulesTable.id, samePattern.id));
  } else {
    await db.insert(categorisationRulesTable).values({
      user_id: userId,
      pattern,
      category_id: categoryId,
      priority: 10,
    });
  }

  revalidatePath('/dashboard/categories');
}
