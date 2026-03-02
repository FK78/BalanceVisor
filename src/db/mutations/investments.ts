"use server";

import { db } from "@/index";
import { trading212ConnectionsTable, manualHoldingsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { getQuote } from "@/lib/yahoo-finance";

function revalidateInvestments() {
  revalidatePath("/dashboard/investments");
  revalidatePath("/dashboard");
}

export async function connectTrading212(formData: FormData) {
  const userId = await getCurrentUserId();
  const apiKey = formData.get("apiKey") as string;
  const environment = (formData.get("environment") as string) || "live";

  if (!apiKey) throw new Error("API key is required");

  const encrypted = encrypt(apiKey);

  await db
    .insert(trading212ConnectionsTable)
    .values({
      user_id: userId,
      api_key_encrypted: encrypted,
      environment,
    })
    .onConflictDoUpdate({
      target: trading212ConnectionsTable.user_id,
      set: {
        api_key_encrypted: encrypted,
        environment,
        connected_at: new Date(),
      },
    });

  revalidateInvestments();
}

export async function disconnectTrading212() {
  const userId = await getCurrentUserId();
  await db
    .delete(trading212ConnectionsTable)
    .where(eq(trading212ConnectionsTable.user_id, userId));
  revalidateInvestments();
}

export async function addManualHolding(formData: FormData) {
  const userId = await getCurrentUserId();
  const ticker = (formData.get("ticker") as string).toUpperCase();
  const name = formData.get("name") as string;
  const quantity = parseFloat(formData.get("quantity") as string);
  const averagePrice = parseFloat(formData.get("averagePrice") as string);
  const currency = (formData.get("currency") as string) || "GBP";

  if (!ticker || !name || isNaN(quantity) || isNaN(averagePrice)) {
    throw new Error("All fields are required");
  }

  const quote = await getQuote(ticker);

  await db.insert(manualHoldingsTable).values({
    user_id: userId,
    ticker,
    name,
    quantity,
    average_price: averagePrice,
    current_price: quote?.currentPrice ?? null,
    currency,
    last_price_update: quote ? new Date() : null,
  });

  revalidateInvestments();
}

export async function editManualHolding(id: string, formData: FormData) {
  const userId = await getCurrentUserId();
  const ticker = (formData.get("ticker") as string).toUpperCase();
  const name = formData.get("name") as string;
  const quantity = parseFloat(formData.get("quantity") as string);
  const averagePrice = parseFloat(formData.get("averagePrice") as string);

  await db
    .update(manualHoldingsTable)
    .set({ ticker, name, quantity, average_price: averagePrice })
    .where(
      and(
        eq(manualHoldingsTable.id, id),
        eq(manualHoldingsTable.user_id, userId),
      ),
    );

  revalidateInvestments();
}

export async function deleteManualHolding(id: string) {
  const userId = await getCurrentUserId();
  await db
    .delete(manualHoldingsTable)
    .where(
      and(
        eq(manualHoldingsTable.id, id),
        eq(manualHoldingsTable.user_id, userId),
      ),
    );
  revalidateInvestments();
}

export async function refreshManualHoldingPrices() {
  const userId = await getCurrentUserId();
  const holdings = await db
    .select()
    .from(manualHoldingsTable)
    .where(eq(manualHoldingsTable.user_id, userId));

  const updates = holdings.map(async (holding) => {
    const quote = await getQuote(holding.ticker);
    if (quote) {
      await db
        .update(manualHoldingsTable)
        .set({
          current_price: quote.currentPrice,
          last_price_update: new Date(),
        })
        .where(eq(manualHoldingsTable.id, holding.id));
    }
  });

  await Promise.all(updates);
  revalidateInvestments();
}
