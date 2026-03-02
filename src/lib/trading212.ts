export type T212AccountSummary = {
  cash: {
    availableToTrade: number;
    inPies: number;
    reservedForOrders: number;
  };
  currency: string;
  id: string;
  investments: {
    currentValue: number;
    realizedProfitLoss: number;
    totalCost: number;
    unrealizedProfitLoss: number;
  };
  totalValue: number;
};

export type T212Position = {
  averagePricePaid: string;
  createdAt: string;
  currentPrice: number;
  instrument: {
    isin: string;
    currencyCode: string;
    name: string;
    shortName: string;
    ticker: string;
    type: string;
  };
  quantity: number;
  quantityAvailableForTrading: number;
  quantityInPies: number;
  walletImpact: {
    currentValue: number;
    investedValue: number;
    profitLoss: number;
    profitLossPercent: number;
  };
};

const BASE_URLS: Record<string, string> = {
  live: "https://live.trading212.com/api/v0",
  demo: "https://demo.trading212.com/api/v0",
};

async function t212Fetch<T>(apiKey: string, environment: string, path: string): Promise<T> {
  const baseUrl = BASE_URLS[environment] ?? BASE_URLS.live;
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Trading 212 API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getT212AccountSummary(
  apiKey: string,
  environment: string = "live",
): Promise<T212AccountSummary> {
  return t212Fetch<T212AccountSummary>(apiKey, environment, "/equity/account/summary");
}

export async function getT212Positions(
  apiKey: string,
  environment: string = "live",
): Promise<T212Position[]> {
  return t212Fetch<T212Position[]>(apiKey, environment, "/equity/positions");
}
