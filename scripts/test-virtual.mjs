// Verify the browser virtual backend reproduces the same numbers as the Express server.
import { virtualRequest } from '../client/src/lib/virtual-backend.js';

async function main() {
  const assert = (cond, label) => { if (!cond) { console.error('FAIL:', label); process.exitCode = 1; } else { console.log('ok  :', label); } };

  const tb = await virtualRequest('get', '/api/trial-balance', null, {});
  assert(tb.total_debit === 309943.16 && tb.total_credit === 309943.16, `Trial balance balances: ${tb.total_debit} = ${tb.total_credit}`);

  const bs = await virtualRequest('get', '/api/balance-sheet', null, {});
  assert(bs.totals.assets === 159768.74, `BS assets ${bs.totals.assets}`);
  assert(bs.totals.liabilities === 3000, `BS liabilities ${bs.totals.liabilities}`);
  assert(bs.equity.retained_earnings === 156768.74, `BS equity ${bs.equity.retained_earnings}`);
  const vatRec = bs.assets.find(a => a.id === 14);
  assert(vatRec && vatRec.balance === 20.2, `VAT Receivable ${vatRec && vatRec.balance}`);

  const dash = await virtualRequest('get', '/api/dashboard', null, { from: '2026-01-01', to: '2026-12-31' });
  assert(dash.revenue === 119260.75, `dashboard revenue ${dash.revenue}`);
  assert(dash.expenses === 29775.01, `dashboard expenses ${dash.expenses}`);
  assert(dash.profit === 89485.74, `dashboard profit ${dash.profit}`);
  assert(dash.total_journal_entries === 95, `dashboard entries ${dash.total_journal_entries}`);
  const mash = dash.bank_balances.find(b => b.code === '1021');
  assert(mash && mash.balance === 118278.04, `Mashreq ${mash && mash.balance}`);

  const pl = await virtualRequest('get', '/api/profit-loss', null, { from: '2026-01-01', to: '2026-12-31' });
  assert(pl.net_profit === 89485.74, `P&L net profit ${pl.net_profit}`);

  const jes = await virtualRequest('get', '/api/journal-entries', null, { bank: '1021' });
  assert(jes.length === 65, `Mashreq JE count ${jes.length}`);
  const allJes = await virtualRequest('get', '/api/journal-entries', null, {});
  assert(allJes.length === 95, `Total JE count ${allJes.length}`);

  const accounts = await virtualRequest('get', '/api/accounts', null, {});
  assert(accounts.length === 78, `Accounts count ${accounts.length}`);

  const people = await virtualRequest('get', '/api/people', null, {});
  assert(people.length === 11, `People count ${people.length}`);

  // mutation: create + edit + delete a scratch journal entry
  const petty = accounts.find(a => a.code === '1010');
  const cap = accounts.find(a => a.code === '3000');
  const created = await virtualRequest('post', '/api/journal-entries', {
    date: '2026-09-03', description: 'SCRATCH STANDALONE', reference: 'T1',
    lines: [
      { account_id: petty.id, debit: 5, credit: 0, description: 'x' },
      { account_id: cap.id, debit: 0, credit: 5, description: 'x' },
    ],
  }, {});
  assert(created.success === true, `JE create id=${created.id}`);
  await virtualRequest('put', `/api/journal-entries/${created.id}`, {
    date: '2026-09-04', description: 'SCRATCH EDITED', reference: 'T2',
    lines: [
      { account_id: petty.id, debit: 5, credit: 0, description: 'x' },
      { account_id: cap.id, debit: 0, credit: 5, description: 'x' },
    ],
  }, {});
  const check = await virtualRequest('get', `/api/journal-entries/${created.id}`, null, {});
  assert(check.description === 'SCRATCH EDITED', `JE edit ${check.description}`);
  await virtualRequest('delete', `/api/journal-entries/${created.id}`, null, {});
  const afterTb = await virtualRequest('get', '/api/trial-balance', null, {});
  assert(afterTb.total_debit === 309943.16, `TB stable after delete ${afterTb.total_debit}`);

  console.log(process.exitCode ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
}

main().catch(e => { console.error('ERROR', e); process.exit(1); });