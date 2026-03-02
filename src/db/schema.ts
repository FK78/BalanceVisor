import { boolean, date, integer, pgEnum, pgTable, real, timestamp, varchar, uuid, text } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", ["currentAccount", "savings", "creditCard", "investment"]);
export const periodEnum = pgEnum("period", ["monthly", "weekly"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "transfer"]);
export const recurringPatternEnum = pgEnum("recurring_pattern", ["daily", "weekly", "biweekly", "monthly", "yearly"]);

export const defaultCategoryTemplatesTable = pgTable("default_category_templates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  color: varchar({ length: 8 }).notNull(),
  icon: varchar({ length: 255 }),
  sort_order: integer().notNull().default(0),
  is_active: boolean().notNull().default(true),
});

export const userOnboardingTable = pgTable("user_onboarding", {
  user_id: uuid("user_id").primaryKey(),
  base_currency: varchar({ length: 3 }).notNull().default("GBP"),
  use_default_categories: boolean().notNull().default(false),
  completed: boolean().notNull().default(false),
  completed_at: timestamp("completed_at", { withTimezone: true }),
});

export const truelayerConnectionsTable = pgTable("truelayer_connections", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token").notNull(),
  token_expires_at: timestamp("token_expires_at", { withTimezone: true }).notNull(),
  provider_name: varchar("provider_name", { length: 255 }),
  connected_at: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountsTable = pgTable("accounts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull(),
  name: text().notNull(),
  type: accountTypeEnum(),
  balance: real().notNull(),
  currency: varchar({ length: 3 }).notNull(),
  truelayer_id: varchar("truelayer_id", { length: 255 }),
  truelayer_connection_id: integer("truelayer_connection_id").references(() => truelayerConnectionsTable.id),
});

export const categoriesTable = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull(),
  name: varchar({ length: 255 }).notNull(),
  color: varchar({ length: 8 }).notNull(),
  icon: varchar({ length: 255 }),
});

export const transactionsTable = pgTable("transactions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  account_id: integer("account_id").references(() => accountsTable.id),
  category_id: integer("category_id").references(() => categoriesTable.id),
  type: transactionTypeEnum().notNull(),
  amount: real().notNull(),
  description: text().notNull(),
  date: date(),
  is_recurring: boolean().notNull(),
  recurring_pattern: recurringPatternEnum("recurring_pattern"),
  next_recurring_date: date("next_recurring_date"),
  created_at: date().defaultNow(),
  transfer_account_id: integer("transfer_account_id").references(() => accountsTable.id),
  truelayer_id: varchar("truelayer_id", { length: 255 }),
  is_split: boolean("is_split").notNull().default(false),
});

export const budgetsTable = pgTable("budgets", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_id: uuid("user_id").notNull(),
    category_id: integer("category_id").references(() => categoriesTable.id),
    amount: real().notNull(),
    period: periodEnum(),
    start_date: date()
})

export const categorisationRulesTable = pgTable("categorisation_rules", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_id: uuid("user_id").notNull(),
    pattern: varchar({ length: 255 }).notNull(),
    category_id: integer("category_id").references(() => categoriesTable.id),
    priority: integer().notNull(),
})

export const goalsTable = pgTable("goals", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull(),
  name: varchar({ length: 255 }).notNull(),
  target_amount: real("target_amount").notNull(),
  saved_amount: real("saved_amount").notNull().default(0),
  target_date: date("target_date"),
  icon: varchar({ length: 255 }),
  color: varchar({ length: 8 }).notNull().default("#6366f1"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const debtsTable = pgTable("debts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull(),
  name: varchar({ length: 255 }).notNull(),
  original_amount: real("original_amount").notNull(),
  remaining_amount: real("remaining_amount").notNull(),
  interest_rate: real("interest_rate").notNull().default(0),
  minimum_payment: real("minimum_payment").notNull().default(0),
  due_date: date("due_date"),
  lender: varchar({ length: 255 }),
  color: varchar({ length: 8 }).notNull().default("#ef4444"),
  is_paid_off: boolean("is_paid_off").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const debtPaymentsTable = pgTable("debt_payments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  debt_id: integer("debt_id").notNull().references(() => debtsTable.id, { onDelete: "cascade" }),
  account_id: integer("account_id").notNull().references(() => accountsTable.id),
  amount: real().notNull(),
  date: date().notNull(),
  note: text(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const budgetAlertPreferencesTable = pgTable("budget_alert_preferences", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    budget_id: integer("budget_id").notNull().references(() => budgetsTable.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").notNull(),
    threshold: real().notNull().default(80),
    browser_alerts: boolean("browser_alerts").notNull().default(true),
    email_alerts: boolean("email_alerts").notNull().default(false),
})

export const trading212ConnectionsTable = pgTable("trading212_connections", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull().unique(),
  api_key_encrypted: text("api_key_encrypted").notNull(),
  environment: varchar({ length: 10 }).notNull().default("live"),
  connected_at: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const manualHoldingsTable = pgTable("manual_holdings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull(),
  ticker: varchar({ length: 20 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  quantity: real().notNull(),
  average_price: real("average_price").notNull(),
  current_price: real("current_price"),
  currency: varchar({ length: 3 }).notNull().default("GBP"),
  last_price_update: timestamp("last_price_update", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const billingCycleEnum = pgEnum("billing_cycle", ["weekly", "monthly", "quarterly", "yearly"]);

export const subscriptionsTable = pgTable("subscriptions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull(),
  name: varchar({ length: 255 }).notNull(),
  amount: real().notNull(),
  currency: varchar({ length: 3 }).notNull().default("GBP"),
  billing_cycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  next_billing_date: date("next_billing_date").notNull(),
  category_id: integer("category_id").references(() => categoriesTable.id),
  account_id: integer("account_id").notNull().references(() => accountsTable.id),
  url: text(),
  notes: text(),
  is_active: boolean("is_active").notNull().default(true),
  color: varchar({ length: 8 }).notNull().default("#6366f1"),
  icon: varchar({ length: 255 }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionSplitsTable = pgTable("transaction_splits", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  transaction_id: integer("transaction_id").notNull().references(() => transactionsTable.id, { onDelete: "cascade" }),
  category_id: integer("category_id").references(() => categoriesTable.id),
  amount: real().notNull(),
  description: text(),
});

export const netWorthSnapshotsTable = pgTable("net_worth_snapshots", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid("user_id").notNull(),
  date: date().notNull(),
  net_worth: real("net_worth").notNull(),
  total_assets: real("total_assets").notNull().default(0),
  total_liabilities: real("total_liabilities").notNull().default(0),
  investment_value: real("investment_value").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alertTypeEnum = pgEnum("alert_type", ["threshold_warning", "over_budget"]);

export const budgetNotificationsTable = pgTable("budget_notifications", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_id: uuid("user_id").notNull(),
    budget_id: integer("budget_id").notNull().references(() => budgetsTable.id, { onDelete: "cascade" }),
    alert_type: alertTypeEnum("alert_type").notNull(),
    message: text().notNull(),
    is_read: boolean("is_read").notNull().default(false),
    emailed: boolean().notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
