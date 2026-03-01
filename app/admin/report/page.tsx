'use client';

import { useEffect, useState, useRef } from 'react';
import { DailyReport } from '@/types';

export default function DailyReportPage() {
  // Use IST date as default so early-morning opens show today's IST date (not UTC yesterday)
  const [date, setDate] = useState(() => {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return nowIST.toISOString().split('T')[0];
  });
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function loadReport() {
    setLoading(true);
    const data = await fetch(`/api/report?date=${date}`).then((r) => r.json());
    setReport(data);
    setLoading(false);
  }

  useEffect(() => { loadReport(); }, [date]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daily Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">New loans and closures for selected date</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
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
        <div ref={printRef} className="space-y-6">
          {/* Print header */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold">PPN Finance</h1>
            <p>Daily Report — {new Date(report.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="NEW LOANS" value={report.newCount.toString()} color="bg-green-50 text-green-800 border-green-200" />
            <SummaryCard label="TOTAL NEW PRINCIPAL" value={`Rs. ${report.totalNewPrincipal.toLocaleString('en-IN')}`} color="bg-blue-50 text-blue-800 border-blue-200" />
            <SummaryCard label="CLOSED LOANS" value={report.closedCount.toString()} color="bg-gray-50 text-gray-700 border-gray-200" />
            <SummaryCard label="TOTAL COLLECTED" value={`Rs. ${report.totalCollected.toLocaleString('en-IN')}`} color="bg-amber-50 text-amber-800 border-amber-200" />
          </div>

          {/* Interest earned */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">INTEREST EARNED TODAY</p>
            <p className="text-xl font-bold mt-1 text-purple-800">Rs. {(report.totalInterestCollected || 0).toLocaleString('en-IN')}</p>
          </div>

          {/* New Loans Table */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-3 text-lg">New Loans ({report.newCount})</h2>
            {report.newLoans.length === 0 ? (
              <p className="text-gray-400 text-sm">No new loans today.</p>
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
                        <td className="px-4 py-3">{new Date(c.expectedReturnDate).toLocaleDateString('en-IN')}</td>
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
              <p className="text-gray-400 text-sm">No loans closed today.</p>
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
                      <th className="px-4 py-3 text-right">Collected (Rs.)</th>
                      <th className="px-4 py-3 text-left">Closed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.closedLoans.map((c, i) => (
                      <tr key={c._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-blue-500">{c.serialNumber}</td>
                        <td className="px-4 py-3 text-amber-600 font-medium">{c.glNumber || '—'}</td>
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3">{c.contactNumber}</td>
                        <td className="px-4 py-3 text-right">{c.pawnAmount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-medium">{(c.totalAmountPaid || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">{c.closedDate ? new Date(c.closedDate).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="hidden print:block text-xs text-right mt-8 border-t pt-4">
            Generated on {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} — PPN Finance
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
