import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { getAccountsWithDetails } from "@/db/queries/accounts";
import { getCategoriesByUser } from "@/db/queries/categories";

const parseSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  description: z.string(),
  date: z.string(),
  account_id: z.string().nullable(),
  category_id: z.string().nullable(),
  account_name: z.string().nullable(),
  category_name: z.string().nullable(),
});

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

  const { text: responseText } = await generateText({
    model: groq("openai/gpt-oss-20b"),
    prompt: `You are a financial transaction parser. Parse the user's natural language into a structured transaction.
Return ONLY a JSON object with these exact fields:
- type: "income" or "expense"
- amount: number (positive)
- description: string (short, clean description)
- date: string (YYYY-MM-DD format)
- account_id: string or null (id from the accounts list)
- category_id: string or null (id from the categories list)
- account_name: string or null (name of matched account)
- category_name: string or null (name of matched category)

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
- Return null for account_id/category_id only if you truly cannot determine a match

Respond with ONLY the JSON object, no other text.`,
    maxOutputTokens: 300,
  });

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: "Could not parse transaction" }, { status: 422 });
  }

  const parsed = parseSchema.safeParse(JSON.parse(jsonMatch[0]));
  if (!parsed.success) {
    return Response.json({ error: "Could not parse transaction" }, { status: 422 });
  }

  const output = parsed.data;

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
