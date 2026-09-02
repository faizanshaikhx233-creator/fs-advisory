const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const TABLES = [
  'chart_of_accounts', 'journal_entries', 'journal_lines', 'people',
  'deals', 'deal_assignments', 'bank_imports', 'bank_transactions', 'settings'
];

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const store = {};
for (const t of TABLES) {
  const file = path.join(DATA_DIR, `${t}.json`);
  if (fs.existsSync(file)) {
    store[t] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    store[t] = [];
  }
}

function persist(table) {
  const file = path.join(DATA_DIR, `${table}.json`);
  fs.writeFileSync(file, JSON.stringify(store[table], null, 2));
}

function nextId(table) {
  const rows = store[table];
  if (rows.length === 0) return 1;
  return Math.max(...rows.map(r => r.id)) + 1;
}

// Small query helper mimicking the needed subset of an ORM
function table(table) {
  return {
    all() { return store[table]; },
    get(id) { return store[table].find(r => r.id == id); },
    where(fn) { return store[table].filter(fn); },
    replaceAll(rows) {
      store[table] = rows;
      persist(table);
      return store[table];
    },
    insert(row) {
      const r = { id: nextId(table), ...row };
      store[table].push(r);
      persist(table);
      return r;
    },
    update(id, patch) {
      const idx = store[table].findIndex(r => r.id == id);
      if (idx === -1) return null;
      store[table][idx] = { ...store[table][idx], ...patch, id: Number(id) };
      persist(table);
      return store[table][idx];
    },
    remove(id) {
      const idx = store[table].findIndex(r => r.id == id);
      if (idx === -1) return false;
      store[table].splice(idx, 1);
      persist(table);
      return true;
    },
  };
}

