import DashboardStatsCard from '@/components/DashboardStats';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">PPN Finance — Dashboard</h1>
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

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/clients" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-blue-600 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-800 mb-1">Active Loans</h2>
          <p className="text-sm text-gray-500">View and manage all active pawn loans</p>
        </Link>
        <Link href="/closed" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-gray-500 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-800 mb-1">Closed Records</h2>
          <p className="text-sm text-gray-500">Browse all closed and settled pawn records</p>
        </Link>
        <Link href="/admin/report" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-green-600 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-800 mb-1">Daily Report</h2>
          <p className="text-sm text-gray-500">View and print today&apos;s activity report</p>
        </Link>
        <Link href="/admin/users" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-purple-600 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-800 mb-1">User Management</h2>
          <p className="text-sm text-gray-500">Add or remove employee accounts</p>
        </Link>
      </div>
    </div>
  );
}
