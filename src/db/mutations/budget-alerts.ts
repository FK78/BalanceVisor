'use server';

import { db } from '@/index';
import { budgetAlertPreferencesTable, budgetNotificationsTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/auth';

export async function upsertAlertPreferences(
  budgetId: string,
  threshold: number,
  browserAlerts: boolean,
  emailAlerts: boolean,
) {
  const userId = await getCurrentUserId();

  const [existing] = await db.select()
    .from(budgetAlertPreferencesTable)
    .where(
      and(
        eq(budgetAlertPreferencesTable.budget_id, budgetId),
        eq(budgetAlertPreferencesTable.user_id, userId),
      )
    );

  if (existing) {
    await db.update(budgetAlertPreferencesTable)
      .set({ threshold, browser_alerts: browserAlerts, email_alerts: emailAlerts })
      .where(eq(budgetAlertPreferencesTable.id, existing.id));
  } else {
    await db.insert(budgetAlertPreferencesTable).values({
      budget_id: budgetId,
      user_id: userId,
      threshold,
      browser_alerts: browserAlerts,
      email_alerts: emailAlerts,
    });
  }

  revalidatePath('/dashboard/budgets');
}

export async function markNotificationRead(notificationId: string) {
  await db.update(budgetNotificationsTable)
    .set({ is_read: true })
    .where(eq(budgetNotificationsTable.id, notificationId));
  revalidatePath('/dashboard');
}

export async function markAllNotificationsRead() {
  const userId = await getCurrentUserId();
  await db.update(budgetNotificationsTable)
    .set({ is_read: true })
    .where(
      and(
        eq(budgetNotificationsTable.user_id, userId),
        eq(budgetNotificationsTable.is_read, false),
      )
    );
  revalidatePath('/dashboard');
}

export async function createNotification(
  userId: string,
  budgetId: string,
  alertType: 'threshold_warning' | 'over_budget',
  message: string,
) {
  return await db.insert(budgetNotificationsTable).values({
    user_id: userId,
    budget_id: budgetId,
    alert_type: alertType,
    message,
  }).returning({ id: budgetNotificationsTable.id });
}
