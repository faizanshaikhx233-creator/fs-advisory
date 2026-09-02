'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, formatCurrency, formatDate } from '@/src/lib/api';

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [people, setPeople] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    deal_date: new Date().toISOString().slice(0, 10),
    property_description: '',
    client_name: '',
    sale_price: '',
    lead_source: 'Company',
    agent_id: '',
  });
  const [preview, setPreview] = useState(null);

  const load = () => { api.get('/deals').then(setDeals).catch(console.error); };
  useEffect(() => { load(); }, []);
  useEffect(() => { api.get('/people').then(setPeople).catch(console.error); }, []);

  const agents = people.filter((p) => p.role === 'Agent' || p.role === 'Owner');

  const handleChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    const agent = agents.find((a) => a.id === parseInt(next.agent_id));
    if (agent && next.sale_price) {
      const rate = next.lead_source === 'Personal' ? agent.personal_lead_rate : agent.company_lead_rate;
      setPreview({
        agent_rate: rate * 100,
        agent_commission: next.sale_price * rate,
        company_commission: next.sale_price * (1 - rate),
        vat: next.sale_price * (1 - rate) * 0.05,
      });
    } else {
      setPreview(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/deals', form);
      toast.success('Deal added (Active)');
      setShowForm(false);
      setForm({ deal_date: new Date().toISOString().slice(0, 10), property_description: '', client_name: '', sale_price: '', lead_source: 'Company', agent_id: '' });
      setPreview(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleClose = async (id) => {
    if (!confirm('Close this deal and post commission to ledger?')) return;
    try {
      await api.post(`/deals/${id}/close`, {});
      toast.success('Deal closed, commission posted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deals & Commission</h2>
          <p className="text-gray-500 text-sm mt-1">Track sales, agent splits, and auto-post commissions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ New Deal</button>
      </header>

      <div className="card mb-6 text-sm">
        <p className="font-semibold text-gray-700 mb-2">Commission Split Rules</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-600">
          <p><b>Faraz Shafi</b>: Company lead 50/50 • Personal lead 80/20</p>
          <p><b>Talha, Basit, Jahanzaib</b>: 50/50 both lead types</p>
          <p className="text-gray-500">VAT of 5% applied to company commission portion on closing.</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input-field" name="deal_date" value={form.deal_date} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Property</label>
            <input className="input-field" name="property_description" value={form.property_description} onChange={handleChange} placeholder="e.g. 2BR Marina View" />
          </div>
          <div>
            <label className="label">Client</label>
            <input className="input-field" name="client_name" value={form.client_name} onChange={handleChange} placeholder="Client name" />
          </div>
          <div>
            <label className="label">Sale Price (AED)</label>
            <input className="input-field" name="sale_price" type="number" step="0.01" value={form.sale_price} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Lead Source</label>
            <select className="input-field" name="lead_source" value={form.lead_source} onChange={handleChange}>
              <option value="Company">Company</option>
              <option value="Personal">Personal</option>
            </select>
          </div>
          <div>
            <label className="label">Agent</label>
            <select className="input-field" name="agent_id" value={form.agent_id} onChange={handleChange} required>
              <option value="">Select agent</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Save Deal</button>
          </div>
        </form>
      )}

      {preview && (
        <div className="card mb-6 bg-blue-50 border-blue-200 text-sm">
          <p className="font-semibold mb-2">Commission Preview</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-700">
            <p>Agent split: <b>{preview.agent_rate}%</b></p>
            <p>Agent commission: <b>{formatCurrency(preview.agent_commission)}</b></p>
            <p>Company commission: <b>{formatCurrency(preview.company_commission)}</b></p>
            <p>VAT (5%): <b>{formatCurrency(preview.vat)}</b></p>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Property</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Lead</th>
              <th className="px-3 py-2 text-right">Sale Price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{formatDate(d.deal_date)}</td>
                <td className="px-3 py-2 text-gray-700">{d.property_description}</td>
                <td className="px-3 py-2 text-gray-700">{d.client_name}</td>
                <td className="px-3 py-2">{d.agent_name}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.lead_source === 'Personal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{d.lead_source}</span>
                </td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(d.sale_price)}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'Active' ? 'bg-yellow-100 text-yellow-700' : d.status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.status}</span>
                </td>
                <td className="px-3 py-2">
                  {d.status === 'Active' && (
                    <button onClick={() => handleClose(d.id)} className="text-xs text-green-600 hover:text-green-800 font-medium">Close & Post</button>
                  )}
                </td>
              </tr>
            ))}
            {deals.length === 0 && <tr><td colSpan="8" className="px-3 py-8 text-center text-gray-500">No deals recorded</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}