const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse');
const { table, initializeDatabase, accountByCode } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initializeDatabase();

const upload = multer({ dest: path.join(__dirname, 'uploads') });
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// ---------- Chart of Accounts ----------
app.get('/api/accounts', (req, res) => {
  const accounts = table('chart_of_accounts').all().filter(a => a.is_active !== 0).sort((a, b) => a.code.localeCompare(b.code));
  res.json(accounts);
});

app.post('/api/accounts', (req, res) => {
  const { code, name, type, sub_type } = req.body;
  if (!code || !name || !type) return res.status(400).json({ error: 'code, name, type required' });
  const existing = table('chart_of_accounts').where(a => a.code === code);
  if (existing.length > 0) return res.status(400).json({ error: 'Account code already exists' });
  const acc = table('chart_of_accounts').insert({ code, name, type, sub_type, is_active: 1 });
  res.json(acc);
});

app.put('/api/accounts/:id', (req, res) => {
  const { name, type, sub_type, is_active } = req.body;
  table('chart_of_accounts').update(req.params.id, { name, type, sub_type, is_active: is_active ? 1 : 0 });
  res.json({ success: true });
});

app.delete('/api/accounts/:id', (req, res) => {
  const used = table('journal_lines').where(l => l.account_id == req.params.id);
  if (used.length > 0) return res.status(400).json({ error: 'Cannot delete account with journal entries' });
  table('chart_of_accounts').update(req.params.id, { is_active: 0 });
  res.json({ success: true });
});

// ---------- People ----------
app.get('/api/people', (req, res) => {
  const people = table('people').all().filter(p => p.is_active !== 0).sort((a, b) => a.name.localeCompare(b.name));
  res.json(people);
});

app.post('/api/people', (req, res) => {
  const { name, role, type, fixed_salary, personal_lead_rate, company_lead_rate } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'name, role required' });
  const p = table('people').insert({ name, role, type, fixed_salary: fixed_salary || 0, personal_lead_rate: personal_lead_rate || 0, company_lead_rate: company_lead_rate || 0, is_active: 1 });
  res.json(p);
});

app.put('/api/people/:id', (req, res) => {
  const { name, role, type, fixed_salary, deal_commission_rate, lead_commission_rate, personal_lead_rate, company_lead_rate, is_active } = req.body;
  table('people').update(req.params.id, { name, role, type, fixed_salary: fixed_salary || 0, deal_commission_rate: deal_commission_rate || 0, lead_commission_rate: lead_commission_rate || 0, personal_lead_rate: personal_lead_rate || 0, company_lead_rate: company_lead_rate || 0, is_active: is_active ? 1 : 0 });
  res.json({ success: true });
});

// ---------- Deals & Commission ----------
app.get('/api/deals', (req, res) => {
  const deals = table('deals').all().map(d => {
    const agent = table('people').get(d.agent_id);
    return { ...d, agent_name: agent ? agent.name : '' };
  }).sort((a, b) => b.deal_date.localeCompare(a.deal_date));
  res.json(deals);
});

app.post('/api/deals', (req, res) => {
  const { deal_date, property_description, client_name, sale_price, lead_source, agent_id } = req.body;
  if (!deal_date || !sale_price || !lead_source || !agent_id) {
    return res.status(400).json({ error: 'deal_date, sale_price, lead_source, agent_id required' });
  }
  const agent = table('people').get(agent_id);
  if (!agent) return res.status(400).json({ error: 'Agent not found' });
  const agentRate = lead_source === 'Personal' ? agent.personal_lead_rate : agent.company_lead_rate;

  const deal = table('deals').insert({ deal_date, property_description, client_name, sale_price: parseFloat(sale_price), lead_source, agent_id: parseInt(agent_id), status: 'Active' });
  res.json({ ...deal, agent_rate: agentRate, commission_preview: parseFloat(sale_price) * agentRate });
});

