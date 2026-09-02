'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import '@/app/globals.css';

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
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-primary-400">FS Advisory</h1>
        <p className="text-xs text-gray-400 mt-1">Real Estate Accounting</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        Currency: AED | VAT: 5%
      </div>
    </aside>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}