import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import ChartOfAccounts from './pages/ChartOfAccounts';
import JournalEntries from './pages/JournalEntries';
import GeneralLedger from './pages/GeneralLedger';
import TrialBalance from './pages/TrialBalance';
import BalanceSheetPage from './pages/BalanceSheet';
import Deals from './pages/Deals';
import BankImport from './pages/BankImport';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/accounts', label: 'Chart of Accounts', icon: '📋' },
  { path: '/journal', label: 'Journal Entries', icon: '📝' },
  { path: '/ledger', label: 'General Ledger', icon: '📖' },
  { path: '/trial-balance', label: 'Trial Balance', icon: '⚖️' },
  { path: '/balance-sheet', label: 'Balance Sheet', icon: '📑' },
  { path: '/deals', label: 'Deals & Commission', icon: '🏠' },
  { path: '/payroll', label: 'Payroll', icon: '👥' },
  { path: '/bank', label: 'Bank Import', icon: '🏦' },
  { path: '/reports', label: 'Profit & Loss', icon: '📈' },
];

function Sidebar() {
  const location = useLocation();
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-primary-400">FS Advisory</h1>
        <p className="text-xs text-gray-400 mt-1">Real Estate Accounting</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === item.path
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        Currency: AED | VAT: 5%
      </div>
    </aside>
  );
}

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<ChartOfAccounts />} />
          <Route path="/journal" element={<JournalEntries />} />
          <Route path="/ledger" element={<GeneralLedger />} />
          <Route path="/trial-balance" element={<TrialBalance />} />
          <Route path="/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/bank" element={<BankImport />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  );
}
