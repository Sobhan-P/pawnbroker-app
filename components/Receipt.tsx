'use client';

import { IClient } from '@/types';
import { calculateOutstanding, OutstandingResult } from '@/lib/interest';

interface ReceiptProps {
  client: IClient;
  type: 'close' | 'partial' | 'interest';
  facePhotoUrl?: string;
  jewelleryPhotoUrl?: string;
  amountPaid: number;
  discount?: number;
  onClose: () => void;
  prePaymentOutstanding?: OutstandingResult;
}

export default function Receipt({
  client,
  type,
  facePhotoUrl,
  jewelleryPhotoUrl,
  amountPaid,
  discount,
  onClose,
  prePaymentOutstanding,
}: ReceiptProps) {
  const outstanding: OutstandingResult = prePaymentOutstanding ?? calculateOutstanding(
    client.pawnAmount,
    client.pawnDate,
    type === 'close'
      ? (client.payments || []).filter(p => p.type !== 'full')
      : (client.payments || []),
    type === 'close' && client.closedDate
      ? new Date(client.closedDate)
      : new Date()
  );

  const printDate = type === 'close' && client.closedDate
    ? new Date(client.closedDate)
    : new Date();

  const printDateStr = printDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long', year: 'numeric',
  });
  const printTimeStr = printDate.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const headerLabel =
    type === 'close' ? 'LOAN CLOSURE RECEIPT' :
    type === 'interest' ? 'INTEREST PAYMENT RECEIPT' :
    'PARTIAL PAYMENT RECEIPT';

  const statusNote =
    type === 'close' ? 'Loan fully settled. Jewellery returned to customer.' :
    type === 'interest' ? 'Interest paid in full. Rate resets to 12% p.a.' :
    'Partial payment recorded. Loan remains active.';

  const effectiveDue = discount && discount > 0
    ? outstanding.totalDue - discount
    : outstanding.totalDue;

  const goldWeightDisplay = client.goldWeightGross && client.goldWeightNet
    ? `${client.goldWeightGross} g gross / ${client.goldWeightNet} g net`
    : `${client.goldWeight} g`;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-6 px-2">
      {/* Controls */}
      <div className="print:hidden fixed top-4 right-4 z-60 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow hover:bg-blue-800"
        >
          Print
        </button>
        <button
          onClick={onClose}
          className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold shadow hover:bg-gray-200"
        >
          Close
        </button>
      </div>

      {/* Receipt — A4 */}
      <div
        id="receipt-body"
        className="bg-white mx-auto w-full max-w-2xl shadow-2xl print:shadow-none print:rounded-none"
        style={{ minHeight: '297mm' }}
      >
        {/* Top accent bar */}
        <div className="h-2 bg-blue-700 print:bg-black" />

        <div className="px-10 py-8 print:px-8 print:py-6">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">PPN Finance</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Gold Pawn Services</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-700 print:text-black mb-1">{headerLabel}</p>
              <p className="text-xs text-gray-500">{printDateStr}</p>
              <p className="text-xs text-gray-500">{printTimeStr}</p>
              <p className="text-xs text-gray-400 mt-1">Loan #{client.serialNumber}{client.glNumber ? ` · GL: ${client.glNumber}` : ''}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-900 mb-6" />

          {/* Customer & Loan Info — 2 column table */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8 text-sm">
            <InfoRow label="Customer Name" value={client.name} bold />
            <InfoRow label="Contact" value={client.contactNumber} />
            <InfoRow label="Jewellery Details" value={client.jewelleryDetails} span />
            <InfoRow label="Gold Weight" value={goldWeightDisplay} />
            <InfoRow label="Pawn Date" value={new Date(client.pawnDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long', year: 'numeric' })} />
          </div>

          {/* Interest Breakdown Table */}
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Interest Calculation</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Period</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">Days</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">Rate</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Interest (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.periods.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center px-3 py-3 text-gray-400 italic text-xs">No interest accrued</td>
                  </tr>
                ) : (
                  outstanding.periods.map((p) => (
                    <tr key={p.monthNumber} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{p.monthName}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{p.daysHeld}/{p.daysInCalendarMonth}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{p.rate}% p.a.</td>
                      <td className="px-3 py-2 text-right font-medium">{p.interest.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Summary rows */}
            <div className="border border-gray-200 rounded-b-lg overflow-hidden">
              <SummaryRow label="Principal Amount" value={`Rs. ${outstanding.currentPrincipal.toLocaleString('en-IN')}`} />
              <SummaryRow label="Total Interest" value={`Rs. ${outstanding.totalInterest.toLocaleString('en-IN')}`} />
              {discount && discount > 0 && (
                <SummaryRow label="Discount on Interest" value={`− Rs. ${discount.toLocaleString('en-IN')}`} green />
              )}
              <SummaryRow label="Total Due" value={`Rs. ${effectiveDue.toLocaleString('en-IN')}`} bold />
            </div>
          </div>

          {/* Amount Received — hero box */}
          <div className="border-2 border-gray-900 rounded-xl p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Amount Received</p>
              <p className="text-4xl font-black text-gray-900 mt-1">Rs. {amountPaid.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500 mt-1">{statusNote}</p>
            </div>
            {type === 'partial' && amountPaid < outstanding.totalDue && (
              <div className="text-right border-l border-gray-300 pl-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Balance Remaining</p>
                <p className="text-2xl font-bold text-red-700 mt-1">Rs. {(outstanding.totalDue - amountPaid).toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          {(facePhotoUrl || jewelleryPhotoUrl) && (
            <div className="flex gap-6 mb-8 justify-center">
              {facePhotoUrl && (
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Customer Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={facePhotoUrl} alt="Customer" className="w-32 h-32 object-contain bg-gray-50 rounded-lg border border-gray-200 mx-auto" />
                </div>
              )}
              {jewelleryPhotoUrl && (
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Jewellery Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={jewelleryPhotoUrl} alt="Jewellery" className="w-32 h-32 object-contain bg-gray-50 rounded-lg border border-gray-200 mx-auto" />
                </div>
              )}
            </div>
          )}

          {/* Signatures */}
          <div className="mt-12 grid grid-cols-2 gap-16">
            <div>
              <div className="border-b-2 border-gray-400 mb-3 h-14" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer Signature</p>
              <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>
            </div>
            <div>
              <div className="border-b-2 border-gray-400 mb-3 h-14" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Authorized Signatory</p>
              <p className="text-xs text-gray-400 mt-0.5">PPN Finance</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-400">PPN Finance · Gold Pawn Services</p>
            <p className="text-xs text-gray-400">{printDateStr} · {printTimeStr}</p>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="h-1 bg-gray-200 print:bg-black" />
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-body, #receipt-body * { visibility: visible; }
          #receipt-body {
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            margin: 0; padding: 0;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
          #receipt-body * {
            color: black !important;
            background: white !important;
            border-color: #999 !important;
            box-shadow: none !important;
          }
          #receipt-body img {
            filter: grayscale(100%);
            -webkit-filter: grayscale(100%);
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ label, value, bold, span }: { label: string; value: string; bold?: boolean; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">{label}</p>
      <p className={`text-gray-800 ${bold ? 'font-bold text-base' : 'font-medium'}`}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <div className={`flex justify-between px-3 py-2 text-sm border-t border-gray-100 ${bold ? 'font-bold bg-gray-50' : ''} ${green ? 'text-emerald-700' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
