import { db } from '@/index';
import { categorisationRulesTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Matches a transaction description against the user's categorisation rules.
 * Rules are checked in priority order (highest first).
 * Pattern matching is case-insensitive substring match.
 * Returns the category_id of the first matching rule, or null if no match.
 */
export async function matchCategorisationRule(
  userId: string,
  description: string,
): Promise<string | null> {
  const rules = await db.select({
    pattern: categorisationRulesTable.pattern,
    category_id: categorisationRulesTable.category_id,
  })
    .from(categorisationRulesTable)
    .where(eq(categorisationRulesTable.user_id, userId))
    .orderBy(desc(categorisationRulesTable.priority));

  const descLower = description.toLowerCase();

  for (const rule of rules) {
    if (!rule.category_id) continue;
    const pattern = rule.pattern.toLowerCase();
    if (descLower.includes(pattern)) {
      return rule.category_id;
    }
  }

  return null;
}
