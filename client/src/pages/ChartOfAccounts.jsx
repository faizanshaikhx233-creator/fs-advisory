import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'Asset', sub_type: 'Current' });

  const load = () => api.get('/accounts').then(setAccounts).catch(console.error);
  useEffect(() => { load(); }, []);

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(filter.toLowerCase()) ||
    a.code.includes(filter)
  );

  const grouped = {};
  for (const a of filtered) {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', form);
      toast.success('Account created');
      setShowForm(false);
      setForm({ code: '', name: '', type: 'Asset', sub_type: 'Current' });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chart of Accounts</h2>
          <p className="text-gray-500 text-sm mt-1">Complete CoA with all heads</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add Account</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Code</label>
            <input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 7800" required />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. New Expense" required />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {accountTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sub Type</label>
            <input className="input-field" value={form.sub_type} onChange={(e) => setForm({ ...form, sub_type: e.target.value })} placeholder="Current/Operating etc" />
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button type="submit" className="btn-primary">Save Account</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <input className="input-field max-w-sm" placeholder="Search account name or code..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(grouped).map((type) => (
          <div key={type} className="card">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${typeColor(type)}`}></span>
              {type}s
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-2 py-2 font-medium">Code</th>
                  <th className="px-2 py-2 font-medium">Account Name</th>
                  <th className="px-2 py-2 font-medium">Sub Type</th>
                </tr>
              </thead>
              <tbody>
                {grouped[type].map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-2 py-2 text-gray-500 font-mono">{a.code}</td>
                    <td className="px-2 py-2 text-gray-800">{a.name}</td>
                    <td className="px-2 py-2 text-gray-500">{a.sub_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function typeColor(type) {
  const colors = {
    Asset: 'bg-green-500',
    Liability: 'bg-red-500',
    Equity: 'bg-blue-500',
    Revenue: 'bg-emerald-500',
    Expense: 'bg-orange-500',
  };
  return colors[type] || 'bg-gray-500';
}
