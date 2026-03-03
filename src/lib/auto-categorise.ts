import { db } from '@/index';
import { categorisationRulesTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import { getCategoriesByUser } from '@/db/queries/categories';
import { logger } from '@/lib/logger';

const categoriseSchema = z.object({
  category_id: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

/**
 * Matches a transaction description against the user's categorisation rules.
 * Rules are checked in priority order (highest first).
 * Pattern matching is case-insensitive substring match.
 * Falls back to AI categorisation if no rule matches and GROQ_API_KEY is set.
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

  // Fallback: AI-powered categorisation
  if (process.env.GROQ_API_KEY) {
    return aiCategorise(userId, description);
  }

  return null;
}

/**
 * Uses an LLM to classify a transaction description into one of the user's categories.
 * Returns the category_id or null if uncertain.
 */
async function aiCategorise(
  userId: string,
  description: string,
): Promise<string | null> {
  try {
    const categories = await getCategoriesByUser(userId);
    if (categories.length === 0) return null;

    const categoryList = categories.map((c) => `- id: "${c.id}" → ${c.name}`).join('\n');

    const { text: responseText } = await generateText({
      model: groq('openai/gpt-oss-20b'),
      prompt: `You are a financial transaction categoriser. Given a transaction description and a list of categories, pick the single best category.

Transaction: "${description}"

Categories:
${categoryList}

Return ONLY a JSON object with these exact fields:
- category_id: the id string of the best matching category, or null if none fit
- confidence: a number between 0 and 1

Respond with ONLY the JSON object, no other text.`,
      maxOutputTokens: 100,
    });

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = categoriseSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) return null;

    if (parsed.data.category_id && parsed.data.confidence >= 0.6) {
      const valid = categories.some((c) => c.id === parsed.data.category_id);
      return valid ? parsed.data.category_id : null;
    }

    return null;
  } catch (err) {
    logger.error("auto-categorise", "AI categorisation failed", err);
    return null;
  }
}
