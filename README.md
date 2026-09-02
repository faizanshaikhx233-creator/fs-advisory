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

- **Frontend**: Next.js (App Router) + Tailwind CSS. All data lives in `client/src/lib/seed.json`; an in-browser store + virtual backend (`client/src/lib/store.js`, `client/src/lib/virtual-backend.js`) power every report. Statically exported for GitHub Pages, so it runs with no server.
- **Live site**: https://faizanshaikhx233-creator.github.io/fs-advisory/
- **Optional legacy backend**: Node.js + Express in `server/` (JSON-file storage, no DB install) — kept but not required by the Next.js app.

## Live data model

All accounting data is committed as JSON: journal entries + lines, chart of accounts, people. Any visitor's edits save to their own browser (localStorage). To publish new entries for everyone: edit `server/data/*.json` → regenerate the seed → rebuild → redeploy.

## How to run

> Note: Node.js isn't installed system-wide, so a portable copy is used.

- **Dev**: in `client/`, `npm install` then `npm run dev` → http://localhost:3000/fs-advisory
- **Production build (static export for GitHub Pages)**: in `client/`, `npm run build` → output in `client/out/`
- **Verify accounting with real data**: `node --experimental-loader ./scripts/json.loader.mjs ./scripts/test-virtual.mjs` in the repo root
- **Deploy**: push `client/out/**` to the `gh-pages` branch (must include an empty `.nojekyll` so GitHub Pages keeps `_next/`)

**Legacy manual run (optional):**

```bash
# 1. Set portable node on PATH
set "PATH=C:\Users\ADMIN\AppData\Local\Temp\opencode\node\node-v24.19.0-win-x64;%PATH%"

# 2. Install deps (once)
cd fs-advisory && npm install
cd client && npm install

# 3. Run the Next.js dev server (static app; no API needed)
cd client && npm run dev
```

Open **http://localhost:3000/fs-advisory** in your browser.

## Data Storage

The live ledger is committed as JSON in `client/src/lib/seed.json` (78 account heads, 95 journal entries, 11 staff) and powers every page in the browser. Per-visitor edits are saved to that browser's localStorage only.

The optional legacy Express backend can also run against its own JSON store in `server/data/` (auto-seeds on first run; useful for test uploads). That folder is git-ignored.

## Bank statement import format

Upload a **CSV** with columns: `Date, Description, Debit, Credit, Balance`.
The upload stores transactions for preview/reconciliation. Convert your bank statement to CSV before uploading.
