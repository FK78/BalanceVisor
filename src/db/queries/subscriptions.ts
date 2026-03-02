import { db } from '@/index';
import { subscriptionsTable, categoriesTable } from '@/db/schema';
import { eq, desc, and, lte, gte } from 'drizzle-orm';

const subscriptionSelect = {
  id: subscriptionsTable.id,
  name: subscriptionsTable.name,
  amount: subscriptionsTable.amount,
  currency: subscriptionsTable.currency,
  billing_cycle: subscriptionsTable.billing_cycle,
  next_billing_date: subscriptionsTable.next_billing_date,
  category_id: subscriptionsTable.category_id,
  account_id: subscriptionsTable.account_id,
  categoryName: categoriesTable.name,
  categoryColor: categoriesTable.color,
  url: subscriptionsTable.url,
  notes: subscriptionsTable.notes,
  is_active: subscriptionsTable.is_active,
  color: subscriptionsTable.color,
  icon: subscriptionsTable.icon,
  created_at: subscriptionsTable.created_at,
};

export async function getSubscriptions(userId: string) {
  return await db
    .select(subscriptionSelect)
    .from(subscriptionsTable)
    .leftJoin(categoriesTable, eq(subscriptionsTable.category_id, categoriesTable.id))
    .where(eq(subscriptionsTable.user_id, userId))
    .orderBy(desc(subscriptionsTable.is_active), subscriptionsTable.next_billing_date);
}

export type Subscription = Awaited<ReturnType<typeof getSubscriptions>>[number];

const CYCLE_MULTIPLIERS: Record<string, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export function toMonthlyAmount(amount: number, cycle: string): number {
  return amount * (CYCLE_MULTIPLIERS[cycle] ?? 1);
}

export function toYearlyAmount(amount: number, cycle: string): number {
  return toMonthlyAmount(amount, cycle) * 12;
}

export async function getActiveSubscriptionsTotals(userId: string) {
  const subs = await db
    .select({
      amount: subscriptionsTable.amount,
      billing_cycle: subscriptionsTable.billing_cycle,
    })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.user_id, userId),
        eq(subscriptionsTable.is_active, true)
      )
    );

  let monthly = 0;
  let yearly = 0;
  for (const s of subs) {
    monthly += toMonthlyAmount(s.amount, s.billing_cycle);
    yearly += toYearlyAmount(s.amount, s.billing_cycle);
  }

  return { monthly: Math.round(monthly * 100) / 100, yearly: Math.round(yearly * 100) / 100, count: subs.length };
}

export async function getUpcomingRenewals(userId: string, withinDays = 7) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  return await db
    .select(subscriptionSelect)
    .from(subscriptionsTable)
    .leftJoin(categoriesTable, eq(subscriptionsTable.category_id, categoriesTable.id))
    .where(
      and(
        eq(subscriptionsTable.user_id, userId),
        eq(subscriptionsTable.is_active, true),
        gte(subscriptionsTable.next_billing_date, today),
        lte(subscriptionsTable.next_billing_date, futureDateStr)
      )
    )
    .orderBy(subscriptionsTable.next_billing_date);
}
