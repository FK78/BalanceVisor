import { db } from '@/index'; // you'll create this shared db instance
import { transactionsTable, budgetsTable, categoriesTable, sharedAccessTable } from '@/db/schema';
import { eq, sum, sql, and, or, inArray } from 'drizzle-orm';

export async function getBudgets(userId: string) {
  const rows = await db.select({
    id: budgetsTable.id,
    category_id: budgetsTable.category_id,
    budgetCategory: categoriesTable.name,
    budgetColor: categoriesTable.color,
    budgetIcon: categoriesTable.icon,
    budgetAmount: budgetsTable.amount,
    budgetSpent: sql<number>`coalesce(${sum(transactionsTable.amount)}, 0)`.mapWith(Number),
    budgetPeriod: budgetsTable.period,
    start_date: budgetsTable.start_date,
  })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, budgetsTable.category_id))
    .leftJoin(transactionsTable, eq(transactionsTable.category_id, budgetsTable.category_id))
    .where(eq(budgetsTable.user_id, userId))
    .groupBy(budgetsTable.id, budgetsTable.category_id, categoriesTable.name, categoriesTable.color, categoriesTable.icon, budgetsTable.amount, budgetsTable.period, budgetsTable.start_date);

  return rows.map((row) => ({ ...row, isShared: false as boolean }));
}

export async function getSharedBudgets(userId: string, email: string) {
  const sharedRows = await db
    .select({ resource_id: sharedAccessTable.resource_id })
    .from(sharedAccessTable)
    .where(
      and(
        eq(sharedAccessTable.resource_type, "budget"),
        eq(sharedAccessTable.status, "accepted"),
        or(
          eq(sharedAccessTable.shared_with_id, userId),
          eq(sharedAccessTable.shared_with_email, email),
        ),
      ),
    );

  if (sharedRows.length === 0) return [];

  const sharedBudgetIds = sharedRows.map((r) => r.resource_id);

  const rows = await db.select({
    id: budgetsTable.id,
    category_id: budgetsTable.category_id,
    budgetCategory: categoriesTable.name,
    budgetColor: categoriesTable.color,
    budgetIcon: categoriesTable.icon,
    budgetAmount: budgetsTable.amount,
    budgetSpent: sql<number>`coalesce(${sum(transactionsTable.amount)}, 0)`.mapWith(Number),
    budgetPeriod: budgetsTable.period,
    start_date: budgetsTable.start_date,
  })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, budgetsTable.category_id))
    .leftJoin(transactionsTable, eq(transactionsTable.category_id, budgetsTable.category_id))
    .where(inArray(budgetsTable.id, sharedBudgetIds))
    .groupBy(budgetsTable.id, budgetsTable.category_id, categoriesTable.name, categoriesTable.color, categoriesTable.icon, budgetsTable.amount, budgetsTable.period, budgetsTable.start_date);

  return rows.map((row) => ({ ...row, isShared: true as boolean }));
}