app.post('/api/deals/:id/close', (req, res) => {
  const { deal_date, description } = req.body;
  const deal = table('deals').get(req.params.id);
  if (!deal) return res.status(400).json({ error: 'Deal not found' });
  if (deal.status === 'Closed') return res.status(400).json({ error: 'Already closed' });

  const agent = table('people').get(deal.agent_id);
  const agentRate = deal.lead_source === 'Personal' ? agent.personal_lead_rate : agent.company_lead_rate;
  const agentCommission = deal.sale_price * agentRate;
  const companyCommission = deal.sale_price * (1 - agentRate);
  const vatAmount = companyCommission * 0.05;

  const entryNumber = `JE-${Date.now()}`;
  const je = table('journal_entries').insert({
    entry_number: entryNumber, date: deal_date || deal.deal_date,
    description: description || `Commission on sale ${deal.property_description || ''} - ${agent.name}`,
    entry_type: 'Commission', created_at: new Date().toISOString()
  });

  const insertLine = (accountId, debit, credit, desc) =>
    table('journal_lines').insert({ journal_entry_id: je.id, account_id: accountId, debit, credit, description: desc });

  insertLine(accountByCode('1100').id, round2(companyCommission + vatAmount), 0, 'Company commission receivable');
  insertLine(accountByCode('4000').id, 0, round2(companyCommission), 'Company commission income');
  insertLine(accountByCode('2100').id, 0, round2(vatAmount), 'VAT 5% on commission');
  insertLine(accountByCode('5030').id, round2(agentCommission), 0, `${agent.name} agent commission`);
  insertLine(accountByCode('2010').id, 0, round2(agentCommission), `${agent.name} commission payable`);

  const updated = table('deals').update(deal.id, { status: 'Closed' });
  res.json(updated);
});

app.delete('/api/deals/:id', (req, res) => {
  table('deals').remove(req.params.id);
  res.json({ success: true });
});

// ---------- Journal Entries ----------
app.get('/api/journal-entries', (req, res) => {
  const { from, to, bank } = req.query;
  let entries = table('journal_entries').all().sort((a, b) => (b.date + '').localeCompare(a.date + ''));
  if (from) entries = entries.filter(e => (e.date || '') >= from);
  if (to) entries = entries.filter(e => (e.date || '') <= to);
  for (const entry of entries) {
    entry.lines = table('journal_lines').all()
      .filter(l => l.journal_entry_id === entry.id)
      .map(l => {
        const acc = table('chart_of_accounts').get(l.account_id);
        return { ...l, code: acc ? acc.code : '', account_name: acc ? acc.name : '' };
      });
  }
  if (bank) entries = entries.filter(e => e.lines.some(l => l.code === bank));
  res.json(entries);
});

app.get('/api/journal-entries/:id', (req, res) => {
  const entry = table('journal_entries').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  entry.lines = table('journal_lines').all()
    .filter(l => l.journal_entry_id === entry.id)
    .map(l => {
      const acc = table('chart_of_accounts').get(l.account_id);
      return { ...l, code: acc ? acc.code : '', account_name: acc ? acc.name : '' };
    });
  res.json(entry);
});

app.post('/api/journal-entries', (req, res) => {
  const { date, description, reference, lines } = req.body;
  if (!date || !description || !lines || lines.length !== 2) {
    return res.status(400).json({ error: 'Journal entry must have exactly 2 lines (debit and credit)' });
  }
  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return res.status(400).json({ error: 'Debits must equal credits' });
  }

  const je = table('journal_entries').insert({
    entry_number: `JE-${Date.now()}`, date, description, reference, entry_type: 'Manual', created_at: new Date().toISOString()
  });
  for (const line of lines) {
    table('journal_lines').insert({
      journal_entry_id: je.id, account_id: parseInt(line.account_id),
      debit: parseFloat(line.debit) || 0, credit: parseFloat(line.credit) || 0, description: line.description
    });
  }
  res.json({ success: true, id: je.id });
});

