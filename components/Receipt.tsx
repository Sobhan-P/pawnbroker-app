'use client';

import { useState } from 'react';
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
  /** Pass outstanding calculated BEFORE the payment was recorded to get correct interest breakdown */
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
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');

  // For close receipts without prePaymentOutstanding (e.g. reprints), exclude the full-close payment
  // so we show what was owed before closure.
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

  const headerLabel =
    type === 'close' ? 'LOAN CLOSURE' :
    type === 'interest' ? 'INTEREST PAYMENT' :
    'PARTIAL PAYMENT';

  const amountSubtitle =
    type === 'close' ? 'Loan fully settled' :
    type === 'interest' ? 'Interest paid — rate resets to 12% p.a.' :
    'Partial payment recorded';

  function handlePrint() {
    window.print();
  }

  const goldWeightDisplay = client.goldWeightGross && client.goldWeightNet
    ? `Gross: ${client.goldWeightGross} g | Net: ${client.goldWeightNet} g`
    : `${client.goldWeight} g`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-4 px-2">
      {/* Screen controls — hidden on print */}
      <div className="print:hidden fixed top-4 right-4 z-60 flex gap-2">
        <select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as 'a4' | 'a3')}
          className="border rounded-lg px-3 py-2 text-sm bg-white shadow"
        >
          <option value="a4">A4 Paper</option>
          <option value="a3">A3 Paper</option>
        </select>
        <button
          onClick={handlePrint}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow hover:bg-blue-800"
        >
          Print
        </button>
        <button
          onClick={onClose}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold shadow hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      {/* Receipt body */}
      <div
        id="receipt-body"
        className={`bg-white shadow-2xl rounded-xl print:rounded-none print:shadow-none mx-auto w-full ${
          paperSize === 'a3' ? 'max-w-4xl' : 'max-w-2xl'
        }`}
        style={{ minHeight: paperSize === 'a4' ? '297mm' : '420mm' }}
      >
        <div className="p-8 print:p-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">PPN Finance</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Receipt</p>
              <p className="text-lg font-bold text-gray-800">
                {headerLabel}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {printDate.toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: true,
                })}
              </p>
            </div>
          </div>

          {/* Loan details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Loan Number</p>
              <p className="font-bold text-gray-800">#{client.serialNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">GL Number</p>
              <p className="font-bold text-gray-800">{client.glNumber || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Customer Name</p>
              <p className="font-semibold text-gray-800">{client.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Contact</p>
              <p className="font-medium text-gray-800">{client.contactNumber}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase font-semibold">Jewellery Details</p>
              <p className="font-medium text-gray-800">{client.jewelleryDetails}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Gold Weight</p>
              <p className="font-medium text-gray-800">{goldWeightDisplay}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Pawn Date</p>
              <p className="font-medium text-gray-800">{new Date(client.pawnDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          {/* Interest breakdown */}
          <div className="border border-gray-300 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-3">Interest Calculation</p>
            <div className="space-y-1.5">
              {outstanding.periods.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No interest period calculated.</p>
              ) : (
                outstanding.periods.map((p) => (
                  <div key={p.monthNumber} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {p.monthName} — {p.daysHeld}/{p.daysInCalendarMonth} days @ {p.rate}% p.a.
                    </span>
                    <span className="font-medium">Rs. {p.interest.toLocaleString('en-IN')}</span>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-300 mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Principal Amount</span>
                <span className="font-medium">Rs. {outstanding.currentPrincipal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Interest</span>
                <span className="font-medium">Rs. {outstanding.totalInterest.toLocaleString('en-IN')}</span>
              </div>
              {discount && discount > 0 ? (
                <>
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount on Interest</span>
                    <span className="font-medium">− Rs. {discount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total Due (after discount)</span>
                    <span>Rs. {(outstanding.totalDue - discount).toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total Due</span>
                  <span>Rs. {outstanding.totalDue.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Amount paid box */}
          <div className="border-2 border-gray-800 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-gray-700 font-semibold uppercase tracking-wide">Amount Received</p>
            <p className="text-4xl font-black text-gray-900 mt-1">
              Rs. {amountPaid.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {amountSubtitle}
            </p>
            {type === 'partial' && amountPaid < outstanding.totalDue && (
              <p className="text-sm font-bold mt-2 border-2 border-gray-800 rounded px-3 py-1.5 balance-remaining-print">
                Balance Remaining: Rs. {(outstanding.totalDue - amountPaid).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Photos */}
          {(facePhotoUrl || jewelleryPhotoUrl) && (
            <div className="flex gap-6 mb-6 justify-center">
              {facePhotoUrl && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase mb-2">Customer Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={facePhotoUrl} alt="Customer face" className="w-36 h-36 object-contain bg-gray-100 rounded-xl border-2 border-gray-300 mx-auto" />
                </div>
              )}
              {jewelleryPhotoUrl && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase mb-2">Jewellery Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={jewelleryPhotoUrl} alt="Jewellery" className="w-36 h-36 object-contain bg-gray-100 rounded-xl border-2 border-gray-300 mx-auto" />
                </div>
              )}
            </div>
          )}

          {/* Signature line */}
          <div className="grid grid-cols-2 gap-8 mt-10 pt-8 border-t border-gray-300">
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 h-8" />
              <p className="text-xs text-gray-500">Customer Signature</p>
              <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 h-8" />
              <p className="text-xs text-gray-500">Authorized Signatory</p>
              <p className="text-xs text-gray-400 mt-0.5">PPN Finance</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            PPN Finance | {printDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-body, #receipt-body * { visibility: visible; }
          #receipt-body {
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
          #receipt-body * {
            color: black !important;
            background: white !important;
            border-color: #555 !important;
            box-shadow: none !important;
          }
          #receipt-body img {
            filter: grayscale(100%);
            -webkit-filter: grayscale(100%);
          }
          @page {
            size: ${paperSize === 'a3' ? 'A3' : 'A4'} portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
