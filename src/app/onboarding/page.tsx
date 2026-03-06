import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingCategoryForm } from "@/components/OnboardingCategoryForm";
import { getCurrentUserId } from "@/lib/auth";
import { getAccountsWithDetails } from "@/db/queries/accounts";
import { getCategoriesByUser } from "@/db/queries/categories";
import { getBudgets } from "@/db/queries/budgets";
import { getGoals } from "@/db/queries/goals";
import { getDebts } from "@/db/queries/debts";
import { getSubscriptions } from "@/db/queries/subscriptions";
import { getTrading212Connection, getManualHoldings } from "@/db/queries/investments";
import { getGroupsByUser } from "@/db/queries/investment-groups";
import { getDefaultCategoryTemplates, getOnboardingState } from "@/db/queries/onboarding";
import { addAccount } from "@/db/mutations/accounts";
import { addCategory } from "@/db/mutations/categories";
import { addBudget } from "@/db/mutations/budgets";
import { addGoal } from "@/db/mutations/goals";
import { addDebt } from "@/db/mutations/debts";
import { addSubscription } from "@/db/mutations/subscriptions";
import { ConnectTrading212Dialog } from "@/components/ConnectTrading212Dialog";
import { AddHoldingDialog } from "@/components/AddHoldingDialog";
import { RefreshPricesButton } from "@/components/RefreshPricesButton";
import { InvestmentGroupDialog } from "@/components/InvestmentGroupDialog";
import { DeleteGroupButton } from "@/components/DeleteGroupButton";
import {
  completeOnboarding,
  continueFromCategories,
  setBaseCurrency,
  skipOnboarding,
} from "@/db/mutations/onboarding";
import { formatCurrency } from "@/lib/formatCurrency";
import { normalizeBaseCurrency, SUPPORTED_BASE_CURRENCIES } from "@/lib/currency";

type Step = "accounts" | "categories" | "budgets" | "goals" | "debts" | "subscriptions" | "investments" | "review";

const currencyLabels: Record<(typeof SUPPORTED_BASE_CURRENCIES)[number], string> = {
  GBP: "British Pound (£)",
  USD: "US Dollar ($)",
  EUR: "Euro (€)",
  CAD: "Canadian Dollar (CA$)",
  AUD: "Australian Dollar (A$)",
};

const ALL_STEPS: Step[] = ["accounts", "categories", "budgets", "goals", "debts", "subscriptions", "investments", "review"];

function normalizeStep(value?: string): Step {
  if (ALL_STEPS.includes(value as Step)) return value as Step;
  return "accounts";
}

async function addOnboardingAccount(formData: FormData) {
  "use server";
  await addAccount(formData);
}

async function addOnboardingCategory(formData: FormData) {
  "use server";
  await addCategory(formData);
}

async function addOnboardingBudget(formData: FormData) {
  "use server";
  await addBudget(formData);
}

async function addOnboardingGoal(formData: FormData) {
  "use server";
  await addGoal(formData);
}

async function addOnboardingDebt(formData: FormData) {
  "use server";
  await addDebt(formData);
}

