import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../utils/api';

export default function BalanceSheet() {
  const [asOf, setAsOf] = useState('');
  const [data, setData] = useState(null);

  const load = () => {
    const params = {};
    if (asOf) params.as_of = asOf;
    api.get('/balance-sheet', params).then(setData).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  if (!data) return <div className="card">Loading...</div>;

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
          <p className="text-gray-500 text-sm mt-1">As of {formatDate(data.as_of)}</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">As of Date</label>
            <input type="date" className="input-field" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
          <button onClick={load} className="btn-primary">Refresh</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="card">
          <h3 className="font-bold text-lg text-green-700 mb-3">Assets</h3>
          <SectionList items={data.assets} />
          <div className="border-t-2 border-gray-300 mt-2 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total Assets</span>
            <span>{formatCurrency(data.totals.assets)}</span>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div>
          <div className="card mb-6">
            <h3 className="font-bold text-lg text-red-700 mb-3">Liabilities</h3>
            <SectionList items={data.liabilities} />
            <div className="border-t-2 border-gray-300 mt-2 pt-2 flex justify-between font-bold text-gray-900">
              <span>Total Liabilities</span>
              <span>{formatCurrency(data.totals.liabilities)}</span>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-lg text-blue-700 mb-3">Equity</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Owner's Equity</span>
                <span>{formatCurrency(data.equity.owner_equity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Net Income (Retained Earnings)</span>
                <span>{formatCurrency(data.equity.net_income)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>Total Equity</span>
                <span>{formatCurrency(data.equity.retained_earnings)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionList({ items }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-gray-400 mb-3">No balances</div>;
  }
  const subtotal = items.reduce((s, i) => s + (i.balance || 0), 0);
  return (
    <>
      <div className="space-y-1.5 text-sm mb-2">
        {items.map((i) => (
          <div key={i.name} className="flex justify-between py-0.5">
            <span className="text-gray-700">{i.name}</span>
            <span className="text-gray-800">{formatCurrency(i.balance)}</span>
          </div>
        ))}
      </div>
      <div className="text-sm font-medium flex justify-between border-t border-gray-100 pt-1.5 text-gray-600">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
    </>
  );
}
