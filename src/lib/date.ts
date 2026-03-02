export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getMonthRange(monthsAgo = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { start: toDateString(start), end: toDateString(end) };
}

export function getMonthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function getRecentMonthKeys(monthCount: number): string[] {
  const safeMonthCount = Math.max(1, Math.floor(monthCount));
  const now = new Date();
  const keys: string[] = [];

  for (let monthsAgo = safeMonthCount - 1; monthsAgo >= 0; monthsAgo -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    keys.push(getMonthKey(monthDate));
  }

  return keys;
}

export function getRecentDayKeys(dayCount: number): string[] {
  const safeDayCount = Math.max(1, Math.floor(dayCount));
  const now = new Date();
  const keys: string[] = [];

  for (let daysAgo = safeDayCount - 1; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    keys.push(toDateString(day));
  }

  return keys;
}

export function getTomorrowString(): string {
  const now = new Date();
  return toDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}

export function getNextMonthFirstString(): string {
  const now = new Date();
  return toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 1));
}

export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, (monthIndex ?? 1) - 1, 1);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(date);
}

export function formatDayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
  }).format(new Date(day));
}
