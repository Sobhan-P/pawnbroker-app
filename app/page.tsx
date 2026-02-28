import DashboardStatsCard from '@/components/DashboardStats';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Dashboard</h1>
          <p className="text-blue-400 text-sm mt-0.5">Gold Pawn Management Overview</p>
        </div>
        <Link
          href="/clients/new"
          className="bg-amber-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-800 transition-colors"
        >
          + New Pawn Entry
        </Link>
      </div>

      <DashboardStatsCard />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/clients" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-gray-800 mb-1">Active Records</h2>
          <p className="text-sm text-gray-500">View and manage all active pawn loans</p>
        </Link>
        <Link href="/closed" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-gray-800 mb-1">Closed Records</h2>
          <p className="text-sm text-gray-500">Browse all closed and settled pawn records</p>
        </Link>
      </div>
    </div>
  );
}
