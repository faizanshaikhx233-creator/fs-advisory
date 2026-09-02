'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatCurrency } from '@/src/lib/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = (f, t) => {
    const params = {};
    if (f) params.from = f;
    if (t) params.to = t;
    api.get('/dashboard', params).then(setData).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const apply = () => load(from, to);

  const stats = [
    { label: 'Revenue (period)', value: data?.revenue || 0, color: 'text-green-600' },
    { label: 'Expenses (period)', value: data?.expenses || 0, color: 'text-red-600' },
    { label: 'Profit (period)', value: data?.profit || 0, color: 'text-primary-600' },
    { label: 'Active Deals', value: data?.active_deals || 0, color: 'text-blue-600' },
    { label: 'Closed Deals', value: data?.closed_deals || 0, color: 'text-purple-600' },
    { label: 'Agent Payable', value: data?.agent_payable || 0, color: 'text-yellow-600' },
  ];

  const monthly = data?.monthly || [];
  const maxVal = Math.max(1, ...monthly.map(m => Math.max(m.rev, m.exp)));
  const bankBalances = data?.bank_balances || [];

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-gray-500 mt-1">FS Advisory - Accounting Dashboard</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button onClick={apply} className="btn-primary">Apply</button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-2 ${s.color}`}>{formatCurrency(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Monthly Revenue vs Expenses</h3>
            <span className="text-xs text-gray-400">
              {data?.from || ''} → {data?.to || ''}
            </span>
          </div>
          {monthly.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No activity in this period</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {monthly.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end gap-1" style={{ height: '120px' }}>
                    <div className="w-full bg-green-300 rounded-t" style={{ height: `${Math.round((m.rev / maxVal) * 100)}%`, minHeight: '2px' }} title={`Revenue: ${formatCurrency(m.rev)}`} />
                    <div className="w-full bg-red-300 rounded-b" style={{ height: `${Math.round((m.exp / maxVal) * 100)}%`, minHeight: '2px' }} title={`Expenses: ${formatCurrency(m.exp)}`} />
                  </div>
                  <div className="flex gap-1 text-[10px] text-gray-500">
                    <span className="text-green-600">■</span><span className="text-red-500">■</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Bank Balances</h3>
          {bankBalances.length === 0 ? (
            <p className="text-gray-500 text-sm">No bank balances</p>
          ) : (
            <ul className="space-y-3">
              {bankBalances.map((b) => (
                <li key={b.code} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-sm text-gray-700">{b.name}</span>
                  <span className={`font-semibold ${b.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(b.balance)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400 mt-3">Total journal entries: {data?.total_journal_entries || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickLink href="/journal" title="New Journal Entry" desc="Record transactions" emoji="📝" />
        <QuickLink href="/deals" title="Add a Deal" desc="Log sale & commission" emoji="🏠" />
        <QuickLink href="/bank" title="Import Bank Statement" desc="Upload CSV" emoji="🏦" />
      </div>

      <div className="mt-2 card">
        <h3 className="text-lg font-semibold mb-4">Business Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold text-gray-700 mb-2">Agents (Split on sale)</p>
            <ul className="space-y-1 text-gray-600">
              <li><b>Faraz Shafi</b> (Owner & Agent) - Company lead 50/50, Personal lead 80/20</li>
              <li><b>Talha Sardar</b> - 50/50 both leads</li>
              <li><b>Muhammad Basit</b> - 50/50 both leads</li>
              <li><b>Jahanzaib Maqsood</b> - 50/50 both leads</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">Pakistani Staff</p>
            <ul className="space-y-1 text-gray-600">
              <li><b>Mako, Shafi, Hiba, Rayyan, Sabah</b> - Fixed salary + commission</li>
              <li>Qualified lead bonus: <b>4,000 PKR</b></li>
              <li>Deal closed commission: <b>1.5%</b> of sale</li>
              <li><b>Osama</b> - Manager | <b>Zarnigar</b> - HR</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, title, desc, emoji }) {
  return (
    <Link href={href} className="card hover:shadow-md transition-shadow block">
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </Link>
  );
}