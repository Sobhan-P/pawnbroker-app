'use client';

import { useEffect, useState } from 'react';
import ClientTable from '@/components/ClientTable';
import { IClient } from '@/types';

export default function ClosedRecordsPage() {
  const [clients, setClients] = useState<IClient[]>([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    fetch(`/api/clients-closed?${params}`)
      .then((r) => r.json())
      .then((data) => { setClients(Array.isArray(data) ? data : []); setLoading(false); });
  }, [search, from, to]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Closed Records</h1>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="SEARCH BY GL NUMBER, NAME, CONTACT OR SERIAL NO."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
        />
        <div className="flex gap-3 shrink-0">
          <input
            id="closed-from-date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
            className="border rounded-lg px-3 py-2 text-sm min-w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            id="closed-to-date"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
            className="border rounded-lg px-3 py-2 text-sm min-w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {(search || from || to) && (
          <button
            onClick={() => { setSearch(''); setFrom(''); setTo(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline self-center shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <ClientTable clients={clients} showClosedDate showPawnDate />
      )}
    </div>
  );
}
