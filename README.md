<p align="center">
  <img src="public/logo.svg" alt="BalanceVisor logo" width="120" height="120" />
</p>

<h1 align="center">BalanceVisor</h1>

<p align="center">A personal finance dashboard for tracking accounts, budgets, transactions, investments, and savings goals — built with <strong>Next.js 16</strong>, <strong>Drizzle ORM</strong>, and <strong>Supabase Postgres</strong>.</p>

## Features

### Core
- **Dashboard** — Net worth (accounts + investments), summary cards with month-over-month trends, recent transactions, spending by category, cashflow charts, budget progress, and savings goals at a glance
- **Accounts** — CRUD for current accounts, savings, credit cards, and investment accounts with automatic balance adjustment on transaction changes
- **Transactions** — Income and expense tracking with category labels, account attribution, recurring patterns (daily/weekly/biweekly/monthly/yearly), CSV import, and data export
- **Categories** — Custom spending categories with icons, colours, and auto-categorisation rules for imported transactions
- **Budgets** — Monthly or weekly spending limits per category with progress tracking, threshold alerts (browser + email via Resend), and notification bell
- **Goals** — Savings goals with target amounts, deadlines, contribution tracking, and progress visualisation

### Investments
- **Trading 212** — Connect via API key to sync account summary and open positions in real-time (Live and Demo environments)
- **Manual Holdings** — Search tickers via Yahoo Finance, track quantity and cost basis, auto-refresh prices when stale (>15 min)
- **Portfolio View** — Summary cards (total value, gain/loss, cost basis), allocation pie chart, per-holding gain/loss bar chart, unified holdings table

### Open Banking
- **TrueLayer Integration** — Link bank accounts via OAuth, sync accounts and transactions automatically (sandbox and production)

### Security
- **Encryption at Rest** — Account names, transaction descriptions, TrueLayer tokens, and Trading 212 API keys encrypted with AES-256-GCM
- **Migration Script** — One-time script to encrypt existing plaintext data in-place

### Other
- **Onboarding** — Guided setup flow for base currency, accounts, categories, and budgets with skip options
- **Authentication** — Supabase Auth with login, sign-up, password reset, and email confirmation
- **Dark Mode** — Theme toggle with system preference support
- **Responsive** — Mobile-first layout with adaptive navbar (shadcn dropdowns)

## Tech Stack

| Layer         | Technology                                            |
| ------------- | ----------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Server Components)            |
| Language      | TypeScript                                            |
| Database      | PostgreSQL via Supabase                               |
| ORM           | Drizzle ORM + Drizzle Kit                             |
| DB Driver     | postgres.js                                           |
| Auth          | Supabase Auth (SSR)                                   |
| Styling       | Tailwind CSS 4                                        |
| UI Components | shadcn/ui, Radix UI, Lucide icons                     |
| Charts        | Recharts                                              |
| Integrations  | TrueLayer (open banking), Trading 212, Yahoo Finance  |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── truelayer/          # OAuth connect + callback routes
│   ├── auth/                   # Login, sign-up, password reset pages
│   ├── dashboard/
│   │   ├── accounts/           # Accounts page
│   │   ├── budgets/            # Budgets page
│   │   ├── categories/         # Categories + auto-categorisation rules
│   │   ├── goals/              # Savings goals page
│   │   ├── investments/        # Portfolio page (T212 + manual holdings)
│   │   ├── transactions/       # Transactions page + CSV export
│   │   ├── layout.tsx          # Dashboard shell & navbar
│   │   └── page.tsx            # Dashboard overview
│   ├── onboarding/             # Guided first-run setup
│   └── page.tsx                # Landing page
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── *Charts.tsx             # Recharts wrappers (cashflow, budgets, categories, investments, accounts)
│   ├── DashboardNav.tsx        # Responsive nav with dropdown menus
│   ├── ConnectBankButton.tsx   # TrueLayer open banking
│   ├── ConnectTrading212Dialog.tsx
│   ├── AddHoldingDialog.tsx    # Manual investment entry with ticker search
│   ├── ImportCSVDialog.tsx     # CSV transaction import with column mapping
│   ├── NotificationBell.tsx    # Budget alert notifications
│   └── ...                     # Form dialogs, delete buttons, auth forms
├── db/
│   ├── schema.ts               # Drizzle table definitions
│   ├── queries/                # Read-only data access (per domain)
│   ├── mutations/              # Server actions (writes + revalidation)
│   └── migrations/             # One-off migration scripts
├── lib/
│   ├── encryption.ts           # AES-256-GCM encrypt/decrypt/isEncrypted
│   ├── investment-value.ts     # Shared investment value calculator
│   ├── trading212.ts           # Trading 212 API client
│   ├── truelayer.ts            # TrueLayer API client
│   ├── yahoo-finance.ts        # Yahoo Finance quote + search
│   ├── budget-alerts.ts        # Alert threshold checks + email dispatch
│   ├── recurring-transactions.ts # Auto-generate due recurring transactions
│   ├── auto-categorise.ts      # Pattern-based category matching
│   ├── insights.ts             # Spending insights generator
│   ├── supabase/               # Supabase client (server, browser, middleware)
│   └── ...                     # Formatters, date helpers, utils
└── index.ts                    # Shared DB instance (postgres.js driver)
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (or any PostgreSQL instance)

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/FK78/balancevisor.git
   cd balancevisor
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in the required values:

   | Variable | Required | Description |
   | -------- | -------- | ----------- |
   | `DATABASE_URL` | Yes | Supabase Postgres connection string (Transaction pooler, port 6543) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
   | `NEXT_PUBLIC_SITE_URL` | Yes | App URL (`http://localhost:3000` for dev) |
   | `ENCRYPTION_KEY` | Yes | 32-byte hex key for AES-256-GCM encryption |
   | `RESEND_API_KEY` | No | Resend API key for email budget alerts |
   | `TRUELAYER_CLIENT_ID` | No | TrueLayer app credentials for open banking |
   | `TRUELAYER_CLIENT_SECRET` | No | TrueLayer app credentials for open banking |

   Generate an encryption key:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Create tables & seed the database**

   Run the full `seed.sql` in the Supabase SQL Editor or via CLI:

   ```bash
   psql $DATABASE_URL -f seed.sql
   ```

   This creates all tables, enums, and inserts default category templates.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Start the development server               |
| `npm run build`   | Create a production build                  |
| `npm run start`   | Serve the production build                 |
| `npm run lint`    | Run ESLint                                 |

## Database Schema

Managed by Drizzle ORM (`src/db/schema.ts`):

| Table | Description |
| ----- | ----------- |
| `accounts` | Financial accounts (current, savings, credit card, investment) with encrypted names |
| `transactions` | Income/expense records with encrypted descriptions, recurring patterns, and category/account links |
| `categories` | User spending categories with colour and icon |
| `budgets` | Spending limits per category (monthly/weekly) |
| `goals` | Savings goals with target amount, deadline, and contributions |
| `budget_alert_preferences` | Per-budget alert thresholds (browser + email) |
| `budget_notifications` | Dispatched alert history |
| `categorisation_rules` | Pattern-based auto-categorisation for transactions |
| `truelayer_connections` | OAuth tokens (encrypted) for open banking |
| `trading212_connections` | Encrypted API keys for Trading 212 |
| `manual_holdings` | User-entered investment positions with cached Yahoo Finance prices |
| `default_category_templates` | Built-in category templates for onboarding |
| `user_onboarding` | Per-user onboarding state and base currency |

## License

MIT
