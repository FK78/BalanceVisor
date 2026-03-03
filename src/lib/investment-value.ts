import { getTrading212Connection, getManualHoldings } from "@/db/queries/investments";
import { getT212AccountSummary } from "@/lib/trading212";
import { getQuotes } from "@/lib/yahoo-finance";
import { decrypt } from "@/lib/encryption";
import { logger } from "@/lib/logger";

export async function getInvestmentValue(userId: string): Promise<number> {
  const [t212Connection, manualHoldings] = await Promise.all([
    getTrading212Connection(userId),
    getManualHoldings(userId),
  ]);

  let value = 0;

  if (t212Connection) {
    try {
      const apiKey = decrypt(t212Connection.api_key_encrypted);
      const apiSecret = decrypt(t212Connection.api_secret_encrypted);
      const summary = await getT212AccountSummary(apiKey, apiSecret, t212Connection.environment);
      value += summary.totalValue;
    } catch (err) {
      logger.error("investment-value", "T212 fetch failed", err);
    }
  }

  if (manualHoldings.length > 0) {
    const tickers = manualHoldings.map((h) => h.ticker);
    const quotes = await getQuotes(tickers);
    for (const h of manualHoldings) {
      const price = quotes.get(h.ticker)?.currentPrice ?? h.current_price ?? h.average_price;
      value += price * h.quantity;
    }
  }

  return value;
}
