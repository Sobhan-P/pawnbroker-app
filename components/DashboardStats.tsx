'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardStats } from '@/types';

// Compute current Indian FY start year label e.g. "2025–26"
function getFYLabel() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed, so March = 2
  const year = now.getFullYear();
  const fyStartYear = month < 3 ? year - 1 : year;
  return `FY ${fyStartYear}–${String(fyStartYear + 1).slice(2)}`;
}

export default function DashboardStatsCard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setStats(data); });
  }, []);

  if (!stats) return <p className="text-gray-500">Loading stats...</p>;

  const mainCards = [
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

  const todayCards = [
    {
      label: "TODAY'S NEW LOANS",
      value: stats.todayNewCount,
      sub: stats.todayNewCount === 1 ? '1 loan disbursed today' : `${stats.todayNewCount} loans disbursed today`,
      color: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200',
      href: '/admin/report',
    },
    {
      label: "TODAY'S CLOSED LOANS",
      value: stats.todayClosedCount,
      sub: stats.todayClosedCount === 1 ? '1 loan closed today' : `${stats.todayClosedCount} loans closed today`,
      color: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200',
      href: '/admin/report',
    },
  ];

  const fyLabel = getFYLabel();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mainCards.map((c) => (
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
      <div className="grid grid-cols-2 gap-4">
        {todayCards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-xl px-5 py-4 shadow border transition-colors cursor-pointer ${c.color}`}
          >
            <p className="text-xs font-semibold tracking-wide opacity-70">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
            <p className="text-xs mt-1 opacity-60">{c.sub}</p>
          </Link>
        ))}
      </div>
      {/* FY Interest Earned */}
      <Link
        href="/admin/report"
        className="block rounded-xl px-5 py-4 shadow border bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200 transition-colors cursor-pointer"
      >
        <p className="text-xs font-semibold tracking-wide opacity-70">TOTAL INTEREST EARNED — {fyLabel}</p>
        <p className="text-3xl font-bold mt-1">Rs. {(stats.fyInterestEarned ?? 0).toLocaleString('en-IN')}</p>
        <p className="text-xs mt-1 opacity-60">April 1 to today (Indian Financial Year)</p>
      </Link>
    </div>
  );
}
