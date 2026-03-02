import { db } from '@/index';
import { debtsTable, debtPaymentsTable } from '@/db/schema';
import { eq, desc, sum } from 'drizzle-orm';

export async function getDebts(userId: string) {
  return await db
    .select()
    .from(debtsTable)
    .where(eq(debtsTable.user_id, userId))
    .orderBy(desc(debtsTable.created_at));
}

export async function getDebtsSummary(userId: string) {
  const debts = await getDebts(userId);
  const active = debts.filter((d) => !d.is_paid_off);
  const paidOff = debts.filter((d) => d.is_paid_off);

  const totalOriginal = active.reduce((s, d) => s + d.original_amount, 0);
  const totalRemaining = active.reduce((s, d) => s + d.remaining_amount, 0);
  const totalPaid = totalOriginal - totalRemaining;
  const totalMinimumPayment = active.reduce((s, d) => s + d.minimum_payment, 0);
  const overallPct = totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0;

  return {
    debts,
    active,
    paidOff,
    totalOriginal,
    totalRemaining,
    totalPaid,
    totalMinimumPayment,
    overallPct,
    count: debts.length,
    activeCount: active.length,
    paidOffCount: paidOff.length,
  };
}

export async function getPaymentsForDebt(debtId: string) {
  return await db
    .select()
    .from(debtPaymentsTable)
    .where(eq(debtPaymentsTable.debt_id, debtId))
    .orderBy(desc(debtPaymentsTable.date));
}

export async function getTotalPaidForDebt(debtId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(debtPaymentsTable.amount) })
    .from(debtPaymentsTable)
    .where(eq(debtPaymentsTable.debt_id, debtId));
  return parseFloat(String(row?.total ?? '0'));
}
