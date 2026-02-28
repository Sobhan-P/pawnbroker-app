'use client';

import { useEffect, useState } from 'react';
import ClientTable from '@/components/ClientTable';
import { IClient } from '@/types';
import Link from 'next/link';

export default function ActiveClientsPage() {
  const [clients, setClients] = useState<IClient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clients?search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((data) => { setClients(data); setLoading(false); });
  }, [search]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Active Pawn Records</h1>
        <Link
          href="/clients/new"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          + New Pawn Entry
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search by name, mobile number or serial no..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-4 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <ClientTable clients={clients} />
      )}
    </div>
  );
}