// Update (edit) an existing journal entry - replaces date/desc/ref and lines
app.put('/api/journal-entries/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = table('journal_entries').get(id);
  if (!existing) return res.status(404).json({ error: 'Journal entry not found' });

  const { date, description, reference, lines } = req.body;
  if (!date || !description || !lines || lines.length !== 2) {
    return res.status(400).json({ error: 'Journal entry must have exactly 2 lines (debit and credit)' });
  }
  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return res.status(400).json({ error: 'Debits must equal credits' });
  }

  table('journal_entries').update(id, { date, description, reference });

  // remove all existing lines for this entry, then re-insert
  const remaining = table('journal_lines').all().filter(l => l.journal_entry_id !== id);
  table('journal_lines').replaceAll(remaining);
  for (const line of lines) {
    table('journal_lines').insert({
      journal_entry_id: id, account_id: parseInt(line.account_id),
      debit: parseFloat(line.debit) || 0, credit: parseFloat(line.credit) || 0, description: line.description
    });
  }
  res.json({ success: true, id });
});

// Delete a journal entry and its lines
app.delete('/api/journal-entries/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = table('journal_entries').get(id);
  if (!existing) return res.status(404).json({ error: 'Journal entry not found' });
  table('journal_entries').remove(id);
  const remaining = table('journal_lines').all().filter(l => l.journal_entry_id !== id);
  table('journal_lines').replaceAll(remaining);
  res.json({ success: true });
});

// ---------- General Ledger ----------
app.get('/api/general-ledger', (req, res) => {
  const { from, to, account_id } = req.query;
  let lines = table('journal_lines').all().map(l => {
    const je = table('journal_entries').get(l.journal_entry_id);
    const acc = table('chart_of_accounts').get(l.account_id);
    return { ...l, date: je ? je.date : '', entry_description: je ? je.description : '', entry_number: je ? je.entry_number : '', code: acc ? acc.code : '', account_name: acc ? acc.name : '' };
  }).filter(l => l.account_id != null);
  if (from) lines = lines.filter(l => l.date >= from);
  if (to) lines = lines.filter(l => l.date <= to);
  if (account_id) lines = lines.filter(l => l.account_id == account_id);
  lines = lines.sort((a, b) => (a.account_id - b.account_id) || (a.date || '').localeCompare(b.date || ''));
  res.json(lines);
});

