'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/simulator', label: 'Simulator' },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-300 text-slate-950 shadow-sm">
            R
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Revivo</p>
            <p className="text-xs text-slate-500">Dunning Engine</p>
          </div>
        </Link>

        <nav className="ml-6 flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active ? 'bg-gray-800 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Link
        href="/"
        className="text-sm text-slate-400 transition hover:text-white"
      >
        ← Landing
      </Link>
    </div>
  );
}
