import { groq } from "@ai-sdk/groq";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { getAccountsWithDetails } from "@/db/queries/accounts";
import { getCategoriesByUser } from "@/db/queries/categories";

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text || typeof text !== "string") {
    return Response.json({ error: "Missing text field" }, { status: 400 });
  }

  const userId = await getCurrentUserId();

  const [accounts, categories] = await Promise.all([
    getAccountsWithDetails(userId),
    getCategoriesByUser(userId),
  ]);

  const accountList = accounts
    .map((a) => `- id: "${a.id}" → ${a.accountName} (${a.type})`)
    .join("\n");

  const categoryList = categories
    .map((c) => `- id: "${c.id}" → ${c.name}`)
    .join("\n");

  const today = new Date().toISOString().split("T")[0];

  const { output } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    output: Output.object({
      schema: z.object({
        type: z.enum(["income", "expense"]).describe("Whether this is income or an expense"),
        amount: z.number().positive().describe("The monetary amount"),
        description: z.string().describe("A short, clean description of the transaction"),
        date: z.string().describe("ISO date string (YYYY-MM-DD). Use relative terms like 'yesterday' relative to today."),
        account_id: z.string().nullable().describe("The id of the best matching account, or null if unclear"),
        category_id: z.string().nullable().describe("The id of the best matching category, or null if unclear"),
        account_name: z.string().nullable().describe("Human-readable name of the matched account"),
        category_name: z.string().nullable().describe("Human-readable name of the matched category"),
      }),
    }),
    prompt: `You are a financial transaction parser. Parse the user's natural language into a structured transaction.

Today's date: ${today}

User's accounts:
${accountList}

User's categories:
${categoryList}

User input: "${text}"

Rules:
- Infer type: if the user says "earned", "received", "got paid" etc. it's income; otherwise expense
- Parse the amount from the text (handle £, $, etc.)
- Create a concise description (e.g. "Tesco groceries", not the raw user input)
- Resolve relative dates: "today" = ${today}, "yesterday" = one day before today, etc.
- Match to the most likely account and category from the lists above
- If the user explicitly names an account or category, use that one
- Return null for account_id/category_id only if you truly cannot determine a match`,
    maxOutputTokens: 200,
  });

  if (!output) {
    return Response.json({ error: "Could not parse transaction" }, { status: 422 });
  }

  // Validate that returned IDs actually exist
  const validAccount = accounts.some((a) => a.id === output.account_id);
  const validCategory = categories.some((c) => c.id === output.category_id);

  return Response.json({
    ...output,
    account_id: validAccount ? output.account_id : null,
    category_id: validCategory ? output.category_id : null,
    account_name: validAccount ? output.account_name : null,
    category_name: validCategory ? output.category_name : null,
  });
}
