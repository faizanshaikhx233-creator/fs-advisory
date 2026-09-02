import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, formatCurrency, formatDate } from '../utils/api';

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [bank, setBank] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
    line1: { account_id: '', debit: '', credit: '', description: '' },
    line2: { account_id: '', debit: '', credit: '', description: '' },
  });

  const load = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (bank) params.bank = bank;
    api.get('/journal-entries', params).then(setEntries).catch(console.error);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { api.get('/accounts').then(setAccounts).catch(console.error); }, []);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      description: '',
      reference: '',
      line1: { account_id: '', debit: '', credit: '', description: '' },
      line2: { account_id: '', debit: '', credit: '', description: '' },
    });
    setEditingId(null);
    setShowForm(false);
  };

  const lineToForm = (l, idx) => ({
    account_id: l.account_id ? String(l.account_id) : '',
    debit: l.debit ? String(l.debit) : '',
    credit: l.credit ? String(l.credit) : '',
    description: l.description || '',
  });

  const startEdit = (entry) => {
    const [l1, l2] = entry.lines.length === 2
      ? [lineToForm(entry.lines[0], 0), lineToForm(entry.lines[1], 1)]
      : [lineToForm(entry.lines[0] || {}, 0), { account_id: '', debit: '', credit: '', description: '' }];
    setForm({
      date: entry.date || '',
      description: entry.description || '',
      reference: entry.reference || '',
      line1: l1,
      line2: l2,
    });
    setEditingId(entry.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lines = [
      {
        account_id: parseInt(form.line1.account_id),
        debit: parseFloat(form.line1.debit) || 0,
        credit: parseFloat(form.line1.credit) || 0,
        description: form.line1.description,
      },
      {
        account_id: parseInt(form.line2.account_id),
        debit: parseFloat(form.line2.debit) || 0,
        credit: parseFloat(form.line2.credit) || 0,
        description: form.line2.description,
      },
    ];
    if (!lines[0].account_id || !lines[1].account_id) {
      return toast.error('Select accounts for both lines');
    }
    try {
      if (editingId) {
        await api.put(`/journal-entries/${editingId}`, {
          date: form.date,
          description: form.description,
          reference: form.reference,
          lines,
        });
        toast.success('Journal entry updated');
      } else {
        await api.post('/journal-entries', {
          date: form.date,
          description: form.description,
          reference: form.reference,
          lines,
        });
        toast.success('Journal entry saved');
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete journal entry "${entry.description}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/journal-entries/${entry.id}`);
      toast.success('Journal entry deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const bankOptions = [
    { code: '', label: 'All Banks' },
    { code: '1021', label: 'Mashreq Bank' },
    { code: '1022', label: 'WIO Bank' },
    { code: '1010', label: 'Petty Cash' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Journal Entries</h2>
        <button
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {/* Date + bank filter */}
      <div className="card mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">From Date</label>
          <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To Date</label>
          <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Bank</label>
          <select className="input-field" value={bank} onChange={(e) => setBank(e.target.value)}>
            {bankOptions.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
          </select>
        </div>
        <button onClick={load} className="btn-primary">Apply Filter</button>
        <span className="text-sm text-gray-500 pb-2">{entries.length} entries</span>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">{editingId ? `Edit Entry #${editingId}` : 'New Journal Entry'}</h3>
            {editingId && <span className="text-xs text-gray-500">Editing entry - click Save to apply changes</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Office rent payment" required />
            </div>
            <div>
              <label className="label">Reference</label>
              <input className="input-field" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Invoice/Ref no" />
            </div>
          </div>
          <LineFields
            title="Debit Line"
            line={form.line1}
            accounts={accounts}
            onLine={(l) => setForm({ ...form, line1: l })}
          />
          <LineFields
            title="Credit Line"
            line={form.line2}
            accounts={accounts}
            onLine={(l) => setForm({ ...form, line2: l })}
          />
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Save Entry'}</button>
            <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {entries.map((entry) => {
          const totalDr = entry.lines.reduce((s, l) => s + l.debit, 0);
          const totalCr = entry.lines.reduce((s, l) => s + l.credit, 0);
          return (
            <div key={entry.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{entry.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {entry.entry_number} • {formatDate(entry.date)} {entry.reference && `• Ref: ${entry.reference}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{entry.entry_type}</span>
                  <button onClick={() => startEdit(entry)} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Edit</button>
                  <button onClick={() => handleDelete(entry)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-2 py-1.5">Account</th>
                    <th className="px-2 py-1.5">Description</th>
                    <th className="px-2 py-1.5 text-right">Debit</th>
                    <th className="px-2 py-1.5 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((l) => (
                    <tr key={l.id} className="border-t border-gray-100">
                      <td className="px-2 py-2">{l.code} - {l.account_name}</td>
                      <td className="px-2 py-2 text-gray-500">{l.description}</td>
                      <td className="px-2 py-2 text-right">{l.debit ? formatCurrency(l.debit) : ''}</td>
                      <td className="px-2 py-2 text-right">{l.credit ? formatCurrency(l.credit) : ''}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 font-semibold">
                    <td className="px-2 py-2" colSpan="2">Total</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(totalDr)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(totalCr)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="card text-center text-gray-500 py-12">No journal entries found</div>
        )}
      </div>
    </div>
  );
}

function LineFields({ title, line, accounts, onLine }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="md:col-span-1 flex items-center">
        <span className="font-medium text-gray-600">{title}</span>
      </div>
      <div>
        <label className="label">Account</label>
        <select className="input-field" value={line.account_id} onChange={(e) => onLine({ ...line, account_id: e.target.value })}>
          <option value="">Select account</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Debit / Credit Amount</label>
        <input className="input-field" type="number" step="0.01" value={line.debit} onChange={(e) => onLine({ ...line, debit: e.target.value })} placeholder="Amount" />
      </div>
      <div>
        <label className="label">Description (optional)</label>
        <input className="input-field" value={line.description} onChange={(e) => onLine({ ...line, description: e.target.value })} placeholder="Line detail" />
      </div>
    </div>
  );
}