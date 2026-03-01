'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardStats } from '@/types';

export default function DashboardStatsCard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setStats(data); });
  }, []);

  if (!stats) return <p className="text-gray-500">Loading stats...</p>;

  const cards = [
    {
      label: 'ACTIVE LOANS',
      value: stats.totalActive,
      color: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200',
      href: '/clients',
    },
    {
      label: 'TOTAL PLEDGED',
      value: `Rs. ${stats.totalPawnAmount.toLocaleString('en-IN')}`,
      color: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
      href: '/clients',
    },
    {
      label: 'OVERDUE LOANS',
      value: stats.overdueCount,
      color: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200',
      href: '/clients?filter=overdue',
    },
    {
      label: 'CLOSED LOANS',
      value: stats.totalClosed,
      color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200',
      href: '/closed',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className={`rounded-xl p-5 shadow border transition-colors cursor-pointer ${c.color}`}
        >
          <p className="text-xs font-semibold tracking-wide opacity-70">{c.label}</p>
          <p className="text-2xl font-bold mt-1">{c.value}</p>
        </Link>
      ))}
    </div>
  );
}
