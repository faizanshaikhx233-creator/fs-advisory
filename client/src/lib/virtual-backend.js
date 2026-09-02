import { table, accountByCode } from './store.js';

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ----- helpers shared by endpoints -----
function withAccountName(line) {
  const acc = table('chart_of_accounts').get(line.account_id);
  return { ...line, code: acc ? acc.code : '', account_name: acc ? acc.name : '' };
}

function entriesBetween(from, to) {
  let entries = table('journal_entries').all();
  if (from) entries = entries.filter(e => (e.date || '') >= from);
  if (to) entries = entries.filter(e => (e.date || '') <= to);
  return entries;
}

// ---------- endpoints ----------
async function virtualRequest(method, urlPath, body, params = {}) {
  // Chart of Accounts
  if (method === 'get' && urlPath === '/api/accounts') {
    return table('chart_of_accounts').all().filter(a => a.is_active !== 0).sort((a, b) => a.code.localeCompare(b.code));
  }
  if (method === 'post' && urlPath === '/api/accounts') {
    const { code, name, type, sub_type } = body || {};
    if (!code || !name || !type) throw new Error('code, name, type required');
    if (table('chart_of_accounts').where(a => a.code === code).length > 0) throw new Error('Account code already exists');
    return table('chart_of_accounts').insert({ code, name, type, sub_type, is_active: 1 });
  }
  const acctMatch = urlPath.match(/^\/api\/accounts\/(\d+)$/);
  if (acctMatch && method === 'put') {
    const { name, type, sub_type, is_active } = body || {};
    table('chart_of_accounts').update(acctMatch[1], { name, type, sub_type, is_active: is_active ? 1 : 0 });
    return { success: true };
  }
  if (acctMatch && method === 'delete') {
    const used = table('journal_lines').where(l => l.account_id == acctMatch[1]);
    if (used.length > 0) throw new Error('Cannot delete account with journal entries');
    table('chart_of_accounts').update(acctMatch[1], { is_active: 0 });
    return { success: true };
  }

  // People
  if (method === 'get' && urlPath === '/api/people') {
    return table('people').all().filter(p => p.is_active !== 0).sort((a, b) => a.name.localeCompare(b.name));
  }
  if (method === 'post' && urlPath === '/api/people') {
    const { name, role, type, fixed_salary, personal_lead_rate, company_lead_rate } = body || {};
    if (!name || !role) throw new Error('name, role required');
    return table('people').insert({ name, role, type, fixed_salary: fixed_salary || 0, personal_lead_rate: personal_lead_rate || 0, company_lead_rate: company_lead_rate || 0, is_active: 1 });
  }

  // Deals
  if (method === 'get' && urlPath === '/api/deals') {
    return table('deals').all().map(d => {
      const agent = table('people').get(d.agent_id);
      return { ...d, agent_name: agent ? agent.name : '' };
    }).sort((a, b) => b.deal_date.localeCompare(a.deal_date));
  }
  if (method === 'post' && urlPath === '/api/deals') {
    const { deal_date, property_description, client_name, sale_price, lead_source, agent_id } = body || {};
    if (!deal_date || !sale_price || !lead_source || !agent_id) throw new Error('deal_date, sale_price, lead_source, agent_id required');
    const agent = table('people').get(agent_id);
    if (!agent) throw new Error('Agent not found');
    const agentRate = lead_source === 'Personal' ? agent.personal_lead_rate : agent.company_lead_rate;
    const deal = table('deals').insert({ deal_date, property_description, client_name, sale_price: parseFloat(sale_price), lead_source, agent_id: parseInt(agent_id), status: 'Active' });
    return { ...deal, agent_rate: agentRate, commission_preview: parseFloat(sale_price) * agentRate };
  }
  const closeMatch = urlPath.match(/^\/api\/deals\/(\d+)\/close$/);
  if (closeMatch && method === 'post') {
    const { deal_date, description } = body || {};
    const deal = table('deals').get(closeMatch[1]);
    if (!deal) throw new Error('Deal not found');
    if (deal.status === 'Closed') throw new Error('Already closed');
    const agent = table('people').get(deal.agent_id);
    const agentRate = deal.lead_source === 'Personal' ? agent.personal_lead_rate : agent.company_lead_rate;
    const agentCommission = deal.sale_price * agentRate;
    const companyCommission = deal.sale_price * (1 - agentRate);
    const vatAmount = companyCommission * 0.05;

    const je = table('journal_entries').insert({
      entry_number: `JE-${Date.now()}`, date: deal_date || deal.deal_date,
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

    return table('deals').update(deal.id, { status: 'Closed' });
  }

  // Journal Entries
  if (method === 'get' && urlPath === '/api/journal-entries') {
    let entries = entriesBetween(params.from, params.to).map(e => ({ ...e }));
    for (const entry of entries) {
      entry.lines = table('journal_lines').all().filter(l => l.journal_entry_id === entry.id).map(withAccountName);
    }
    if (params.bank) entries = entries.filter(e => e.lines.some(l => l.code === params.bank));
    return entries;
  }
  if (method === 'get' && /^\/api\/journal-entries\/\d+$/.test(urlPath)) {
    const id = parseInt(urlPath.split('/').pop());
    const entry = table('journal_entries').get(id);
    if (!entry) throw new Error('Not found');
    entry.lines = table('journal_lines').all().filter(l => l.journal_entry_id === entry.id).map(withAccountName);
    return entry;
  }
  if (method === 'post' && urlPath === '/api/journal-entries') {
    return createJournalEntry(body);
  }
  const jePut = urlPath.match(/^\/api\/journal-entries\/(\d+)$/);
  if (jePut && method === 'put') {
    const id = parseInt(jePut[1]);
    if (!table('journal_entries').get(id)) throw new Error('Journal entry not found');
    updateJournalEntry(id, body);
    return { success: true, id };
  }
  if (jePut && method === 'delete') {
    const id = parseInt(jePut[1]);
    if (!table('journal_entries').get(id)) throw new Error('Journal entry not found');
    table('journal_entries').remove(id);
    table('journal_lines').replaceAll(table('journal_lines').all().filter(l => l.journal_entry_id !== id));
    return { success: true };
  }

  // General Ledger
  if (method === 'get' && urlPath === '/api/general-ledger') {
    let lines = table('journal_lines').all().map(l => {
      const je = table('journal_entries').get(l.journal_entry_id);
      const acc = table('chart_of_accounts').get(l.account_id);
      return { ...l, date: je ? je.date : '', entry_description: je ? je.description : '', entry_number: je ? je.entry_number : '', code: acc ? acc.code : '', account_name: acc ? acc.name : '' };
    }).filter(l => l.account_id != null);
    if (params.from) lines = lines.filter(l => l.date >= params.from);
    if (params.to) lines = lines.filter(l => l.date <= params.to);
    if (params.account_id) lines = lines.filter(l => l.account_id == params.account_id);
    return lines.sort((a, b) => (a.account_id - b.account_id) || (a.date || '').localeCompare(b.date || ''));
  }

  // Trial Balance
  if (method === 'get' && urlPath === '/api/trial-balance') {
    const ids = new Set(entriesBetween(params.from, params.to).map(e => e.id));
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
    return { rows, total_debit: totalDr, total_credit: totalCr };
  }

  // Balance Sheet
  if (method === 'get' && urlPath === '/api/balance-sheet') {
    const date = params.as_of || '9999-12-31';
    const getBalance = (type) => {
      const ids = new Set(table('journal_entries').all().filter(e => (e.date || '') <= date).map(e => e.id));
      const map = {};
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
    const equity = { owner_equity: round2(ownerEquity), net_income: netIncome, retained_earnings: round2(ownerEquity + netIncome) };
    return {
      assets, liabilities, equity,
      totals: { assets: round2(assets.reduce((s, a) => s + a.balance, 0)), liabilities: round2(liabilities.reduce((s, a) => s + a.balance, 0)), equity: equity.retained_earnings },
      as_of: params.as_of || new Date().toISOString().slice(0, 10),
    };
  }

  // Profit & Loss
  if (method === 'get' && urlPath === '/api/profit-loss') {
    const ids = new Set(table('journal_entries').all()
      .filter(e => (!params.from || (e.date || '') >= params.from) && (!params.to || (e.date || '') <= params.to))
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
    return { revenue, expenses, total_revenue: totalRevenue, total_expenses: totalExpenses, net_profit: round2(totalRevenue - totalExpenses) };
  }

  // Dashboard
  if (method === 'get' && urlPath === '/api/dashboard') {
    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = params.from || (today.slice(0, 4) + '-01-01');
    const defaultTo = params.to || today;

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

    let agentPayable = 0;
    for (const l of table('journal_lines').all()) {
      const acc = table('chart_of_accounts').get(l.account_id);
      if (!acc || acc.code !== '2010') continue;
      agentPayable += l.debit - l.credit;
    }

    const bankBalances = {};
    for (const l of table('journal_lines').all()) {
      const acc = table('chart_of_accounts').get(l.account_id);
      if (!acc || (acc.code !== '1021' && acc.code !== '1022' && acc.code !== '1010')) continue;
      const e = table('journal_entries').get(l.journal_entry_id);
      if (!e || e.date > today) continue;
      if (!bankBalances[acc.code]) bankBalances[acc.code] = { code: acc.code, name: acc.name, balance: 0 };
      bankBalances[acc.code].balance += acc.type === 'Asset' ? (l.debit - l.credit) : (l.credit - l.debit);
    }

    return {
      from: defaultFrom, to: defaultTo,
      revenue: round2(revenue), expenses: round2(expenses), profit: round2(revenue - expenses),
      active_deals: table('deals').all().filter(d => d.status === 'Active').length,
      closed_deals: table('deals').all().filter(d => d.status === 'Closed').length,
      agent_payable: round2(agentPayable),
      monthly: monthlyData,
      bank_balances: Object.values(bankBalances).map(b => ({ ...b, balance: round2(b.balance) })),
      total_journal_entries: table('journal_entries').all().length,
    };
  }

  // Payroll
  if (method === 'get' && urlPath === '/api/payroll') {
    return table('people').all().filter(p => p.is_active !== 0 && p.fixed_salary > 0);
  }
  if (method === 'post' && urlPath === '/api/payroll/run') {
    const { month, salaries } = body || {};
    if (!month || !salaries) throw new Error('month and salaries required');
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
    return { success: true };
  }

  // Lead qualification
  if (method === 'post' && urlPath === '/api/leads/qualify') {
    const { date, employee_id, description } = body || {};
    const emp = table('people').get(employee_id);
    if (!emp) throw new Error('Employee not found');
    const je = table('journal_entries').insert({
      entry_number: `JE-LEAD-${Date.now()}`, date: date || new Date().toISOString().slice(0, 10),
      description: description || `Lead qualification bonus - ${emp.name}`, entry_type: 'Manual', created_at: new Date().toISOString()
    });
    const bonusAcct = accountByCode('5050');
    const payableAcct = accountByCode('2030');
    table('journal_lines').insert({ journal_entry_id: je.id, account_id: bonusAcct.id, debit: 4000, credit: 0, description: `Lead bonus ${emp.name}` });
    table('journal_lines').insert({ journal_entry_id: je.id, account_id: payableAcct.id, debit: 0, credit: 4000, description: `Lead bonus payable ${emp.name}` });
    return { success: true };
  }

  // Bank transactions / imports
  if (method === 'get' && urlPath === '/api/bank/transactions') {
    let rows = table('bank_transactions').all().sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''));
    if (params.from) rows = rows.filter(r => r.transaction_date >= params.from);
    if (params.to) rows = rows.filter(r => r.transaction_date <= params.to);
    if (params.bank) rows = rows.filter(r => (r.bank || '') === params.bank);
    return rows.map(r => {
      const imp = table('bank_imports').get(r.bank_import_id);
      return { ...r, filename: imp ? imp.filename : '' };
    });
  }
  if (method === 'get' && urlPath === '/api/bank/imports') {
    return table('bank_imports').all().sort((a, b) => (b.imported_at || '').localeCompare(a.imported_at || ''));
  }
  if (method === 'post' && urlPath === '/api/bank/upload') {
    return handleBankUpload(body);
  }

  throw new Error(`Unhandled ${method.toUpperCase()} ${urlPath}`);
}

function createJournalEntry(body) {
  const { date, description, reference, lines } = body;
  if (!date || !description || !lines || lines.length !== 2) throw new Error('Journal entry must have exactly 2 lines (debit and credit)');
  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) throw new Error('Debits must equal credits');
  const je = table('journal_entries').insert({ entry_number: `JE-${Date.now()}`, date, description, reference, entry_type: 'Manual', created_at: new Date().toISOString() });
  for (const line of lines) {
    table('journal_lines').insert({ journal_entry_id: je.id, account_id: parseInt(line.account_id), debit: parseFloat(line.debit) || 0, credit: parseFloat(line.credit) || 0, description: line.description });
  }
  return { success: true, id: je.id };
}

function updateJournalEntry(id, body) {
  const { date, description, reference, lines } = body;
  if (!date || !description || !lines || lines.length !== 2) throw new Error('Journal entry must have exactly 2 lines (debit and credit)');
  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) throw new Error('Debits must equal credits');
  table('journal_entries').update(id, { date, description, reference });
  table('journal_lines').replaceAll(table('journal_lines').all().filter(l => l.journal_entry_id !== id));
  for (const line of lines) {
    table('journal_lines').insert({ journal_entry_id: id, account_id: parseInt(line.account_id), debit: parseFloat(line.debit) || 0, credit: parseFloat(line.credit) || 0, description: line.description });
  }
}

