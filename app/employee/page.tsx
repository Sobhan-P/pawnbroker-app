'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IClient } from '@/types';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function todayIST() {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0];
}

const EXPENSE_TAGS = ['Rent', 'Salary', 'Electricity', 'Supplies', 'Maintenance', 'Other Expense'];

export default function EmployeePage() {
  const [clients, setClients] = useState<IClient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState(false);

  // Expense form
  const [showExpense, setShowExpense] = useState(false);
  const [expDate, setExpDate] = useState(todayIST());
  const [expTag, setExpTag] = useState('');
  const [expCustomTag, setExpCustomTag] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expSaving, setExpSaving] = useState(false);
  const [expDone, setExpDone] = useState(false);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const tag = expTag === '__custom__' ? expCustomTag.trim() : expTag;
    if (!tag || !expAmount) return;
    setExpSaving(true);
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: expDate, type: 'expense', amount: parseFloat(expAmount), tag, description: expDesc }),
    });
    setExpSaving(false);
    setExpAmount('');
    setExpDesc('');
    setExpTag('');
    setExpCustomTag('');
    setExpDone(true);
    setTimeout(() => setExpDone(false), 3000);
  }

  async function handleSendWhatsApp() {
    setSending(true);
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().split('T')[0];
    const data = await fetch(`/api/report?date=${todayIST}`).then((r) => r.json());
    setSending(false);
    const message =
      `PPN Finance — Daily Summary (${todayIST})\n` +
      `New Loans: ${data.newCount || 0} | Amount: Rs.${(data.totalNewPrincipal || 0).toLocaleString('en-IN')}\n` +
      `Closed Loans: ${data.closedCount || 0} | Collected: Rs.${(data.totalCollected || 0).toLocaleString('en-IN')}\n` +
      `Interest Earned Today: Rs.${(data.totalInterestCollected || 0).toLocaleString('en-IN')}`;
    window.open(`https://wa.me/917530058236?text=${encodeURIComponent(message)}`, '_blank');
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setSearched(true);
    const [active, closed] = await Promise.all([
      fetch(`/api/clients?search=${encodeURIComponent(search)}`).then((r) => r.json()),
      fetch(`/api/clients-closed?search=${encodeURIComponent(search)}`).then((r) => r.json()),
    ]);
    setClients([...(Array.isArray(active) ? active : []), ...(Array.isArray(closed) ? closed : [])]);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex-1 mr-4">
          <h1 className="text-xl font-bold text-blue-900">Loan Search</h1>
          <p className="text-blue-400 text-sm mt-0.5">Search by GL Number, Customer Name or Contact</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/clients/new"
            className="bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 whitespace-nowrap flex items-center gap-2 shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Pawn Entry
          </Link>
          <button
            onClick={handleSendWhatsApp}
            disabled={sending}
            className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 whitespace-nowrap shadow"
          >
            {sending ? 'Sending...' : 'Send WhatsApp Summary'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          placeholder="SEARCH BY GL NUMBER, NAME OR CONTACT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:uppercase placeholder:text-gray-400 bg-white shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !search.trim()}
          className="bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Record Expense */}
      <div className="mb-5">
        <button
          onClick={() => setShowExpense((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${showExpense ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Record Expense
        </button>

        {showExpense && (
          <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <form onSubmit={handleAddExpense} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)}
                  onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tag</label>
                <select
                  value={expTag} onChange={(e) => setExpTag(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select...</option>
                  {EXPENSE_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="__custom__">Custom...</option>
                </select>
              </div>
              {expTag === '__custom__' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Custom Tag</label>
                  <input
                    value={expCustomTag} onChange={(e) => setExpCustomTag(e.target.value)}
                    placeholder="Tag name" required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs.)</label>
                <input
                  type="number" min="1" step="1" value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="0" required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                <input
                  value={expDesc} onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Description"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit" disabled={expSaving}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {expSaving ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
            {expDone && (
              <p className="text-sm text-green-600 font-medium mt-2">Expense recorded successfully.</p>
            )}
          </div>
        )}
      </div>

      {!loading && searched && clients.length === 0 && (
        <p className="text-gray-500 text-center py-8">No records found for &ldquo;{search}&rdquo;</p>
      )}

      {!loading && clients.length > 0 && (
        <div className="space-y-3">
          {clients.map((c) => {
            const isOverdue = c.status === 'active' && new Date(c.expectedReturnDate) < new Date();
            return (
              <Link
                key={c._id}
                href={`/clients/${c._id}`}
                className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    {c.glNumber && (
                      <p className="text-xs text-amber-600 font-semibold mb-0.5">GL: {c.glNumber}</p>
                    )}
                    <p className="text-xs text-blue-500 font-medium">#{c.serialNumber}</p>
                    <p className="font-semibold text-gray-800">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.contactNumber}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      c.status === 'active'
                        ? isOverdue
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {c.status === 'active' ? (isOverdue ? 'Overdue' : 'Active') : 'Closed'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-1">{c.jewelleryDetails}</p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-xs text-gray-400">AMOUNT</span>
                    <p className="font-medium">Rs. {c.pawnAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">DUE DATE</span>
                    <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                      {new Date(c.expectedReturnDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!searched && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">Enter GL number, customer name or contact to search</p>
        </div>
      )}
    </div>
  );
}
