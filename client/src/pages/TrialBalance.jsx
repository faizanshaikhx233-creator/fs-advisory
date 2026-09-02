import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../utils/api';

export default function TrialBalance() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState({ rows: [], total_debit: 0, total_credit: 0 });
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.get('/trial-balance', params).then(setData).catch(console.error);
    setLoaded(true);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Trial Balance</h2>
        <p className="text-gray-500 text-sm mt-1">All accounts with debit and credit totals</p>
      </header>

      <div className="card mb-6 flex flex-wrap items-end gap-4">
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

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-500 font-mono">{r.code}</td>
                <td className="px-3 py-2 text-gray-800">{r.name}</td>
                <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{r.type}</span></td>
                <td className="px-3 py-2 text-right">{r.total_debit ? formatCurrency(r.total_debit) : ''}</td>
                <td className="px-3 py-2 text-right">{r.total_credit ? formatCurrency(r.total_credit) : ''}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 font-bold">
              <td className="px-3 py-3" colSpan="3">Total</td>
              <td className="px-3 py-3 text-right">{formatCurrency(data.total_debit)}</td>
              <td className="px-3 py-3 text-right">{formatCurrency(data.total_credit)}</td>
            </tr>
          </tbody>
        </table>
        {loaded && data.rows.length === 0 && (
          <div className="text-center text-gray-500 py-10">No transactions in the selected period.</div>
        )}
      </div>
    </div>
  );
}