async function addOnboardingSubscription(formData: FormData) {
  "use server";
  await addSubscription(formData);
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ step?: string }>;
}) {
  const userId = await getCurrentUserId();
  const resolvedSearchParams = await searchParams;
  const step = normalizeStep(resolvedSearchParams?.step);

  const [onboardingState, accounts, categories, budgets, goals, debts, subscriptions, defaultTemplates, t212Connection, manualHoldings, allGroups] =
    await Promise.all([
      getOnboardingState(userId),
      getAccountsWithDetails(userId),
      getCategoriesByUser(userId),
      getBudgets(userId),
      getGoals(userId),
      getDebts(userId),
      getSubscriptions(userId),
      getDefaultCategoryTemplates(),
      getTrading212Connection(userId),
      getManualHoldings(userId),
      getGroupsByUser(userId),
    ]);

  if (onboardingState?.completed) {
    redirect("/dashboard");
  }

  const defaultCategoryPreference = onboardingState?.use_default_categories ?? false;
  const baseCurrency = normalizeBaseCurrency(onboardingState?.base_currency);
  const today = new Date().toISOString().split("T")[0];

  const investmentAccounts = accounts
    .filter((a) => a.type === "investment")
    .map((a) => ({ id: a.id, accountName: a.accountName }));
  const groupOptions = allGroups.map((g) => ({ id: g.id, name: g.name, color: g.color, account_id: g.account_id }));
  const isT212Connected = !!t212Connection;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div className="flex items-start justify-between page-header-gradient">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Set up your workspace</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set up your finances step by step. Every step is optional &mdash; you can always come back later.
          </p>
        </div>
        <form action={skipOnboarding}>
          <Button type="submit" variant="outline">Skip onboarding</Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_STEPS.map((item, i) => (
          <Link key={item} href={`/onboarding?step=${item}`}>
            <div
              className={`rounded-xl border px-3.5 py-2 text-center text-sm font-medium capitalize transition-all duration-200 ${
                step === item
                  ? "bg-primary/10 text-primary border-primary/20 shadow-sm shadow-primary/5"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {i + 1}. {item}
            </div>
          </Link>
        ))}
      </div>

      {step === "accounts" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Accounts</CardTitle>
            <CardDescription>
              Choose your base currency, then create accounts. Every amount in the app uses this currency.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={setBaseCurrency} className="grid gap-4 rounded-md border p-4">
              <div className="grid gap-2">
                <Label htmlFor="base_currency">Base Currency</Label>
                <select
                  id="base_currency"
                  name="base_currency"
                  className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                  defaultValue={baseCurrency}
                >
                  {SUPPORTED_BASE_CURRENCIES.map((currencyCode) => (
                    <option key={currencyCode} value={currencyCode}>
                      {currencyLabels[currencyCode]}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  Selected currency: {currencyLabels[baseCurrency]}
                </p>
              </div>
              <Button type="submit" className="w-fit" variant="outline">Save base currency</Button>
            </form>

            <form action={addOnboardingAccount} className="grid gap-4 rounded-md border p-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Account Name</Label>
                <Input id="name" name="name" placeholder="Main Current Account" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  name="type"
                  className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                  defaultValue="currentAccount"
                >
                  <option value="currentAccount">Current Account</option>
                  <option value="savings">Savings</option>
                  <option value="creditCard">Credit Card</option>
                  <option value="investment">Investment</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="balance">Starting Balance</Label>
                <Input
                  id="balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  defaultValue="0"
                  className="input-no-spinner"
                  required
                />
              </div>
              <Button type="submit" className="w-fit">Add account</Button>
            </form>

            <div className="space-y-2">
              <p className="text-sm font-medium">Your accounts</p>
              {accounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No accounts yet.</p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{account.accountName}</span>
                      <span className="text-muted-foreground">{formatCurrency(account.balance, baseCurrency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button asChild>
                <Link href="/onboarding?step=categories">Continue to categories</Link>
              </Button>
              {accounts.length === 0 && (
                <Button asChild variant="outline">
                  <Link href="/onboarding?step=categories">Skip this step</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "categories" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Categories</CardTitle>
              <CardDescription>
                Choose whether to add default categories, then optionally create your own.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={continueFromCategories} className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    name="use_default_categories"
                    type="checkbox"
                    defaultChecked={defaultCategoryPreference}
                    className="h-4 w-4"
                  />
                  Add default categories from templates
                </label>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {defaultTemplates.map((template) => (
                    <div key={template.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: template.color }}
                      />
                      <span>{template.name}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" name="intent" value="apply">
                    Add selected defaults
                  </Button>
                  <Button type="submit" name="intent" value="continue" variant="outline">
                    Continue to budgets
                  </Button>
                </div>
              </form>
              {categories.length === 0 && (
                <form action={continueFromCategories}>
                  <input type="hidden" name="use_default_categories" value="" />
                  <input type="hidden" name="intent" value="continue" />
                  <Button type="submit" variant="outline">Skip this step</Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add custom category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OnboardingCategoryForm action={addOnboardingCategory} />

              <div className="space-y-2">
                <p className="text-sm font-medium">Your categories</p>
                {categories.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No categories yet.</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "budgets" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Budgets</CardTitle>
            <CardDescription>
              Add budgets now, or skip and do this later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Add at least one category before creating budgets.
              </p>
            ) : (
              <form action={addOnboardingBudget} className="grid gap-4 rounded-md border p-4">
                <div className="grid gap-2">
                  <Label htmlFor="category_id">Category</Label>
                  <select
                    id="category_id"
                    name="category_id"
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input-no-spinner"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="period">Period</Label>
                  <select
                    id="period"
                    name="period"
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    defaultValue="monthly"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" name="start_date" type="date" defaultValue={today} required />
                </div>
                <Button type="submit" className="w-fit">Add budget</Button>
              </form>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Your budgets</p>
              {budgets.length === 0 ? (
                <p className="text-muted-foreground text-sm">No budgets yet.</p>
              ) : (
                <div className="space-y-2">
                  {budgets.map((budget) => (
                    <div key={budget.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{budget.budgetCategory}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(budget.budgetAmount, baseCurrency)} / {budget.budgetPeriod}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button asChild>
                <Link href="/onboarding?step=goals">Continue to goals</Link>
              </Button>
              {budgets.length === 0 && (
                <Button asChild variant="outline">
                  <Link href="/onboarding?step=goals">Skip this step</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "goals" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Goals</CardTitle>
            <CardDescription>
              Set savings goals to track your progress towards targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={addOnboardingGoal} className="grid gap-4 rounded-md border p-4">
              <div className="grid gap-2">
                <Label htmlFor="goal-name">Goal Name</Label>
                <Input id="goal-name" name="name" placeholder="e.g. Emergency Fund, Holiday" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="target_amount">Target Amount</Label>
                  <Input
                    id="target_amount"
                    name="target_amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input-no-spinner"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="saved_amount">Already Saved</Label>
                  <Input
                    id="saved_amount"
                    name="saved_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    className="input-no-spinner"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="target_date">Target Date (optional)</Label>
                <Input id="target_date" name="target_date" type="date" />
              </div>
              <Button type="submit" className="w-fit">Add goal</Button>
            </form>

            <div className="space-y-2">
              <p className="text-sm font-medium">Your goals</p>
              {goals.length === 0 ? (
                <p className="text-muted-foreground text-sm">No goals yet.</p>
              ) : (
                <div className="space-y-2">
                  {goals.map((goal) => (
                    <div key={goal.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{goal.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.saved_amount, baseCurrency)} / {formatCurrency(goal.target_amount, baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button asChild>
                <Link href="/onboarding?step=debts">Continue to debts</Link>
              </Button>
              {goals.length === 0 && (
                <Button asChild variant="outline">
                  <Link href="/onboarding?step=debts">Skip this step</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "debts" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5: Debts</CardTitle>
            <CardDescription>
              Track debts, loans, and credit you&apos;re paying off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={addOnboardingDebt} className="grid gap-4 rounded-md border p-4">
              <div className="grid gap-2">
                <Label htmlFor="debt-name">Debt Name</Label>
                <Input id="debt-name" name="name" placeholder="e.g. Student Loan, Car Finance" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="original_amount">Original Amount</Label>
                  <Input
                    id="original_amount"
                    name="original_amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input-no-spinner"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="remaining_amount">Remaining Amount</Label>
                  <Input
                    id="remaining_amount"
                    name="remaining_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-no-spinner"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="interest_rate"
                    name="interest_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    className="input-no-spinner"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minimum_payment">Min. Payment</Label>
                  <Input
                    id="minimum_payment"
                    name="minimum_payment"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    className="input-no-spinner"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lender">Lender (optional)</Label>
                  <Input id="lender" name="lender" placeholder="e.g. Barclays" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Due Date (optional)</Label>
                  <Input id="due_date" name="due_date" type="date" />
                </div>
              </div>
              <Button type="submit" className="w-fit">Add debt</Button>
            </form>

            <div className="space-y-2">
              <p className="text-sm font-medium">Your debts</p>
              {debts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No debts yet.</p>
              ) : (
                <div className="space-y-2">
                  {debts.map((debt) => (
                    <div key={debt.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{debt.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(debt.remaining_amount, baseCurrency)} remaining
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button asChild>
                <Link href="/onboarding?step=subscriptions">Continue to subscriptions</Link>
              </Button>
              {debts.length === 0 && (
                <Button asChild variant="outline">
                  <Link href="/onboarding?step=subscriptions">Skip this step</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "subscriptions" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6: Subscriptions</CardTitle>
            <CardDescription>
              Track recurring subscriptions like Netflix, Spotify, gym memberships, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {accounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Add at least one account before creating subscriptions.
              </p>
            ) : (
              <form action={addOnboardingSubscription} className="grid gap-4 rounded-md border p-4">
                <div className="grid gap-2">
                  <Label htmlFor="sub-name">Subscription Name</Label>
                  <Input id="sub-name" name="name" placeholder="e.g. Netflix, Spotify" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sub-amount">Amount</Label>
                    <Input
                      id="sub-amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="input-no-spinner"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="billing_cycle">Billing Cycle</Label>
                    <select
                      id="billing_cycle"
                      name="billing_cycle"
                      className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                      defaultValue="monthly"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sub-account">Account</Label>
                    <select
                      id="sub-account"
                      name="account_id"
                      className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                      required
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="next_billing_date">Next Billing Date</Label>
                    <Input id="next_billing_date" name="next_billing_date" type="date" defaultValue={today} required />
                  </div>
                </div>
                {categories.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="sub-category">Category (optional)</Label>
                    <select
                      id="sub-category"
                      name="category_id"
                      className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Button type="submit" className="w-fit">Add subscription</Button>
              </form>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Your subscriptions</p>
              {subscriptions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No subscriptions yet.</p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{sub.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(sub.amount, baseCurrency)} / {sub.billing_cycle}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button asChild>
                <Link href="/onboarding?step=investments">Continue to investments</Link>
              </Button>
              {subscriptions.length === 0 && (
                <Button asChild variant="outline">
                  <Link href="/onboarding?step=investments">Skip this step</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "investments" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 7: Investments</CardTitle>
            <CardDescription>
              Connect Trading 212 to auto-sync your portfolio, or add holdings manually with live price tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Trading 212</p>
              <p className="text-muted-foreground text-xs">
                {isT212Connected
                  ? "Connected — your positions will sync automatically."
                  : "Connect your Trading 212 account to auto-import positions."}
              </p>
              <ConnectTrading212Dialog
                isConnected={isT212Connected}
                investmentAccounts={investmentAccounts}
                currentAccountId={t212Connection?.account_id}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Investment Groups</p>
                  <p className="text-muted-foreground text-xs">
                    Organise holdings into groups (e.g. &ldquo;Tech Stocks&rdquo;, &ldquo;ETFs&rdquo;, &ldquo;Retirement&rdquo;).
                  </p>
                </div>
                <InvestmentGroupDialog investmentAccounts={investmentAccounts} />
              </div>
              {allGroups.length > 0 && (
                <div className="space-y-2">
                  {allGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-medium">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <InvestmentGroupDialog group={group} investmentAccounts={investmentAccounts} />
                        <DeleteGroupButton group={group} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Manual Holdings</p>
              <p className="text-muted-foreground text-xs">
                Add stocks, ETFs, or funds you hold outside Trading 212. Prices update automatically via Yahoo Finance.
              </p>
              <div className="flex flex-wrap gap-2">
                <AddHoldingDialog investmentAccounts={investmentAccounts} groups={groupOptions} />
                {manualHoldings.length > 0 && <RefreshPricesButton />}
              </div>
            </div>

            {manualHoldings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Your manual holdings</p>
                <div className="space-y-2">
                  {manualHoldings.map((h) => (
                    <div key={h.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{h.ticker}</span>
                        <span className="text-muted-foreground text-xs truncate max-w-[160px]">{h.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {h.quantity} shares @ {formatCurrency(h.average_price, baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button asChild>
                <Link href="/onboarding?step=review">Continue to review</Link>
              </Button>
              {!isT212Connected && manualHoldings.length === 0 && (
                <Button asChild variant="outline">
                  <Link href="/onboarding?step=review">Skip this step</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review and finish</CardTitle>
            <CardDescription>
              You can finish now or go back and adjust anything.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold">{accounts.length}</p>
                <p className="text-muted-foreground text-xs">Accounts</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold">{categories.length}</p>
                <p className="text-muted-foreground text-xs">Categories</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold">{budgets.length}</p>
                <p className="text-muted-foreground text-xs">Budgets</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold">{goals.length}</p>
                <p className="text-muted-foreground text-xs">Goals</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold">{debts.length}</p>
                <p className="text-muted-foreground text-xs">Debts</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold">{subscriptions.length}</p>
                <p className="text-muted-foreground text-xs">Subscriptions</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold">{(isT212Connected ? 1 : 0) + manualHoldings.length}</p>
                <p className="text-muted-foreground text-xs">Investments</p>
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              You can set up recurring transactions and more from the dashboard after completing onboarding.
            </p>

            <div className="flex gap-2">
              <form action={completeOnboarding}>
                <Button type="submit">Finish onboarding</Button>
              </form>
              <Button asChild variant="outline">
                <Link href="/onboarding?step=accounts">Back to start</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
