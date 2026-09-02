'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api, formatCurrency, formatDate } from '@/src/lib/api';

const BANKS = [
  { code: '1021', label: 'Mashreq Bank (1021)' },
  { code: '1022', label: 'WIO Bank (1022)' },
  { code: '1010', label: 'Petty Cash (1010)' },
];

export default function BankImport() {
  const fileRef = useRef();
  const [imports, setImports] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [bank, setBank] = useState('');
  const [uploadBank, setUploadBank] = useState('1021');

  const loadTransactions = (params) => api.get('/bank/transactions', params).then(setTransactions).catch(console.error);

  useEffect(() => { api.get('/bank/imports').then(setImports).catch(console.error); }, []);
  useEffect(() => { loadTransactions(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bank', uploadBank);
    try {
      const res = await api.upload('/bank/upload', fd);
      if (res.success) {
        toast.success(`Imported ${res.imported} transactions`);
        setImports(await api.get('/bank/imports'));
        loadTransactions();
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.message);
    }
    fileRef.current.value = '';
  };

  const applyFilter = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (bank) params.bank = bank;
    loadTransactions(params);
  };

  const clearFilter = () => {
    setFrom(''); setTo(''); setBank('');
    loadTransactions();
  };

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bank Statement Upload</h2>
        <p className="text-gray-500 text-sm mt-1">Upload a CSV/statement to view bank transactions and reconcile</p>
      </header>

      <div className="card mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-700">Upload Bank Statement (CSV)</label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <div className="mt-3">
          <label className="label">Bank Account</label>
          <select className="input-field sm:w-64" value={uploadBank} onChange={(e) => setUploadBank(e.target.value)}>
            {BANKS.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Expected CSV columns: <b>Date, Description, Debit, Credit, Balance</b>. The upload previews transactions below.
        </p>
      </div>

      <div className="card mb-6 flex flex-wrap items-end gap-4">
        <h3 className="font-semibold text-gray-800 w-full">Imported Transactions</h3>
        <div>
          <label className="label">From</label>
          <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Bank</label>
          <select className="input-field" value={bank} onChange={(e) => setBank(e.target.value)}>
            <option value="">All Banks</option>
            {BANKS.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
          </select>
        </div>
        <button onClick={applyFilter} className="btn-primary">Apply Filter</button>
        <button onClick={clearFilter} className="btn-secondary">Reset</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Bank</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const bankLabel = BANKS.find((b) => b.code === t.bank)?.label || '';
              return (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{formatDate(t.transaction_date)}</td>
                  <td className="px-3 py-2 text-xs">{bankLabel}</td>
                  <td className="px-3 py-2 text-gray-700">{t.description}</td>
                  <td className="px-3 py-2 text-right">{t.debit ? formatCurrency(t.debit) : ''}</td>
                  <td className="px-3 py-2 text-right">{t.credit ? formatCurrency(t.credit) : ''}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(t.balance)}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{t.filename}</td>
                </tr>
              );
            })}
            {transactions.length === 0 && <tr><td colSpan="7" className="px-3 py-8 text-center text-gray-500">No transactions imported yet. Use Journal Entries with bank filter to view posted bank activity.</td></tr>}
          </tbody>
        </table>
      </div>

      {imports.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold text-gray-800 mb-3">Import History</h3>
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="px-3 py-2">File</th><th className="px-3 py-2">Bank</th><th className="px-3 py-2">Records</th><th className="px-3 py-2">Imported At</th></tr></thead>
            <tbody>
              {imports.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{i.filename}</td>
                  <td className="px-3 py-2">{BANKS.find((b) => b.code === i.bank)?.label || '-'}</td>
                  <td className="px-3 py-2">{i.record_count}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(i.imported_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}