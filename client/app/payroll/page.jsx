'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, formatCurrency } from '@/src/lib/api';

const PKR_TO_AED = 0.0136;

export default function Payroll() {
  const [people, setPeople] = useState([]);
  const [pakistaniStaff, setPakistaniStaff] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryInputs, setSalaryInputs] = useState({});
  const [leadForm, setLeadForm] = useState({ date: new Date().toISOString().slice(0, 10), employee_id: '', description: '' });

  useEffect(() => { api.get('/people').then((p) => { setPeople(p); setPakistaniStaff(p.filter(x => x.type === 'Pakistani')); }).catch(console.error); }, []);
  useEffect(() => { api.get('/payroll').then((p) => {
    const inputs = {};
    p.forEach(person => inputs[person.id] = person.fixed_salary.toFixed(2));
    setSalaryInputs(inputs);
  }).catch(console.error); }, []);

  const handleSalaryChange = (id, val) => setSalaryInputs({ ...salaryInputs, [id]: val });

  const runPayroll = async () => {
    const salaries = Object.entries(salaryInputs)
      .filter(([id, amt]) => parseFloat(amt) > 0)
      .map(([id, amt]) => ({ person_id: parseInt(id), amount: parseFloat(amt) }));
    try {
      await api.post('/payroll/run', { month, salaries });
      toast.success('Salary entries posted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const qualifyLead = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leads/qualify', leadForm);
      toast.success('Lead bonus (4,000 PKR) posted');
      setLeadForm({ date: new Date().toISOString().slice(0, 10), employee_id: '', description: '' });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Payroll & Staff Compensation</h2>
        <p className="text-gray-500 text-sm mt-1">Fixed salary (Pakistani staff) + 1.5% deal commission + 4,000 PKR lead bonus</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Fixed Salaries (Pakistani Staff)</h3>
            <div>
              <label className="label text-xs">Salary Month</label>
              <input type="month" className="input-field" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {people.filter(p => p.fixed_salary > 0).map((p) => (
              <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.role} • {p.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">AED</span>
                  <input
                    className="input-field w-32"
                    type="number"
                    step="0.01"
                    value={salaryInputs[p.id] || 0}
                    onChange={(e) => handleSalaryChange(p.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
            {people.filter(p => p.fixed_salary > 0).length === 0 && <p className="text-sm text-gray-400">No fixed-salary staff configured. Uses lead bonus + 1.5% commission.</p>}
          </div>
          <button onClick={runPayroll} className="btn-primary mt-4">Post Salary Entries</button>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Lead Qualification Bonus</h3>
          <p className="text-sm text-gray-600 mb-4">Each qualified lead earns the Pakistani employee <b>4,000 PKR ({formatCurrency(4000 * PKR_TO_AED)})</b>.</p>
          <form onSubmit={qualifyLead} className="space-y-3">
            <div>
              <label className="label">Employee</label>
              <select className="input-field" value={leadForm.employee_id} onChange={(e) => setLeadForm({ ...leadForm, employee_id: e.target.value })} required>
                <option value="">Select staff</option>
                {pakistaniStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input-field" value={leadForm.date} onChange={(e) => setLeadForm({ ...leadForm, date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input-field" value={leadForm.description} onChange={(e) => setLeadForm({ ...leadForm, description: e.target.value })} placeholder="e.g. Qualified lead - Downtown" />
            </div>
            <button type="submit" className="btn-primary">Post Lead Bonus</button>
          </form>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-semibold text-gray-800 mb-3">Staff Commission Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="font-medium mb-1">Deal Commission</p>
            <p className="text-2xl font-bold text-primary-600">1.5%</p>
            <p className="text-xs text-gray-500 mt-1">of sale price when a deal closes</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="font-medium mb-1">Lead Bonus</p>
            <p className="text-2xl font-bold text-primary-600">4,000 PKR</p>
            <p className="text-xs text-gray-500 mt-1">per qualified lead (~{formatCurrency(4000 * PKR_TO_AED)})</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="font-medium mb-1">Currency</p>
            <p className="text-2xl font-bold text-primary-600">AED</p>
            <p className="text-xs text-gray-500 mt-1">All accounting in UAE Dirhams</p>
          </div>
        </div>
      </div>
    </div>
  );
}