'use server';

import { db } from '@/index';
import { subscriptionsTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';

export async function addSubscription(formData: FormData) {
  const userId = await getCurrentUserId();

  const [result] = await db.insert(subscriptionsTable).values({
    user_id: userId,
    name: formData.get('name') as string,
    amount: parseFloat(formData.get('amount') as string),
    currency: (formData.get('currency') as string) || 'GBP',
    billing_cycle: (formData.get('billing_cycle') as 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
    next_billing_date: formData.get('next_billing_date') as string,
    category_id: formData.get('category_id') ? parseInt(formData.get('category_id') as string) : null,
    url: (formData.get('url') as string) || null,
    notes: (formData.get('notes') as string) || null,
    color: (formData.get('color') as string) || '#6366f1',
    icon: (formData.get('icon') as string) || null,
  }).returning({ id: subscriptionsTable.id });

  revalidatePath('/dashboard/subscriptions');
  revalidatePath('/dashboard');
  return result;
}

export async function editSubscription(id: number, formData: FormData) {
  const userId = await getCurrentUserId();

  await db.update(subscriptionsTable).set({
    name: formData.get('name') as string,
    amount: parseFloat(formData.get('amount') as string),
    currency: (formData.get('currency') as string) || 'GBP',
    billing_cycle: (formData.get('billing_cycle') as 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
    next_billing_date: formData.get('next_billing_date') as string,
    category_id: formData.get('category_id') ? parseInt(formData.get('category_id') as string) : null,
    url: (formData.get('url') as string) || null,
    notes: (formData.get('notes') as string) || null,
    color: (formData.get('color') as string) || '#6366f1',
    icon: (formData.get('icon') as string) || null,
  }).where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.user_id, userId)));

  revalidatePath('/dashboard/subscriptions');
  revalidatePath('/dashboard');
}

export async function deleteSubscription(id: number) {
  const userId = await getCurrentUserId();
  await db.delete(subscriptionsTable).where(
    and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.user_id, userId))
  );
  revalidatePath('/dashboard/subscriptions');
  revalidatePath('/dashboard');
}

export async function toggleSubscription(id: number) {
  const userId = await getCurrentUserId();

  const [sub] = await db.select({ is_active: subscriptionsTable.is_active })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.user_id, userId)));

  if (!sub) return;

  await db.update(subscriptionsTable).set({
    is_active: !sub.is_active,
  }).where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.user_id, userId)));

  revalidatePath('/dashboard/subscriptions');
  revalidatePath('/dashboard');
}
