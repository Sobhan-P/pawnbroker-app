'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/clients', label: 'Active Records' },
  { href: '/clients/new', label: '+ New Pawn' },
  { href: '/closed', label: 'Closed Records' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-linear-to-r from-blue-600 to-blue-400 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-wide hover:opacity-80 transition-opacity">PawnBroker Manager</Link>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-4 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1 rounded transition-colors ${
                pathname === l.href ? 'bg-white text-blue-600' : 'hover:bg-blue-500'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1 p-2 rounded hover:bg-blue-500"
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
        <div className="md:hidden bg-blue-700 px-4 pb-3 flex flex-col gap-1 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded transition-colors ${
                pathname === l.href ? 'bg-white text-blue-600' : 'hover:bg-blue-600'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