function parseCSV(text) {
  const rows = [];
  let cur = '', row = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = ''; rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

async function handleBankUpload(formData) {
  if (!formData || !formData.get) throw new Error('No file uploaded');
  const file = formData.get('file');
  const bank = formData.get('bank') || '';
  if (!file) throw new Error('No file uploaded');
  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('No data rows found in CSV');

  // skip junk header rows until we find a row with recognizable headers
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const joined = rows[i].join(' ').toLowerCase();
    if (joined.includes('debit') || joined.includes('credit') || joined.includes('balance')) { headerIdx = i; break; }
  }
  const headers = rows[headerIdx].map(h => h.trim());
  const indexOf = (names) => {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase();
      if (names.some(n => h.startsWith(n))) return i;
    }
    return -1;
  };
  const iDate = indexOf(['date']);
  const iDesc = [indexOf(['description']), indexOf(['details']), indexOf(['narrative']), indexOf(['transaction description'])].find(i => i !== -1);
  const iDebit = indexOf(['debit']);
  const iCredit = indexOf(['credit']);
  const iBal = indexOf(['balance']);
  if (iDate === -1) throw new Error('CSV parse error: could not find Date column');

  const imp = table('bank_imports').insert({ filename: file.name, bank, imported_at: new Date().toISOString(), record_count: 0 });
  let imported = 0;
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const cells = rows[r];
    const date = cells[iDate] || (iDesc !== -1 ? cells[iDesc] : '') || cells[0] || '';
    const desc = (iDesc !== -1 && cells[iDesc]) ? cells[iDesc] : '';
    const num = (s) => Math.abs(parseFloat(String(s || '').replace(/[^0-9.\-]/g, ''))) || 0;
    const pos = (s) => parseFloat(String(s || '').replace(/[^0-9.\-]/g, '')) || 0;
    const debit = iDebit !== -1 ? num(cells[iDebit]) : 0;
    const credit = iCredit !== -1 ? num(cells[iCredit]) : 0;
    const balance = iBal !== -1 ? pos(cells[iBal]) : 0;
    if (date) {
      table('bank_transactions').insert({ bank_import_id: imp.id, bank, transaction_date: String(date).replace(' ', 'T').slice(0, 10), description: desc, debit, credit, balance, reconciled: 0 });
      imported++;
    }
  }
  table('bank_imports').update(imp.id, { record_count: imported });
  return { success: true, imported };
}

export { virtualRequest };