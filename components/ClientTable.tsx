'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IClient } from '@/types';

interface ClientTableProps {
  clients: IClient[];
  showClosedDate?: boolean;
}

export default function ClientTable({ clients, showClosedDate = false }: ClientTableProps) {
  const router = useRouter();

  if (clients.length === 0) {
    return <p className="text-gray-500 text-center py-8">No records found.</p>;
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="md:hidden flex flex-col gap-3">
        {clients.map((c) => {
          const isOverdue = c.status === 'active' && new Date(c.expectedReturnDate) < new Date();
          return (
            <Link key={c._id} href={`/clients/${c._id}`} className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-1">
                <div>
                  {c.glNumber && (
                    <p className="text-xs text-amber-600 font-semibold">GL: {c.glNumber}</p>
                  )}
                  <p className="text-xs text-blue-500 font-medium">#{c.serialNumber}</p>
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.contactNumber}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  c.status === 'active'
                    ? isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {c.status === 'active' ? (isOverdue ? 'Overdue' : 'Active') : 'Closed'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{c.jewelleryDetails}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <p className="text-xs text-gray-400">AMOUNT</p>
                  <p className="font-medium">Rs. {c.pawnAmount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">DUE DATE</p>
                  <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                    {new Date(c.expectedReturnDate).toLocaleDateString('en-IN')}
                    {isOverdue && ' ⚠'}
                  </p>
                </div>
                {showClosedDate && c.closedDate && (
                  <div>
                    <p className="text-xs text-gray-400">CLOSED ON</p>
                    <p className="font-medium">{new Date(c.closedDate).toLocaleDateString('en-IN')}</p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-50 text-blue-800 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">GL No.</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Jewellery</th>
              <th className="px-4 py-3 text-right">Amount (Rs.)</th>
              <th className="px-4 py-3 text-left">Due Date</th>
              {showClosedDate && <th className="px-4 py-3 text-left">Closed On</th>}
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => {
              const isOverdue = c.status === 'active' && new Date(c.expectedReturnDate) < new Date();
              return (
                <tr
                  key={c._id}
                  onClick={() => router.push(`/clients/${c._id}`)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-blue-500 font-medium">{c.serialNumber}</td>
                  <td className="px-4 py-3 text-amber-600 font-medium">{c.glNumber || '—'}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.contactNumber}</td>
                  <td className="px-4 py-3 max-w-40 truncate">{c.jewelleryDetails}</td>
                  <td className="px-4 py-3 text-right">{c.pawnAmount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                      {new Date(c.expectedReturnDate).toLocaleDateString('en-IN')}
                      {isOverdue && ' ⚠'}
                    </span>
                  </td>
                  {showClosedDate && (
                    <td className="px-4 py-3">
                      {c.closedDate ? new Date(c.closedDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      c.status === 'active'
                        ? isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {c.status === 'active' ? (isOverdue ? 'Overdue' : 'Active') : 'Closed'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
