# FS Advisory - Real Estate Accounting Dashboard

An accounting dashboard for **FS Advisory** (real estate agency), configured for the UAE (currency AED, VAT 5%).

## Modules

| Page | Purpose |
|------|---------|
| **Dashboard** | Monthly revenue/expenses/profit, deal counts, agent payables, business structure overview |
| **Chart of Accounts** | Full CoA: cash, receivables, prepayments, VAT receivable/payable, trade license, fixed assets, every expense head (rent, utilities, marketing, insurance, professional fees, etc.) |
| **Journal Entries** | Record manual double-entry transactions with date filter (auto-balancing) |
| **General Ledger** | Account-wise history with running balance; filter by account and date range |
| **Trial Balance** | All accounts with debit/credit totals (auto-balances) |
| **Balance Sheet** | Assets, liabilities, equity + net income, as of any date |
| **Deals & Commission** | Track sales, apply split rules automatically, one-click "close & post commission" |
| **Payroll** | Post fixed salaries (Pakistani staff), 4,000 PKR lead bonus, view commission structure |
| **Bank Import** | Upload CSV bank statements, preview & filter transactions |
| **Profit & Loss** | Revenue, expenses, net profit for any period |

## Commission / Payroll Rules (built in)

- **Faraz Shafi** (Owner & Agent): Company lead → 50/50; Personal lead → 80/20
- **Talha Sardar, Muhammad Basit, Jahanzaib Maqsood** (Agents): 50/50 for both lead types
- **Osama** = Manager, **Zarnigar** = HR (no leads/sales split)
- **Pakistani staff** (Mako, Shafi, Hiba, Rayyan, Sabah): fixed salary + commission
  - Qualified lead → **4,000 PKR** bonus
  - Deal closes → **1.5%** of sale price commission
- **Faraz** withdrawals: recorded as drawings when paid; otherwise held in payable
- VAT **5%** applied to the company commission portion on deal closing
- All amounts in **AED**

## Tech Stack

- **Backend**: Node.js + Express (port 3001), JSON-file storage in `server/data/` (no database install needed)
- **Frontend**: React + Vite + Tailwind CSS (port 5173), proxied to API

## How to run

> Note: Node.js isn't installed system-wide, so a portable copy is used.

**Option A – double-click:** run `start.bat` (starts API + app in two windows).

**Option B – manually:**

```bash
# 1. Set portable node on PATH
set "PATH=C:\Users\ADMIN\AppData\Local\Temp\opencode\node\node-v24.19.0-win-x64;%PATH%"

# 2. Install deps (once)
cd fs-advisory && npm install
cd client && npm install

# 3. Start API (in one terminal)
node server/index.js

# 4. Start app (in another terminal)
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

## Data Storage

All data is stored as JSON files in `server/data/` (97 account heads pre-seeded, 11 staff pre-configured). The database auto-seeds on first run. To reset, delete the files in `server/data/`.

> The ledger data in `server/data/` is git-ignored and never pushed to GitHub.

## Deploying (Render + MongoDB)

For a persistent shared link (data survives restarts), the app can use a MongoDB database. When the `MONGODB_URI` env var is set, the same tables are stored in MongoDB; otherwise it uses local JSON files.

1. Create a free **MongoDB Atlas** cluster (M0) → Database Access user → get the connection string (`mongodb+srv://user:pass@...`).
2. Push this repo to GitHub.
3. On **Render**, choose "New → Blueprint" and point it at this repo (uses `render.yaml`).
4. Set the `MONGODB_URI` env var to your Atlas connection string.
5. Deploy — Render runs `npm start` and serves both the API and the built frontend.

## Bank statement import format

Upload a **CSV** with columns: `Date, Description, Debit, Credit, Balance`.
The upload stores transactions for preview/reconciliation. Convert your bank statement to CSV before uploading.
