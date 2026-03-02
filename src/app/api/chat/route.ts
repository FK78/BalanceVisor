import { groq } from "@ai-sdk/groq";
import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { getCurrentUserId } from "@/lib/auth";
import { getAccountsWithDetails } from "@/db/queries/accounts";
import { getBudgets } from "@/db/queries/budgets";
import { getGoals } from "@/db/queries/goals";
import { getDebtsSummary } from "@/db/queries/debts";
import { getActiveSubscriptionsTotals, getUpcomingRenewals } from "@/db/queries/subscriptions";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { getMonthlyIncomeExpenseTrend, getTotalsByType, getTotalSpendByCategoryThisMonth } from "@/db/queries/transactions";
import { getInvestmentValue } from "@/lib/investment-value";
import { getMonthRange } from "@/lib/date";
import { formatCurrency } from "@/lib/formatCurrency";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const userId = await getCurrentUserId();
  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(1);

  const [
    accounts,
    budgets,
    goals,
    debtSummary,
    subscriptionTotals,
    upcomingRenewals,
    baseCurrency,
    income,
    expenses,
    lastMonthIncome,
    lastMonthExpenses,
    spendByCategory,
    monthlyTrend,
    investmentValue,
  ] = await Promise.all([
    getAccountsWithDetails(userId),
    getBudgets(userId),
    getGoals(userId),
    getDebtsSummary(userId),
    getActiveSubscriptionsTotals(userId),
    getUpcomingRenewals(userId, 14),
    getUserBaseCurrency(userId),
    getTotalsByType(userId, "income", thisMonth.start, thisMonth.end),
    getTotalsByType(userId, "expense", thisMonth.start, thisMonth.end),
    getTotalsByType(userId, "income", lastMonth.start, lastMonth.end),
    getTotalsByType(userId, "expense", lastMonth.start, lastMonth.end),
    getTotalSpendByCategoryThisMonth(userId),
    getMonthlyIncomeExpenseTrend(userId, 6),
    getInvestmentValue(userId),
  ]);

  const liabilityTypes = new Set(["creditCard"]);
  const totalAssets = accounts
    .filter((a) => !liabilityTypes.has(a.type ?? ""))
    .reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => liabilityTypes.has(a.type ?? ""))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities + investmentValue;

  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date());

  const financialContext = `
## User's Financial Snapshot (${monthName})
Currency: ${baseCurrency}

### Net Worth
- Net worth: ${formatCurrency(netWorth, baseCurrency)}
- Total assets: ${formatCurrency(totalAssets, baseCurrency)}
- Total liabilities: ${formatCurrency(totalLiabilities, baseCurrency)}
- Investment value: ${formatCurrency(investmentValue, baseCurrency)}

### Income & Expenses (This Month)
- Income: ${formatCurrency(income, baseCurrency)}
- Expenses: ${formatCurrency(expenses, baseCurrency)}
- Net: ${formatCurrency(income - expenses, baseCurrency)}
- Savings rate: ${income > 0 ? Math.round(((income - expenses) / income) * 100) : 0}%

### Last Month Comparison
- Last month income: ${formatCurrency(lastMonthIncome, baseCurrency)}
- Last month expenses: ${formatCurrency(lastMonthExpenses, baseCurrency)}
- Income change: ${lastMonthIncome > 0 ? Math.round(((income - lastMonthIncome) / lastMonthIncome) * 100) : 0}%
- Expense change: ${lastMonthExpenses > 0 ? Math.round(((expenses - lastMonthExpenses) / lastMonthExpenses) * 100) : 0}%

### Accounts (${accounts.length})
${accounts.map((a) => `- ${a.accountName} (${a.type}): ${formatCurrency(a.balance, baseCurrency)} — ${a.transactions} transactions`).join("\n")}

### Budgets (${budgets.length})
${budgets.map((b) => {
  const pct = b.budgetAmount > 0 ? Math.round((b.budgetSpent / b.budgetAmount) * 100) : 0;
  return `- ${b.budgetCategory}: ${formatCurrency(b.budgetSpent, baseCurrency)} / ${formatCurrency(b.budgetAmount, baseCurrency)} (${pct}% used, ${b.budgetPeriod})`;
}).join("\n")}

### Spending by Category (This Month)
${spendByCategory.map((c) => `- ${c.category}: ${formatCurrency(Number(c.total ?? 0), baseCurrency)}`).join("\n")}

### 6-Month Cashflow Trend
${monthlyTrend.map((m) => `- ${m.month}: Income ${formatCurrency(m.income, baseCurrency)}, Expenses ${formatCurrency(m.expenses, baseCurrency)}, Net ${formatCurrency(m.net, baseCurrency)}`).join("\n")}

### Savings Goals (${goals.length})
${goals.map((g) => {
  const pct = g.target_amount > 0 ? Math.round((g.saved_amount / g.target_amount) * 100) : 0;
  const deadline = g.target_date ? ` — deadline: ${g.target_date}` : "";
  return `- ${g.name}: ${formatCurrency(g.saved_amount, baseCurrency)} / ${formatCurrency(g.target_amount, baseCurrency)} (${pct}%)${deadline}`;
}).join("\n")}

### Debts
- Active debts: ${debtSummary.activeCount}
- Total remaining: ${formatCurrency(debtSummary.totalRemaining, baseCurrency)}
- Total minimum payment: ${formatCurrency(debtSummary.totalMinimumPayment, baseCurrency)}/mo
- Overall paid off: ${debtSummary.overallPct}%
${debtSummary.active.map((d) => `- ${d.name}: ${formatCurrency(d.remaining_amount, baseCurrency)} remaining of ${formatCurrency(d.original_amount, baseCurrency)}`).join("\n")}

### Subscriptions
- Active: ${subscriptionTotals.count}
- Monthly cost: ${formatCurrency(subscriptionTotals.monthly, baseCurrency)}
- Yearly cost: ${formatCurrency(subscriptionTotals.yearly, baseCurrency)}
${upcomingRenewals.map((s) => `- ${s.name}: ${formatCurrency(s.amount, baseCurrency)} due ${s.next_billing_date}`).join("\n")}
`.trim();

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: `You are BalanceVisor AI, a helpful and knowledgeable personal finance assistant embedded in the user's finance dashboard. You have access to the user's real financial data shown below.

Your role:
- Answer questions about the user's finances accurately using the data provided
- Provide actionable, personalised advice based on their actual numbers
- Highlight trends, risks, and opportunities
- Be encouraging but honest — flag overspending or risks clearly
- Use the user's currency (${baseCurrency}) when mentioning amounts
- Keep responses concise and well-structured with markdown formatting
- If asked about something not in the data, say so clearly rather than guessing

${financialContext}`,
    messages: await convertToModelMessages(messages as UIMessage[]),
    maxOutputTokens: 1024,
  });

  return result.toUIMessageStreamResponse();
}
