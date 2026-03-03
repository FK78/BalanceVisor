import { db } from '@/index';
import { netWorthSnapshotsTable, accountsTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getInvestmentValue } from '@/lib/investment-value';
import { logger } from '@/lib/logger';

/**
 * Record today's net worth snapshot if one doesn't already exist.
 * Called on dashboard load — idempotent per user per day.
 */
export async function snapshotNetWorthIfNeeded(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Check if today's snapshot already exists
  const [existing] = await db
    .select({ id: netWorthSnapshotsTable.id })
    .from(netWorthSnapshotsTable)
    .where(
      and(
        eq(netWorthSnapshotsTable.user_id, userId),
        eq(netWorthSnapshotsTable.date, today)
      )
    )
    .limit(1);

  if (existing) return;

  // Compute current net worth
  const accounts = await db
    .select({ type: accountsTable.type, balance: accountsTable.balance })
    .from(accountsTable)
    .where(eq(accountsTable.user_id, userId));

  const liabilityTypes = new Set(['creditCard']);
  const totalAssets = accounts
    .filter((a) => !liabilityTypes.has(a.type ?? ''))
    .reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => liabilityTypes.has(a.type ?? ''))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  let investmentValue = 0;
  try {
    investmentValue = await getInvestmentValue(userId);
  } catch (err) {
    logger.error("snapshot-net-worth", "Investment fetch failed, using 0", err);
  }

  const netWorth = totalAssets - totalLiabilities + investmentValue;

  // Insert snapshot (ON CONFLICT DO NOTHING for race safety)
  await db
    .insert(netWorthSnapshotsTable)
    .values({
      user_id: userId,
      date: today,
      net_worth: netWorth,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      investment_value: investmentValue,
    })
    .onConflictDoNothing();
}