// ---------- Trial Balance ----------
app.get('/api/trial-balance', (req, res) => {
  const { from, to } = req.query;
  let entries = table('journal_entries').all();
  if (from) entries = entries.filter(e => (e.date || '') >= from);
  if (to) entries = entries.filter(e => (e.date || '') <= to);
  const ids = new Set(entries.map(e => e.id));

  const map = {};
  for (const l of table('journal_lines').all()) {
    if (!ids.has(l.journal_entry_id)) continue;
    const acc = table('chart_of_accounts').get(l.account_id);
    if (!acc) continue;
    if (!map[l.account_id]) map[l.account_id] = { id: acc.id, code: acc.code, name: acc.name, type: acc.type, total_debit: 0, total_credit: 0, balance: 0 };
    map[l.account_id].total_debit += l.debit;
    map[l.account_id].total_credit += l.credit;
  }
  const rows = Object.values(map).map(r => ({ ...r, total_debit: round2(r.total_debit), total_credit: round2(r.total_credit), balance: round2(r.total_debit - r.total_credit) }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const totalDr = round2(rows.reduce((s, r) => s + r.total_debit, 0));
  const totalCr = round2(rows.reduce((s, r) => s + r.total_credit, 0));
  res.json({ rows, total_debit: totalDr, total_credit: totalCr });
});

// ---------- Balance Sheet ----------
app.get('/api/balance-sheet', (req, res) => {
  const { as_of } = req.query;
  const date = as_of || '9999-12-31';

  const getBalance = (type) => {
    const ids = new Set(table('journal_entries').all().filter(e => (e.date || '') <= date).map(e => e.id));
    const map = {};
    // Assets are debit-balance accounts; Liabilities/Equity are credit-balance accounts.
    const sign = (type === 'Asset') ? 1 : -1;
    for (const l of table('journal_lines').all()) {
      if (!ids.has(l.journal_entry_id)) continue;
      const acc = table('chart_of_accounts').get(l.account_id);
      if (!acc || acc.type !== type) continue;
      if (!map[l.account_id]) map[l.account_id] = { id: acc.id, name: acc.name, balance: 0 };
      map[l.account_id].balance += (l.debit - l.credit) * sign;
    }
    return Object.values(map).map(r => ({ ...r, balance: round2(r.balance) })).filter(r => r.balance !== 0).sort((a, b) => a.id - b.id);
  };

  const assets = getBalance('Asset');
  const liabilities = getBalance('Liability');

  const ids = new Set(table('journal_entries').all().filter(e => (e.date || '') <= date).map(e => e.id));
  let revenueTotal = 0;
  let expenseTotal = 0;
  for (const l of table('journal_lines').all()) {
    if (!ids.has(l.journal_entry_id)) continue;
    const acc = table('chart_of_accounts').get(l.account_id);
    if (!acc) continue;
    if (acc.type === 'Revenue') revenueTotal += (l.credit - l.debit);
    else if (acc.type === 'Expense') expenseTotal += (l.debit - l.credit);
  }
  const netIncome = round2(revenueTotal - expenseTotal);
  let ownerEq = 0;
  for (const l of table('journal_lines').all()) {
    if (!ids.has(l.journal_entry_id)) continue;
    const acc = table('chart_of_accounts').get(l.account_id);
    if (!acc || acc.type !== 'Equity') continue;
    ownerEq += l.credit - l.debit;
  }
  const ownerEquity = round2(ownerEq);

  const totalAssets = round2(assets.reduce((s, a) => s + a.balance, 0));
  const totalLiabilities = round2(liabilities.reduce((s, a) => s + a.balance, 0));
  const equity = {
    owner_equity: round2(ownerEquity),
    net_income: netIncome,
    retained_earnings: round2(ownerEquity + netIncome),
  };

  res.json({
    assets, liabilities, equity,
    totals: { assets: totalAssets, liabilities: totalLiabilities, equity: equity.retained_earnings },
    as_of: as_of || new Date().toISOString().slice(0, 10),
  });
});

// ---------- Bank Statement Upload ----------
app.post('/api/bank/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const fileObj = {
    filename: req.file.originalname,
    bank: req.body.bank || '',
    imported_at: new Date().toISOString(),
    record_count: 0,
  };
  let imported = 0;

  parse(fileContent, { columns: true, skip_empty_lines: true, relax_column_count: true }, (err, records) => {
    if (err) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'CSV parse error: ' + err.message });
    }
    if (!records || records.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'No data rows found in CSV' });
    }
    const imp = table('bank_imports').insert(fileObj);
    try {
      for (const row of records) {
        const date = row.Date || row.date || row.TransactionDate || row['Date Description Amount Balance'] || Object.values(row)[0];
        const desc = row.Description || row.description || row.Details || row['Transaction Description'] || row['Narrative'] || '';
        const debit = Math.abs(parseFloat(row.Debit || row['Debit Amount'] || 0)) || 0;
        const credit = Math.abs(parseFloat(row.Credit || row['Credit Amount'] || 0)) || 0;
        const balance = parseFloat(row.Balance || 0) || 0;
        if (date) {
          table('bank_transactions').insert({
            bank_import_id: imp.id, bank: req.body.bank || '', transaction_date: String(date).replace(' ', 'T').slice(0, 10),
            description: desc, debit, credit, balance, reconciled: 0
          });
          imported++;
        }
      }
      table('bank_imports').update(imp.id, { record_count: imported });
    } catch (e) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: e.message });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true, imported });
  });
});

