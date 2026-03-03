/* eslint-disable @typescript-eslint/no-explicit-any */
import YahooFinanceClass from "yahoo-finance2";
import { logger } from "@/lib/logger";

const yahooFinance: any = new (YahooFinanceClass as any)();

export type YahooQuote = {
  ticker: string;
  name: string;
  currentPrice: number;
  currency: string;
};

// Currencies that represent sub-units (pence, cents, etc.)
// Yahoo Finance returns "GBp" for UK stocks priced in pence
const SUB_UNIT_CURRENCIES: Record<string, { major: string; divisor: number }> = {
  GBp: { major: "GBP", divisor: 100 },
  GBX: { major: "GBP", divisor: 100 },
  ZAc: { major: "ZAR", divisor: 100 },
};

export async function getQuote(ticker: string): Promise<YahooQuote | null> {
  try {
    const result: any = await yahooFinance.quote(ticker);
    if (!result || !result.regularMarketPrice) return null;

    let price = result.regularMarketPrice;
    let currency = result.currency ?? "USD";

    const subUnit = SUB_UNIT_CURRENCIES[currency];
    if (subUnit) {
      price = price / subUnit.divisor;
      currency = subUnit.major;
    }

    return {
      ticker: result.symbol,
      name: result.shortName ?? result.longName ?? ticker,
      currentPrice: price,
      currency,
    };
  } catch {
    logger.warn("yahoo-finance", "Quote fetch failed", { ticker });
    return null;
  }
}

export async function getQuotes(tickers: string[]): Promise<Map<string, YahooQuote>> {
  const results = new Map<string, YahooQuote>();
  if (tickers.length === 0) return results;

  const promises = tickers.map(async (ticker) => {
    const quote = await getQuote(ticker);
    if (quote) results.set(ticker, quote);
  });

  await Promise.all(promises);
  return results;
}

export async function searchTicker(query: string) {
  try {
    const result: any = await yahooFinance.search(query, { newsCount: 0 });
    return ((result.quotes ?? []) as any[])
      .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .slice(0, 8)
      .map((q: any) => ({
        ticker: q.symbol as string,
        name: (q.shortname ?? q.longname ?? q.symbol) as string,
        exchange: q.exchDisp as string | undefined,
      }));
  } catch {
    logger.warn("yahoo-finance", "Ticker search failed", { query });
    return [];
  }
}
