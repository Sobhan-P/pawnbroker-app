'use client';

import { useState } from 'react';
import { IClient } from '@/types';
import { calculateOutstanding, OutstandingResult } from '@/lib/interest';
import { formatDateIST, formatDateTimeIST } from '@/lib/dateUtils';

interface ReceiptProps {
  client: IClient;
  type: 'close' | 'partial' | 'interest';
  facePhotoUrl?: string;
  jewelleryPhotoUrl?: string;
  amountPaid: number;
  principalReduced?: number;
  interestPaid?: number;
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
  principalReduced,
  interestPaid,
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
      type === 'interest' ? `Interest paid — rate resets to ${client.interestRate ? `${client.interestRate}% Regular` : '18% p.a.'}` :
        'Partial payment recorded';

  function handlePrint() {
    const el = document.getElementById('receipt-body');
    if (!el) return;

    const clone = el.cloneNode(true) as HTMLElement;
    clone.id = 'receipt-print-clone';
    clone.style.cssText = `
      position: absolute; top: 0; left: 0;
      width: 100%; margin: 0; padding: 0;
      background: white;
      box-shadow: none; border-radius: 0;
      z-index: 99999;
    `;
    document.body.appendChild(clone);
    document.body.classList.add('receipt-printing');
    window.print();
    document.body.removeChild(clone);
    document.body.classList.remove('receipt-printing');
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
        className={`bg-white shadow-2xl rounded-xl print:rounded-none print:shadow-none mx-auto w-full ${paperSize === 'a3' ? 'max-w-4xl' : 'max-w-2xl'
          }`}
        style={{ minHeight: paperSize === 'a4' ? '297mm' : '420mm' }}
      >
        <div className="p-8 print:p-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">SB Finance</h1>
              <p className="text-xs text-gray-500 mt-0.5">Kozhivilai, Kaliyakkavilai | +91 95006 18457</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Receipt</p>
              <p className="text-lg font-bold text-gray-800">
                {headerLabel}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateTimeIST(printDate)}
                </p>
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
              <p className="font-medium text-gray-800">{formatDateIST(client.pawnDate)}</p>
            </div>
          </div>

          {/* Interest breakdown */}
          <div className="border border-gray-300 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-3">Payment Summary</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Principal Amount</span>
                <span className="font-medium">Rs. {outstanding.currentPrincipal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Interest</span>
                <span className="font-medium">Rs. {outstanding.totalInterest.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 border-t border-dashed pt-1">
                <span>Interest Rate Applied</span>
                <span>{client.interestRate ? `${client.interestRate}% Fixed` : "18% / 24% Tiered"}</span>
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

          {/* Signature line */}
          <div className="grid grid-cols-2 gap-8 mt-10 pt-8 border-t border-gray-300" style={{ pageBreakInside: 'avoid' }}>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 h-8" />
              <p className="text-xs text-gray-500">Customer Signature</p>
              <p className="text-xs text-gray-400 mt-0.5">{client.name} | {client.contactNumber}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 h-8" />
              <p className="text-xs text-gray-500">Authorized Signatory</p>
              <p className="text-xs text-gray-400 mt-0.5">SB Finance</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 mt-6 mb-4 space-y-0.5">
            <p className="font-semibold text-gray-500">SB Finance | +91 95006 18457</p>
            <p>Customer: {client.name} | {client.contactNumber}</p>
            <p>{formatDateTimeIST(printDate)}</p>
          </div>

          {/* Photos — placed last so they never overlap text content */}
          {(facePhotoUrl || jewelleryPhotoUrl) && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Photos</p>
              <div className="flex gap-6 justify-center">
                {facePhotoUrl && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase mb-2">Customer</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={facePhotoUrl} alt="Customer face" className="w-32 h-32 object-contain bg-gray-100 rounded-xl border-2 border-gray-300 mx-auto" />
                  </div>
                )}
                {jewelleryPhotoUrl && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase mb-2">Jewellery</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={jewelleryPhotoUrl} alt="Jewellery" className="w-32 h-32 object-contain bg-gray-100 rounded-xl border-2 border-gray-300 mx-auto" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          /* Hide everything — only the JS-cloned element is shown */
          body.receipt-printing * { display: none !important; }
          body.receipt-printing #receipt-print-clone { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white; }
          body.receipt-printing #receipt-print-clone * { display: revert !important; }

          /* Restore layout utilities inside clone */
          body.receipt-printing #receipt-print-clone .grid { display: grid !important; }
          body.receipt-printing #receipt-print-clone .flex { display: flex !important; }
          body.receipt-printing #receipt-print-clone .inline-flex { display: inline-flex !important; }
          body.receipt-printing #receipt-print-clone .hidden { display: none !important; }
          body.receipt-printing #receipt-print-clone .print\\:hidden { display: none !important; }

          /* Clean up colours & shadows */
          body.receipt-printing #receipt-print-clone * {
            color: black !important;
            background: white !important;
            border-color: #555 !important;
            box-shadow: none !important;
          }

          /* Compact print sizes */
          body.receipt-printing #receipt-print-clone .p-8 { padding: 12px !important; }
          body.receipt-printing #receipt-print-clone .p-4 { padding: 8px !important; }
          body.receipt-printing #receipt-print-clone .mb-6 { margin-bottom: 10px !important; }
          body.receipt-printing #receipt-print-clone .mb-5 { margin-bottom: 8px !important; }
          body.receipt-printing #receipt-print-clone .mb-4 { margin-bottom: 6px !important; }
          body.receipt-printing #receipt-print-clone .gap-y-3 { row-gap: 6px !important; }
          body.receipt-printing #receipt-print-clone .mt-10 { margin-top: 14px !important; }
          body.receipt-printing #receipt-print-clone .mt-6 { margin-top: 10px !important; }
          body.receipt-printing #receipt-print-clone h1 { font-size: 20px !important; }
          body.receipt-printing #receipt-print-clone .text-4xl { font-size: 24px !important; }
          body.receipt-printing #receipt-print-clone img {
            filter: grayscale(100%);
            -webkit-filter: grayscale(100%);
            max-width: 90px !important;
            max-height: 90px !important;
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