app.get('/api/bank/transactions', (req, res) => {
  const { from, to, bank } = req.query;
  let rows = table('bank_transactions').all().sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''));
  if (from) rows = rows.filter(r => r.transaction_date >= from);
  if (to) rows = rows.filter(r => r.transaction_date <= to);
  if (bank) rows = rows.filter(r => (r.bank || '') === bank);
  res.json(rows.map(r => {
    const imp = table('bank_imports').get(r.bank_import_id);
    return { ...r, filename: imp ? imp.filename : '' };
  }));
});

app.get('/api/bank/imports', (req, res) => {
  const rows = table('bank_imports').all().sort((a, b) => (b.imported_at || '').localeCompare(a.imported_at || ''));
  res.json(rows);
});

// ---------- Dashboard Summary ----------
app.get('/api/dashboard', (req, res) => {
  const { from, to } = req.query;
  // Default: whole year to date if no filter given
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = (from) || (today.slice(0, 4) + '-01-01');
  const defaultTo = (to) || today;

  const sumType = (type) => {
    const ids = new Set(table('journal_entries').all().filter(e => (e.date || '') >= defaultFrom && (e.date || '') <= defaultTo).map(e => e.id));
    let total = 0;
    for (const l of table('journal_lines').all()) {
      if (!ids.has(l.journal_entry_id)) continue;
      const acc = table('chart_of_accounts').get(l.account_id);
      if (!acc || acc.type !== type) continue;
      total += (type === 'Revenue') ? (l.credit - l.debit) : (l.debit - l.credit);
    }
    return total;
  };

  const revenue = sumType('Revenue');
  const expenses = sumType('Expense');

  // crosstab: revenue/expenses by month within range, for a small bar chart
  const monthly = {};
  for (const e of table('journal_entries').all()) {
    const d = e.date || '';
    if (d < defaultFrom || d > defaultTo) continue;
    const key = d.slice(0, 7);
    if (!monthly[key]) monthly[key] = { rev: 0, exp: 0 };
  }
  for (const l of table('journal_lines').all()) {
    const e = table('journal_entries').get(l.journal_entry_id);
    if (!e) continue;
    const d = e.date || '';
    if (d < defaultFrom || d > defaultTo) continue;
    const acc = table('chart_of_accounts').get(l.account_id);
    if (!acc) continue;
    const key = d.slice(0, 7);
    if (!monthly[key]) monthly[key] = { rev: 0, exp: 0 };
    if (acc.type === 'Revenue') monthly[key].rev += (l.credit - l.debit);
    else if (acc.type === 'Expense') monthly[key].exp += (l.debit - l.credit);
  }
  const monthlyData = Object.keys(monthly).sort().map(k => ({ month: k, ...monthly[k] }));

  const agentPayable = (() => {
    let total = 0;
    for (const l of table('journal_lines').all()) {
      const acc = table('chart_of_accounts').get(l.account_id);
      if (!acc || acc.code !== '2010') continue;
      total += l.debit - l.credit;
    }
    return total;
  })();

  // Bank balances (as-of all time)
  const bankBalances = {};
  for (const l of table('journal_lines').all()) {
    const acc = table('chart_of_accounts').get(l.account_id);
    if (!acc || (acc.code !== '1021' && acc.code !== '1022' && acc.code !== '1010')) continue;
    const e = table('journal_entries').get(l.journal_entry_id);
    if (!e) continue;
    if (e.date > today) continue;
    if (!bankBalances[acc.code]) bankBalances[acc.code] = { code: acc.code, name: acc.name, balance: 0 };
    bankBalances[acc.code].balance += acc.type === 'Asset' ? (l.debit - l.credit) : (l.credit - l.debit);
  }

  res.json({
    from: defaultFrom,
    to: defaultTo,
    revenue: round2(revenue),
    expenses: round2(expenses),
    profit: round2(revenue - expenses),
    active_deals: table('deals').all().filter(d => d.status === 'Active').length,
    closed_deals: table('deals').all().filter(d => d.status === 'Closed').length,
    agent_payable: round2(agentPayable),
    monthly: monthlyData,
    bank_balances: Object.values(bankBalances).map(b => ({ ...b, balance: round2(b.balance) })),
    total_journal_entries: table('journal_entries').all().length,
  });
});

