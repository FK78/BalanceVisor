import { DEFAULT_BASE_CURRENCY, normalizeBaseCurrency } from "@/lib/currency";

export function formatCurrency(amount: number, currency: string = DEFAULT_BASE_CURRENCY) {
  const resolvedCurrency = normalizeBaseCurrency(currency);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: resolvedCurrency,
  }).format(Math.abs(amount));
}

export function formatCompactCurrency(amount: number, currency: string = DEFAULT_BASE_CURRENCY) {
  const resolvedCurrency = normalizeBaseCurrency(currency);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: resolvedCurrency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
