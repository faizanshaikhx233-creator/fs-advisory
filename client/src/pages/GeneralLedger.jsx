import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../utils/api';

export default function GeneralLedger() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [lines, setLines] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { api.get('/accounts').then(setAccounts).catch(console.error); }, []);

  const load = () => {
    const params = {};
    if (accountId) params.account_id = accountId;
    if (from) params.from = from;
    if (to) params.to = to;
    api.get('/general-ledger', params).then(setLines).catch(console.error);
    setLoaded(true);
  };

  // Group by account
  const byAccount = {};
  for (const l of lines) {
    if (!byAccount[l.account_id]) byAccount[l.account_id] = { account_name: l.account_name, code: l.code, running: 0, lines: [] };
    let dr = l.debit, cr = l.credit;
    // Determine balance direction by increasing a running balance for first account
    byAccount[l.account_id].lines.push(l);
  }

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">General Ledger</h2>
        <p className="text-gray-500 text-sm mt-1">Account-wise transaction history with running balance</p>
      </header>

      <div className="card mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Account</label>
          <select className="input-field min-w-64" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">All Accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary">Run Report</button>
      </div>

      {loaded && lines.length === 0 && (
        <div className="card text-center text-gray-500 py-12">No transactions found. Select an account and run report.</div>
      )}

      <div className="space-y-6">
        {Object.values(byAccount).map((acc) => (
          <LedgerTable key={acc.code} account={acc} />
        ))}
      </div>
    </div>
  );
}

function LedgerTable({ account }) {
  let running = 0;
  let totalDr = 0, totalCr = 0;

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 mb-3">{account.code} - {account.account_name}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header">
            <th className="px-2 py-2">Date</th>
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2">Ref</th>
            <th className="px-2 py-2 text-right">Debit</th>
            <th className="px-2 py-2 text-right">Credit</th>
            <th className="px-2 py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {account.lines.map((l) => {
            running += l.debit - l.credit;
            totalDr += l.debit;
            totalCr += l.credit;
            return (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-2 py-2">{formatDate(l.date)}</td>
                <td className="px-2 py-2 text-gray-700">{l.description || l.entry_description}</td>
                <td className="px-2 py-2 text-gray-500">{l.entry_number}</td>
                <td className="px-2 py-2 text-right">{l.debit ? formatCurrency(l.debit) : ''}</td>
                <td className="px-2 py-2 text-right">{l.credit ? formatCurrency(l.credit) : ''}</td>
                <td className="px-2 py-2 text-right font-medium">{formatCurrency(running)}</td>
              </tr>
            );
          })}
          <tr className="border-t border-gray-200 font-semibold">
            <td className="px-2 py-2" colSpan="3">Total / Closing Balance</td>
            <td className="px-2 py-2 text-right">{formatCurrency(totalDr)}</td>
            <td className="px-2 py-2 text-right">{formatCurrency(totalCr)}</td>
            <td className="px-2 py-2 text-right">{formatCurrency(running)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
