'use client';

import { useEffect, useState, useCallback } from 'react';
import { CashflowSummary, ITransaction } from '@/types';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function todayIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0];
}

function monthStartIST(): string {
  const d = new Date(Date.now() + IST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function rs(n: number) {
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
}

const INCOME_TAGS = ['Interest Received', 'Commission', 'Fee', 'Rent', 'Miscellaneous Income'];
const EXPENSE_TAGS = ['Rent', 'Salary', 'Electricity', 'Supplies', 'Maintenance', 'Other Expense'];

export default function CashflowPage() {
  const [from, setFrom] = useState(monthStartIST());
  const [to, setTo] = useState(todayIST());
  const [data, setData] = useState<CashflowSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit initial balance
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  // Add transaction form
  const [txDate, setTxDate] = useState(todayIST());
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txTag, setTxTag] = useState('');
  const [txCustomTag, setTxCustomTag] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txSaving, setTxSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cashflow?from=${from}&to=${to}`);
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  async function saveBalance() {
    const val = parseFloat(balanceInput);
    if (isNaN(val)) return;
    setSavingBalance(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalance: val }),
    });
    setSavingBalance(false);
    setEditingBalance(false);
    load();
  }

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    const tag = txTag === '__custom__' ? txCustomTag.trim() : txTag;
    if (!tag || !txAmount) return;
    setTxSaving(true);
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: txDate, type: txType, amount: parseFloat(txAmount), tag, description: txDesc }),
    });
    setTxSaving(false);
    setTxAmount('');
    setTxDesc('');
    setTxTag('');
    setTxCustomTag('');
    load();
  }

  async function deleteTransaction(id: string) {
    if (!confirm('Delete this transaction?')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    load();
  }

  // Build calendar grid for the period
  const calendarDays = buildCalendarDays(from, to, data?.days ?? []);

  const tagOptions = txType === 'income' ? INCOME_TAGS : EXPENSE_TAGS;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cash Flow</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track money in and out — pawn segment + other transactions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">From</span>
          <input
            type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-500 font-medium">To</span>
          <input
            type="date" value={to} onChange={(e) => setTo(e.target.value)}
            onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm mb-4">Loading...</p>}

      {data && (
        <>
          {/* Running balance header */}
          <div className="bg-blue-700 text-white rounded-2xl p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">All-Time Running Balance</p>
              <p className="text-4xl font-black mt-1">
                {data.runningBalance >= 0 ? '' : '− '}Rs. {Math.abs(data.runningBalance).toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-blue-200 mt-1">
                Opening balance: {rs(data.initialBalance)}
              </p>
            </div>
            <div>
              {editingBalance ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number" value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="Initial balance"
                    className="bg-white/15 border border-white/40 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 w-40 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <button onClick={saveBalance} disabled={savingBalance}
                    className="bg-white text-blue-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 disabled:opacity-50">
                    {savingBalance ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditingBalance(false)}
                    className="bg-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-500">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setBalanceInput(String(data.initialBalance)); setEditingBalance(true); }}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Edit Opening Balance
                </button>
              )}
            </div>
          </div>

          {/* Period summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Pawn segment */}
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-3">Pawn Segment</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Loans Disbursed</span>
                  <span className="text-red-600 font-medium">− {rs(data.period.loansOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Collections Received</span>
                  <span className="text-green-600 font-medium">+ {rs(data.period.collectionsIn)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Pawn Net</span>
                  <span className={data.period.pawnNet >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {data.period.pawnNet >= 0 ? '+' : '−'} {rs(Math.abs(data.period.pawnNet))}
                  </span>
                </div>
              </div>
            </div>

            {/* Other segment */}
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <p className="text-xs font-bold uppercase tracking-wide text-purple-700 mb-3">Other Transactions</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Other Income</span>
                  <span className="text-green-600 font-medium">+ {rs(data.period.otherIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expenses</span>
                  <span className="text-red-600 font-medium">− {rs(data.period.otherExpenses)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Other Net</span>
                  <span className={data.period.otherNet >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {data.period.otherNet >= 0 ? '+' : '−'} {rs(Math.abs(data.period.otherNet))}
                  </span>
                </div>
              </div>
            </div>

            {/* Period total */}
            <div className={`rounded-xl border-2 p-4 ${data.period.totalNet >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-3">Period Total</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total In</span>
                  <span className="text-green-600 font-medium">+ {rs(data.period.collectionsIn + data.period.otherIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Out</span>
                  <span className="text-red-600 font-medium">− {rs(data.period.loansOut + data.period.otherExpenses)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>Net Flow</span>
                  <span className={data.period.totalNet >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {data.period.totalNet >= 0 ? '+' : '−'} {rs(Math.abs(data.period.totalNet))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar grid */}
          {calendarDays.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-800 mb-3">Daily Breakdown</h2>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell) => (
                  <CalendarCell key={cell.date} cell={cell} />
                ))}
              </div>
            </div>
          )}

          {/* Add transaction form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Add Transaction</h2>
            <form onSubmit={addTransaction} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                  onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={txType}
                  onChange={(e) => { setTxType(e.target.value as 'income' | 'expense'); setTxTag(''); }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tag</label>
                <select
                  value={txTag}
                  onChange={(e) => setTxTag(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                >
                  <option value="">Select tag...</option>
                  {tagOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="__custom__">Custom...</option>
                </select>
              </div>
              {txTag === '__custom__' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Custom Tag</label>
                  <input
                    value={txCustomTag} onChange={(e) => setTxCustomTag(e.target.value)}
                    placeholder="Enter tag" required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs.)</label>
                <input
                  type="number" min="1" step="1" value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="0" required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  value={txDesc} onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="Optional note"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit" disabled={txSaving}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {txSaving ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>

          {/* Transactions table */}
          {data.transactions.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-800 mb-3">Other Transactions in Period ({data.transactions.length})</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Tag</th>
                      <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Recorded By</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.transactions as ITransaction[]).map((t, i) => (
                      <tr key={t._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3">
                          {new Date(t.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {t.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{t.tag}</td>
                        <td className={`px-4 py-3 text-right font-medium ${t.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                          {t.type === 'income' ? '+' : '−'} {t.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{t.description || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{t.recordedByName || '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteTransaction(t._id)}
                            className="text-red-400 hover:text-red-600 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Calendar helpers ─────────────────────────────────────────────────────────

interface DayCell {
  date: string;
  dayNumber: number;
  loansOut: number;
  collectionsIn: number;
  otherIncome: number;
  otherExpenses: number;
  net: number;
}

function localDateKey(d: Date): string {
  // Use local-time components (IST on server/client) so the key matches the YYYY-MM-DD
  // from/to strings — toISOString() would give UTC date which is wrong for IST.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildCalendarDays(
  from: string,
  to: string,
  days: CashflowSummary['days']
): DayCell[] {
  if (!from || !to) return [];
  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T00:00:00');

  // Limit calendar to 6 weeks max (42 cells) to avoid huge grids for long ranges
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  if (diffDays > 42) return [];

  const daysByDate = new Map(days.map((d) => [d.date, d]));
  const cells: DayCell[] = [];

  let cur = new Date(fromDate);
  while (cur <= toDate) {
    const key = localDateKey(cur);
    const d = daysByDate.get(key);
    cells.push({
      date: key,
      dayNumber: cur.getDate(),
      loansOut: d?.loansOut ?? 0,
      collectionsIn: d?.collectionsIn ?? 0,
      otherIncome: d?.otherIncome ?? 0,
      otherExpenses: d?.otherExpenses ?? 0,
      net: d?.net ?? 0,
    });
    cur = new Date(cur.getTime() + 86400000);
  }

  return cells;
}

function CalendarCell({ cell }: { cell: DayCell }) {
  const hasActivity = cell.loansOut > 0 || cell.collectionsIn > 0 || cell.otherIncome > 0 || cell.otherExpenses > 0;
  const positive = cell.net >= 0;

  return (
    <div
      className={`rounded-lg border p-1.5 min-h-18 text-xs ${
        !hasActivity
          ? 'border-gray-100 bg-white'
          : positive
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
      }`}
    >
      <p className="font-bold text-gray-700 mb-1">{cell.dayNumber}</p>
      {cell.loansOut > 0 && (
        <p className="text-red-600">−{(cell.loansOut / 1000).toFixed(1)}k out</p>
      )}
      {cell.collectionsIn > 0 && (
        <p className="text-blue-600">+{(cell.collectionsIn / 1000).toFixed(1)}k in</p>
      )}
      {cell.otherIncome > 0 && (
        <p className="text-emerald-600">+{(cell.otherIncome / 1000).toFixed(1)}k</p>
      )}
      {cell.otherExpenses > 0 && (
        <p className="text-orange-600">−{(cell.otherExpenses / 1000).toFixed(1)}k exp</p>
      )}
      {hasActivity && (
        <p className={`font-bold mt-1 border-t ${positive ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}>
          {positive ? '+' : '−'}{(Math.abs(cell.net) / 1000).toFixed(1)}k
        </p>
      )}
    </div>
  );
}
