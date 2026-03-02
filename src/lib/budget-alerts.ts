import { db } from '@/index';
import {
  budgetsTable,
  budgetAlertPreferencesTable,
  budgetNotificationsTable,
  categoriesTable,
  transactionsTable,
} from '@/db/schema';
import { eq, sum, and, gte, lt, desc } from 'drizzle-orm';
import { createNotification } from '@/db/mutations/budget-alerts';
import { sendBudgetAlertEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

function getMonthRange(monthsAgo = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

type BudgetWithSpend = {
  budgetId: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  threshold: number;
  browserAlerts: boolean;
  emailAlerts: boolean;
};

async function getBudgetsWithSpendAndPrefs(userId: string): Promise<BudgetWithSpend[]> {
  const { start, end } = getMonthRange();

  const budgets = await db.select({
    budgetId: budgetsTable.id,
    categoryName: categoriesTable.name,
    budgetAmount: budgetsTable.amount,
    spent: sum(transactionsTable.amount),
  })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, budgetsTable.category_id))
    .leftJoin(transactionsTable, and(
      eq(transactionsTable.category_id, budgetsTable.category_id),
      gte(transactionsTable.date, start),
      lt(transactionsTable.date, end),
    ))
    .where(eq(budgetsTable.user_id, userId))
    .groupBy(budgetsTable.id, categoriesTable.name, budgetsTable.amount);

  const prefs = await db.select()
    .from(budgetAlertPreferencesTable)
    .where(eq(budgetAlertPreferencesTable.user_id, userId));

  const prefsMap = new Map(prefs.map(p => [p.budget_id, p]));

  return budgets.map(b => {
    const pref = prefsMap.get(b.budgetId);
    return {
      budgetId: b.budgetId,
      categoryName: b.categoryName,
      budgetAmount: b.budgetAmount,
      spent: Number(b.spent ?? 0),
      threshold: pref?.threshold ?? 80,
      browserAlerts: pref?.browser_alerts ?? true,
      emailAlerts: pref?.email_alerts ?? false,
    };
  });
}

async function hasRecentNotification(
  userId: string,
  budgetId: string,
  alertType: 'threshold_warning' | 'over_budget',
): Promise<boolean> {
  const { start } = getMonthRange();

  const [existing] = await db.select({ id: budgetNotificationsTable.id })
    .from(budgetNotificationsTable)
    .where(and(
      eq(budgetNotificationsTable.user_id, userId),
      eq(budgetNotificationsTable.budget_id, budgetId),
      eq(budgetNotificationsTable.alert_type, alertType),
      gte(budgetNotificationsTable.created_at, new Date(start)),
    ))
    .orderBy(desc(budgetNotificationsTable.created_at))
    .limit(1);

  return !!existing;
}

export type TriggeredAlert = {
  budgetId: string;
  alertType: 'threshold_warning' | 'over_budget';
  message: string;
  emailAlerts: boolean;
};

/**
 * Checks all budgets for a user and creates notifications for any
 * that have crossed their alert threshold or gone over budget.
 * Returns the list of newly triggered alerts (for browser push).
 */
export async function checkBudgetAlerts(userId: string): Promise<TriggeredAlert[]> {
  const budgets = await getBudgetsWithSpendAndPrefs(userId);
  const triggered: TriggeredAlert[] = [];

  // Pre-fetch user email for potential email alerts
  let userEmail: string | undefined;
  const needsEmail = budgets.some(b => b.emailAlerts);
  if (needsEmail) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? undefined;
  }

  for (const b of budgets) {
    if (!b.browserAlerts && !b.emailAlerts) continue;
    if (b.budgetAmount <= 0) continue;

    const percent = (b.spent / b.budgetAmount) * 100;

    if (percent >= 100) {
      const already = await hasRecentNotification(userId, b.budgetId, 'over_budget');
      if (!already) {
        const message = `You've exceeded your ${b.categoryName} budget! Spent ${percent.toFixed(0)}% of your ${b.categoryName} budget.`;
        await createNotification(userId, b.budgetId, 'over_budget', message);
        triggered.push({
          budgetId: b.budgetId,
          alertType: 'over_budget',
          message,
          emailAlerts: b.emailAlerts,
        });

        if (b.emailAlerts && userEmail) {
          await sendBudgetAlertEmail(
            userEmail,
            `${b.categoryName} budget exceeded`,
            'over_budget',
            b.categoryName,
            percent,
            b.budgetAmount,
            b.spent,
            'USD',
          );
        }
      }
    } else if (percent >= b.threshold) {
      const already = await hasRecentNotification(userId, b.budgetId, 'threshold_warning');
      if (!already) {
        const message = `Heads up — you've used ${percent.toFixed(0)}% of your ${b.categoryName} budget.`;
        await createNotification(userId, b.budgetId, 'threshold_warning', message);
        triggered.push({
          budgetId: b.budgetId,
          alertType: 'threshold_warning',
          message,
          emailAlerts: b.emailAlerts,
        });

        if (b.emailAlerts && userEmail) {
          await sendBudgetAlertEmail(
            userEmail,
            `${b.categoryName} budget at ${percent.toFixed(0)}%`,
            'threshold_warning',
            b.categoryName,
            percent,
            b.budgetAmount,
            b.spent,
            'USD',
          );
        }
      }
    }
  }

  return triggered;
}
