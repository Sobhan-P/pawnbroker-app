'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Don't show navbar on login/setup pages
  if (!session || pathname === '/login' || pathname === '/setup') return null;

  const isAdmin = session.user.role === 'admin';

  const adminLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/clients', label: 'Active Loans' },
    { href: '/clients/new', label: '+ New Pawn' },
    { href: '/closed', label: 'Closed Records' },
    { href: '/admin/report', label: 'Daily Report' },
    { href: '/admin/cashflow', label: 'Cash Flow' },
    { href: '/admin/users', label: 'Users' },
  ];

  const employeeLinks = [
    { href: '/employee', label: 'Search Loans' },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <nav className="bg-linear-to-r from-blue-700 to-blue-500 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href={isAdmin ? '/' : '/employee'} className="font-bold text-lg tracking-wide hover:opacity-80 transition-opacity flex items-center gap-2">
          <span className="text-amber-300">SB</span>
          <span>Finance</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded transition-colors ${pathname === l.href ? 'bg-white text-blue-700' : 'hover:bg-blue-600'
                }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="ml-3 pl-3 border-l border-blue-400 flex items-center gap-2">
            <span className="text-blue-200 text-xs">{session.user.name}</span>
            <button
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.href = '/login';
              }}
              className="px-3 py-1.5 rounded bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1 p-2 rounded hover:bg-blue-600"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 bg-white" />
          <span className="block w-5 h-0.5 bg-white" />
          <span className="block w-5 h-0.5 bg-white" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-blue-800 px-4 pb-3 flex flex-col gap-1 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded transition-colors ${pathname === l.href ? 'bg-white text-blue-700' : 'hover:bg-blue-700'
                }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-blue-700 pt-2 mt-1">
            <p className="text-blue-300 text-xs px-3 mb-1">{session.user.name} ({session.user.role})</p>
            <button
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.href = '/login';
              }}
              className="w-full text-left px-3 py-2.5 rounded hover:bg-blue-700 text-red-300 font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