// ---------- Profit & Loss ----------
app.get('/api/profit-loss', (req, res) => {
  const { from, to } = req.query;
  const ids = new Set(table('journal_entries').all()
    .filter(e => (!from || (e.date || '') >= from) && (!to || (e.date || '') <= to))
    .map(e => e.id));
  const map = {};
  for (const l of table('journal_lines').all()) {
    if (!ids.has(l.journal_entry_id)) continue;
    const acc = table('chart_of_accounts').get(l.account_id);
    if (!acc || (acc.type !== 'Revenue' && acc.type !== 'Expense')) continue;
    if (!map[l.account_id]) map[l.account_id] = { id: acc.id, code: acc.code, name: acc.name, type: acc.type, balance: 0 };
    map[l.account_id].balance += acc.type === 'Revenue' ? l.credit - l.debit : l.debit - l.credit;
  }
  const rows = Object.values(map).map(r => ({ ...r, balance: round2(r.balance) })).sort((a, b) => a.code.localeCompare(b.code));
  const revenue = rows.filter(r => r.type === 'Revenue');
  const expenses = rows.filter(r => r.type === 'Expense');
  const totalRevenue = round2(revenue.reduce((s, r) => s + r.balance, 0));
  const totalExpenses = round2(expenses.reduce((s, r) => s + r.balance, 0));
  res.json({ revenue, expenses, total_revenue: totalRevenue, total_expenses: totalExpenses, net_profit: round2(totalRevenue - totalExpenses) });
});

// ---------- Payroll ----------
app.get('/api/payroll', (req, res) => {
  const people = table('people').all().filter(p => p.is_active !== 0 && p.fixed_salary > 0);
  res.json(people);
});

app.post('/api/payroll/run', (req, res) => {
  const { month, salaries } = req.body;
  if (!month || !salaries) return res.status(400).json({ error: 'month and salaries required' });
  for (const s of salaries) {
    const person = table('people').get(s.person_id);
    if (!person || !person.fixed_salary) continue;
    const je = table('journal_entries').insert({
      entry_number: `JE-PAY-${Date.now()}-${s.person_id}`, date: month + '-28',
      description: `Salary for ${person.name} - ${month}`, entry_type: 'Salary', created_at: new Date().toISOString()
    });
    const salaryAcct = accountByCode(person.type === 'Pakistani' ? '5020' : '5010');
    const payableAcct = accountByCode('2020');
    table('journal_lines').insert({ journal_entry_id: je.id, account_id: salaryAcct.id, debit: parseFloat(s.amount), credit: 0, description: `${person.name} salary` });
    table('journal_lines').insert({ journal_entry_id: je.id, account_id: payableAcct.id, debit: 0, credit: parseFloat(s.amount), description: `${person.name} salary payable` });
  }
  res.json({ success: true });
});

// Lead qualification bonus (4,000 PKR per qualified lead)
app.post('/api/leads/qualify', (req, res) => {
  const { date, employee_id, description } = req.body;
  const emp = table('people').get(employee_id);
  if (!emp) return res.status(400).json({ error: 'Employee not found' });
  const je = table('journal_entries').insert({
    entry_number: `JE-LEAD-${Date.now()}`, date: date || new Date().toISOString().slice(0, 10),
    description: description || `Lead qualification bonus - ${emp.name}`, entry_type: 'Manual', created_at: new Date().toISOString()
  });
  const bonusAcct = accountByCode('5050');
  const payableAcct = accountByCode('2030');
  table('journal_lines').insert({ journal_entry_id: je.id, account_id: bonusAcct.id, debit: 4000, credit: 0, description: `Lead bonus ${emp.name}` });
  table('journal_lines').insert({ journal_entry_id: je.id, account_id: payableAcct.id, debit: 0, credit: 4000, description: `Lead bonus payable ${emp.name}` });
  res.json({ success: true });
});

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------- Production: serve built React app ----------
const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`FS Advisory API running on http://localhost:${PORT}`);
});
