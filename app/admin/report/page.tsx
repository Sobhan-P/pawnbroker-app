'use client';

import { useEffect, useState } from 'react';
import { DailyReport } from '@/types';
import { formatDateIST, getTodayIST } from '@/lib/dateUtils';
import DateInput from '@/components/DateInput';

// todayIST removed - replaced by getTodayIST from dateUtils

function getFYLabel() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const fyStartYear = month < 3 ? year - 1 : year;
  return `FY ${fyStartYear}–${String(fyStartYear + 1).slice(2)}`;
}

export default function DailyReportPage() {
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [date, setDate] = useState(getTodayIST());
  const [from, setFrom] = useState(getTodayIST());
  const [to, setTo] = useState(getTodayIST());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);

  function buildUrl() {
    if (mode === 'range') {
      return `/api/report?from=${from}&to=${to}`;
    }
    return `/api/report?date=${date}`;
  }

  async function loadReport() {
    setLoading(true);
    const data = await fetch(buildUrl()).then((r) => r.json());
    setReport(data);
    setLoading(false);
  }

  useEffect(() => { loadReport(); }, [date, from, to, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daily Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">New loans and closures for selected period</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle */}
          <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-2 ${mode === 'single' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Single Day
            </button>
            <button
              onClick={() => setMode('range')}
              className={`px-3 py-2 ${mode === 'range' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Date Range
            </button>
          </div>

          {mode === 'single' ? (
            <DateInput
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="!w-48"
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">From</span>
              <DateInput
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40 sm:w-44"
              />
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">To</span>
              <DateInput
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40 sm:w-44"
              />
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-400">Loading report...</p>}

      {report && (
        <div className="space-y-6">
          {/* Print header */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold">SB Finance</h1>
            <p>
              {report.isRange
                ? `Report — ${report.dateLabel}`
                : `Daily Report — ${formatDateIST(report.date)}`}
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label={`NEW LOANS — ${report.newCount}`} value={`Rs. ${report.totalNewPrincipal.toLocaleString('en-IN')}`} color="bg-green-50 text-green-800 border-green-200" />
            <SummaryCard label={`CLOSED LOANS — ${report.closedCount}`} value={`Rs. ${report.totalCollected.toLocaleString('en-IN')}`} color="bg-gray-50 text-gray-700 border-gray-200" />
            <SummaryCard label="PRINCIPAL RETURNED" value={`Rs. ${((report.totalPrincipalFromClosures || 0) + (report.totalPartialPrincipalReduced || 0)).toLocaleString('en-IN')}`} color="bg-blue-50 text-blue-800 border-blue-200" />
            <SummaryCard label="INTEREST EARNED" value={`Rs. ${(report.totalInterestCollected || 0).toLocaleString('en-IN')}`} color="bg-emerald-50 text-emerald-800 border-emerald-200" />
          </div>
          {/* FY Interest Earned */}
          {report.fyInterestEarned !== undefined && (
            <SummaryCard
              label={`TOTAL INTEREST EARNED — ${getFYLabel()} (Apr 1 to today)`}
              value={`Rs. ${report.fyInterestEarned.toLocaleString('en-IN')}`}
              color="bg-purple-50 text-purple-800 border-purple-200"
            />
          )}

          {/* New Loans Table */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-3 text-lg">New Loans ({report.newCount})</h2>
            {report.newLoans.length === 0 ? (
              <p className="text-gray-400 text-sm">No new loans in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-green-50 text-green-800 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">GL No.</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Contact</th>
                      <th className="px-4 py-3 text-left">Jewellery</th>
                      <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                      <th className="px-4 py-3 text-left">Due Date</th>
                      <th className="px-4 py-3 text-left">Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.newLoans.map((c, i) => (
                      <tr key={c._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-blue-500">{c.serialNumber}</td>
                        <td className="px-4 py-3 text-amber-600 font-medium">{c.glNumber || '—'}</td>
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3">{c.contactNumber}</td>
                        <td className="px-4 py-3 max-w-36 truncate">{c.jewelleryDetails}</td>
                        <td className="px-4 py-3 text-right font-medium">{c.pawnAmount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">{formatDateIST(c.expectedReturnDate)}</td>
                        <td className="px-4 py-3 text-gray-500">{c.createdByName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Closed Loans Table */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-3 text-lg">Closed Loans ({report.closedCount})</h2>
            {report.closedLoans.length === 0 ? (
              <p className="text-gray-400 text-sm">No loans closed in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">GL No.</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Contact</th>
                      <th className="px-4 py-3 text-right">Principal (Rs.)</th>
                      <th className="px-4 py-3 text-right">Interest (Rs.)</th>
                      <th className="px-4 py-3 text-right">Total Collected (Rs.)</th>
                      <th className="px-4 py-3 text-left">Closed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.closedLoans.map((c, i) => {
                      const finalPmt = c.payments?.find((p) => p.type === 'full');
                      const principalPaid = finalPmt?.principalReduced ?? 0;
                      const interestPaid = finalPmt?.interestPaid ?? 0;
                      return (
                        <tr key={c._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-blue-500">{c.serialNumber}</td>
                          <td className="px-4 py-3 text-amber-600 font-medium">{c.glNumber || '—'}</td>
                          <td className="px-4 py-3 font-medium">{c.name}</td>
                          <td className="px-4 py-3">{c.contactNumber}</td>
                          <td className="px-4 py-3 text-right">{principalPaid.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-medium">{interestPaid.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-right font-bold">{(principalPaid + interestPaid).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">{formatDateIST(c.closedDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Partial Payments Table */}
          {report.partialPayments && report.partialPayments.length > 0 && (
            <section>
              <h2 className="font-semibold text-gray-800 mb-1 text-lg">Partial Payments ({report.partialPayments.length})</h2>
              <p className="text-xs text-gray-400 mb-3">Principal returned + interest collected via partial payments on this date</p>
              <div className="overflow-x-auto rounded-xl border border-blue-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-blue-50 text-blue-800 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">GL No.</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-right">Amount Paid (Rs.)</th>
                      <th className="px-4 py-3 text-right">Principal Reduced (Rs.)</th>
                      <th className="px-4 py-3 text-right">Interest Collected (Rs.)</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.partialPayments.map((p, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                        <td className="px-4 py-3 text-amber-600 font-medium">{p.glNumber || '—'}</td>
                        <td className="px-4 py-3 font-medium">{p.clientName}</td>
                        <td className="px-4 py-3 text-right font-bold">{p.amountPaid.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-blue-700">{p.principalReduced.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">{p.interestPaid.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">{formatDateIST(p.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50 font-semibold text-blue-900">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-right">Total</td>
                      <td className="px-4 py-2 text-right">{report.partialPayments.reduce((s, p) => s + p.amountPaid, 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 text-right text-blue-700">{(report.totalPartialPrincipalReduced || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 text-right text-emerald-700">{(report.totalPartialInterestCollected || 0).toLocaleString('en-IN')}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          <div className="hidden print:block text-xs text-right mt-8 border-t pt-4">
            Generated on {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} — SB Finance
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          * {
            color: black !important;
            background: white !important;
            background-color: white !important;
            border-color: #666 !important;
            box-shadow: none !important;
          }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #666 !important; padding: 5px 8px !important; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
