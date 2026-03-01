'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClientTable from '@/components/ClientTable';
import { IClient } from '@/types';
import Link from 'next/link';

function ActiveClientsContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') === 'overdue' ? 'overdue' : 'all';

  const [clients, setClients] = useState<IClient[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'overdue'>(initialFilter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter !== 'all') params.set('filter', filter);
    fetch(`/api/clients?${params}`)
      .then((r) => r.json())
      .then((data) => { setClients(Array.isArray(data) ? data : []); setLoading(false); });
  }, [search, filter]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Active Pawn Loans</h1>
        <Link
          href="/clients/new"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          + New Pawn Entry
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="SEARCH BY GL NUMBER, NAME, CONTACT OR SERIAL NO."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
        />
        <div className="flex gap-2">
          {(['all', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                filter === f
                  ? f === 'overdue'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'ALL ACTIVE' : 'OVERDUE'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <ClientTable clients={clients} />
      )}
    </div>
  );
}

export default function ActiveClientsPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
      <ActiveClientsContent />
    </Suspense>
  );
}