function initializeDatabase() {
  if (store.chart_of_accounts.length > 0) {
    seedIfEmpty();
    return;
  }

  const insertAccount = (row) => table('chart_of_accounts').insert(row);

  const accounts = [
    { code: '1000', name: 'Cash & Cash Equivalents', type: 'Asset', sub_type: 'Current' },
    { code: '1010', name: 'Petty Cash', type: 'Asset', sub_type: 'Current' },
    { code: '1020', name: 'Bank Account - Operating', type: 'Asset', sub_type: 'Current' },
    { code: '1030', name: 'Bank Account - Savings', type: 'Asset', sub_type: 'Current' },
    { code: '1100', name: 'Accounts Receivable', type: 'Asset', sub_type: 'Current' },
    { code: '1110', name: 'Agent Receivable', type: 'Asset', sub_type: 'Current' },
    { code: '1120', name: 'Employee Receivable', type: 'Asset', sub_type: 'Current' },
    { code: '1200', name: 'Prepayments', type: 'Asset', sub_type: 'Current' },
    { code: '1210', name: 'Prepaid Rent', type: 'Asset', sub_type: 'Current' },
    { code: '1220', name: 'Prepaid Insurance', type: 'Asset', sub_type: 'Current' },
    { code: '1230', name: 'Prepaid Trade License', type: 'Asset', sub_type: 'Current' },
    { code: '1240', name: 'Prepaid Internet/Phone', type: 'Asset', sub_type: 'Current' },
    { code: '1250', name: 'Other Prepayments', type: 'Asset', sub_type: 'Current' },
    { code: '1300', name: 'VAT Receivable', type: 'Asset', sub_type: 'Current' },
    { code: '1400', name: 'Fixed Assets', type: 'Asset', sub_type: 'Non-Current' },
    { code: '1410', name: 'Office Equipment', type: 'Asset', sub_type: 'Non-Current' },
    { code: '1420', name: 'Furniture & Fixtures', type: 'Asset', sub_type: 'Non-Current' },
    { code: '1430', name: 'Computer & Electronics', type: 'Asset', sub_type: 'Non-Current' },
    { code: '1500', name: 'Accumulated Depreciation', type: 'Asset', sub_type: 'Non-Current' },

    { code: '2000', name: 'Accounts Payable', type: 'Liability', sub_type: 'Current' },
    { code: '2010', name: 'Agent Payable', type: 'Liability', sub_type: 'Current' },
    { code: '2020', name: 'Employee Salary Payable', type: 'Liability', sub_type: 'Current' },
    { code: '2030', name: 'Commission Payable', type: 'Liability', sub_type: 'Current' },
    { code: '2040', name: 'Bonus Payable', type: 'Liability', sub_type: 'Current' },
    { code: '2100', name: 'VAT Payable', type: 'Liability', sub_type: 'Current' },
    { code: '2200', name: 'Trade License Liability', type: 'Liability', sub_type: 'Current' },
    { code: '2300', name: 'Accrued Expenses', type: 'Liability', sub_type: 'Current' },
    { code: '2400', name: 'Security Deposits Received', type: 'Liability', sub_type: 'Current' },
    { code: '2500', name: 'Long-term Liabilities', type: 'Liability', sub_type: 'Non-Current' },

    { code: '3000', name: "Owner's Capital", type: 'Equity', sub_type: 'Capital' },
    { code: '3100', name: "Owner's Drawings", type: 'Equity', sub_type: 'Drawings' },
    { code: '3200', name: 'Retained Earnings', type: 'Equity', sub_type: 'Retained' },
    { code: '3300', name: 'Current Year Earnings', type: 'Equity', sub_type: 'Retained' },

    { code: '4000', name: 'Commission Income', type: 'Revenue', sub_type: 'Operating' },
    { code: '4010', name: 'Agent Commission Income', type: 'Revenue', sub_type: 'Operating' },
    { code: '4020', name: 'Company Commission Income', type: 'Revenue', sub_type: 'Operating' },
    { code: '4100', name: 'Service Fee Income', type: 'Revenue', sub_type: 'Operating' },
    { code: '4200', name: 'Consultation Fee Income', type: 'Revenue', sub_type: 'Operating' },
    { code: '4300', name: 'Rental Commission Income', type: 'Revenue', sub_type: 'Operating' },
    { code: '4900', name: 'Other Income', type: 'Revenue', sub_type: 'Non-Operating' },
    { code: '4910', name: 'Interest Income', type: 'Revenue', sub_type: 'Non-Operating' },
    { code: '4920', name: 'Miscellaneous Income', type: 'Revenue', sub_type: 'Non-Operating' },

    { code: '5000', name: 'Salary Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '5010', name: 'Basic Salary - UAE Staff', type: 'Expense', sub_type: 'Operating' },
    { code: '5020', name: 'Basic Salary - Pakistani Staff', type: 'Expense', sub_type: 'Operating' },
    { code: '5030', name: 'Commission Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '5040', name: 'Agent Commission Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '5050', name: 'Lead Qualification Bonus', type: 'Expense', sub_type: 'Operating' },
    { code: '5060', name: 'Bonus Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '5070', name: 'End of Service Benefit', type: 'Expense', sub_type: 'Operating' },
    { code: '6000', name: 'Rent Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '6100', name: 'Utilities Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '6110', name: 'Electricity & Water', type: 'Expense', sub_type: 'Operating' },
    { code: '6120', name: 'Internet & Phone', type: 'Expense', sub_type: 'Operating' },
    { code: '6200', name: 'Office Supplies', type: 'Expense', sub_type: 'Operating' },
    { code: '6300', name: 'Marketing & Advertising', type: 'Expense', sub_type: 'Operating' },
    { code: '6400', name: 'Travel & Transport', type: 'Expense', sub_type: 'Operating' },
    { code: '6500', name: 'Trade License Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '6600', name: 'Insurance Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '6610', name: 'Medical Insurance', type: 'Expense', sub_type: 'Operating' },
    { code: '6620', name: 'Property Insurance', type: 'Expense', sub_type: 'Operating' },
    { code: '6700', name: 'Professional Fees', type: 'Expense', sub_type: 'Operating' },
    { code: '6710', name: 'Legal Fees', type: 'Expense', sub_type: 'Operating' },
    { code: '6720', name: 'Audit & Accounting Fees', type: 'Expense', sub_type: 'Operating' },
    { code: '6730', name: 'PRO/Typing Fees', type: 'Expense', sub_type: 'Operating' },
    { code: '6800', name: 'Bank Charges', type: 'Expense', sub_type: 'Operating' },
    { code: '6900', name: 'Depreciation Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '7000', name: 'Entertainment Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '7100', name: 'Miscellaneous Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '7200', name: 'Bad Debt Expense', type: 'Expense', sub_type: 'Operating' },
    { code: '7300', name: 'Penalties & Fines', type: 'Expense', sub_type: 'Operating' },
    { code: '7400', name: 'Staff Welfare', type: 'Expense', sub_type: 'Operating' },
    { code: '7500', name: 'Printing & Stationery', type: 'Expense', sub_type: 'Operating' },
    { code: '7600', name: 'Subscriptions & Memberships', type: 'Expense', sub_type: 'Operating' },
    { code: '7700', name: 'Training & Development', type: 'Expense', sub_type: 'Operating' },
  ];

  for (const a of accounts) insertAccount(a);

  const insertPerson = (row) => table('people').insert(row);
  insertPerson({ name: 'Faraz Shafi', role: 'Owner', type: 'UAE', fixed_salary: 0, personal_lead_rate: 0.80, company_lead_rate: 0.50, is_active: 1 });
  insertPerson({ name: 'Talha Sardar', role: 'Agent', type: 'UAE', fixed_salary: 0, personal_lead_rate: 0.50, company_lead_rate: 0.50, is_active: 1 });
  insertPerson({ name: 'Muhammad Basit', role: 'Agent', type: 'UAE', fixed_salary: 0, personal_lead_rate: 0.50, company_lead_rate: 0.50, is_active: 1 });
  insertPerson({ name: 'Jahanzaib Maqsood', role: 'Agent', type: 'UAE', fixed_salary: 0, personal_lead_rate: 0.50, company_lead_rate: 0.50, is_active: 1 });
  insertPerson({ name: 'Osama', role: 'Manager', type: 'UAE', fixed_salary: 0, personal_lead_rate: 0, company_lead_rate: 0, is_active: 1 });
  insertPerson({ name: 'Zarnigar', role: 'HR', type: 'UAE', fixed_salary: 0, personal_lead_rate: 0, company_lead_rate: 0, is_active: 1 });
  insertPerson({ name: 'Mako', role: 'Employee', type: 'Pakistani', fixed_salary: 0, personal_lead_rate: 0, company_lead_rate: 0, is_active: 1 });
  insertPerson({ name: 'Shafi', role: 'Employee', type: 'Pakistani', fixed_salary: 0, personal_lead_rate: 0, company_lead_rate: 0, is_active: 1 });
  insertPerson({ name: 'Hiba', role: 'Employee', type: 'Pakistani', fixed_salary: 0, personal_lead_rate: 0, company_lead_rate: 0, is_active: 1 });
  insertPerson({ name: 'Rayyan', role: 'Employee', type: 'Pakistani', fixed_salary: 0, personal_lead_rate: 0, company_lead_rate: 0, is_active: 1 });
  insertPerson({ name: 'Sabah', role: 'Employee', type: 'Pakistani', fixed_salary: 0, personal_lead_rate: 0, company_lead_rate: 0, is_active: 1 });
}

function seedIfEmpty() {
  // no-op if already initialized
  return true;
}

function accountByCode(code) {
  return table('chart_of_accounts').where(a => a.code === code)[0];
}

module.exports = { table, store, initializeDatabase, accountByCode };
