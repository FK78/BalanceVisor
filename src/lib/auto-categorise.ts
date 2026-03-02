import { db } from '@/index';
import { categorisationRulesTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { groq } from '@ai-sdk/groq';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { getCategoriesByUser } from '@/db/queries/categories';

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

    const { output } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      output: Output.object({
        schema: z.object({
          category_id: z.string().nullable().describe('The id of the best matching category, or null if none fit'),
          confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
        }),
      }),
      prompt: `You are a financial transaction categoriser. Given a transaction description and a list of categories, pick the single best category.\n\nTransaction: "${description}"\n\nCategories:\n${categoryList}\n\nReturn the category id that best matches this transaction. If no category is a reasonable fit, return null. Also provide a confidence score.`,
      maxOutputTokens: 100,
    });

    if (output?.category_id && output.confidence >= 0.6) {
      // Verify the returned id is actually one of the user's categories
      const valid = categories.some((c) => c.id === output.category_id);
      return valid ? output.category_id : null;
    }

    return null;
  } catch {
    // AI categorisation failed — degrade gracefully
    return null;
  }
}
