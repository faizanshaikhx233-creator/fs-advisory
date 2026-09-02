'use client';

import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@/src/lib/api';

export default function Reports() {
  const [from, setFrom] = useState(new Date().getFullYear() + '-01-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);

  const load = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.get('/profit-loss', params).then(setData).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  if (!data) return <div className="card">Loading...</div>;

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h2>
          <p className="text-gray-500 text-sm mt-1">Revenue and expenses for the selected period</p>
        </div>
        <div className="flex items-end gap-3">
          <div><label className="label">From</label><input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">To</label><input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button onClick={load} className="btn-primary">Run</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-lg text-green-700 mb-3">Revenue</h3>
          {data.revenue.length === 0 && <p className="text-sm text-gray-400">No revenue</p>}
          <div className="space-y-1.5 text-sm">
            {data.revenue.map((r) => (
              <div key={r.id} className="flex justify-between">
                <span className="text-gray-700">{r.code} - {r.name}</span>
                <span>{formatCurrency(r.balance)}</span>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-gray-300 mt-2 pt-2 flex justify-between font-bold text-green-700">
            <span>Total Revenue</span><span>{formatCurrency(data.total_revenue)}</span>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-lg text-red-700 mb-3">Expenses</h3>
          {data.expenses.length === 0 && <p className="text-sm text-gray-400">No expenses</p>}
          <div className="space-y-1.5 text-sm">
            {data.expenses.map((r) => (
              <div key={r.id} className="flex justify-between">
                <span className="text-gray-700">{r.code} - {r.name}</span>
                <span>{formatCurrency(r.balance)}</span>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-gray-300 mt-2 pt-2 flex justify-between font-bold text-red-700">
            <span>Total Expenses</span><span>{formatCurrency(data.total_expenses)}</span>
          </div>
        </div>
      </div>

      <div className="card mt-6 bg-primary-50 border-primary-200">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-800">Net Profit / (Loss)</span>
          <span className={`text-2xl font-bold ${data.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(data.net_profit)}</span>
        </div>
      </div>
    </div>
  );
}