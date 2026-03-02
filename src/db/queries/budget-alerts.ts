import { db } from '@/index';
import { budgetAlertPreferencesTable, budgetNotificationsTable } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getAlertPreferences(budgetId: string) {
  const [row] = await db.select()
    .from(budgetAlertPreferencesTable)
    .where(eq(budgetAlertPreferencesTable.budget_id, budgetId));
  return row ?? null;
}

export async function getAlertPreferencesByUser(userId: string) {
  return await db.select()
    .from(budgetAlertPreferencesTable)
    .where(eq(budgetAlertPreferencesTable.user_id, userId));
}

export async function getUnreadNotifications(userId: string) {
  return await db.select()
    .from(budgetNotificationsTable)
    .where(
      and(
        eq(budgetNotificationsTable.user_id, userId),
        eq(budgetNotificationsTable.is_read, false),
      )
    )
    .orderBy(desc(budgetNotificationsTable.created_at));
}

export async function getAllNotifications(userId: string, limit = 20) {
  return await db.select()
    .from(budgetNotificationsTable)
    .where(eq(budgetNotificationsTable.user_id, userId))
    .orderBy(desc(budgetNotificationsTable.created_at))
    .limit(limit);
}

export async function getUnreadCount(userId: string) {
  const rows = await db.select()
    .from(budgetNotificationsTable)
    .where(
      and(
        eq(budgetNotificationsTable.user_id, userId),
        eq(budgetNotificationsTable.is_read, false),
      )
    );
  return rows.length;
}
