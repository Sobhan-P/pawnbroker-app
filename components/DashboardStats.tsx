'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardStats } from '@/types';

export default function DashboardStatsCard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) return <p className="text-gray-500">Loading stats...</p>;

  const cards = [
    { label: 'Active Loans', value: stats.totalActive, color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', href: '/clients' },
    { label: 'Total Pledged', value: `Rs. ${stats.totalPawnAmount.toLocaleString('en-IN')}`, color: 'bg-green-100 text-green-800 hover:bg-green-200', href: '/clients' },
    { label: 'Overdue Loans', value: stats.overdueCount, color: 'bg-red-100 text-red-800 hover:bg-red-200', href: '/clients' },
    { label: 'Closed Loans', value: stats.totalClosed, color: 'bg-gray-100 text-gray-700 hover:bg-gray-200', href: '/closed' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className={`rounded-xl p-5 shadow transition-colors cursor-pointer ${c.color}`}>
          <p className="text-sm font-medium">{c.label}</p>
          <p className="text-2xl font-bold mt-1">{c.value}</p>
        </Link>
      ))}
    </div>
  );
}
