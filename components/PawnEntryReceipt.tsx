'use client';

import { useState } from 'react';
import { IClient } from '@/types';
import { calculateOutstanding } from '@/lib/interest';

interface PawnEntryReceiptProps {
  client: IClient;
  onClose: () => void;
}

export default function PawnEntryReceipt({ client, onClose }: PawnEntryReceiptProps) {
  const [paperSize, setPaperSize] = useState<'a4' | 'a5'>('a4');

  // Estimated interest at expected return date
  const estimatedOutstanding = calculateOutstanding(
    client.pawnAmount,
    client.pawnDate,
    [],
    new Date(client.expectedReturnDate)
  );

  const pawnDateStr = new Date(client.pawnDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const dueDateStr = new Date(client.expectedReturnDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const printedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const goldWeightDisplay = client.goldWeightGross && client.goldWeightNet
    ? `Gross: ${client.goldWeightGross} g | Net: ${client.goldWeightNet} g`
    : `${client.goldWeight} g`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-4 px-2">
      {/* Screen controls */}
      <div className="print:hidden fixed top-4 right-4 z-60 flex gap-2">
        <select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as 'a4' | 'a5')}
          className="border rounded-lg px-3 py-2 text-sm bg-white shadow"
        >
          <option value="a4">A4 Paper</option>
          <option value="a5">A5 Paper</option>
        </select>
        <button onClick={() => window.print()} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow hover:bg-blue-800">
          Print
        </button>
        <button onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold shadow hover:bg-gray-300">
          Close
        </button>
      </div>

      {/* Receipt */}
      <div
        id="pawn-receipt-body"
        className={`bg-white shadow-2xl rounded-xl print:rounded-none print:shadow-none mx-auto w-full ${paperSize === 'a5' ? 'max-w-sm' : 'max-w-2xl'}`}
        style={{ minHeight: paperSize === 'a5' ? '210mm' : '297mm' }}
      >
        <div className="p-8 print:p-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">PPN Finance</h1>
              <p className="text-sm text-gray-600 font-medium mt-0.5">GOLD PAWN ENTRY SLIP</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Serial No.</p>
              <p className="text-2xl font-black text-gray-800">#{client.serialNumber}</p>
              {client.glNumber && (
                <p className="text-sm font-bold text-gray-700 mt-0.5">GL: {client.glNumber}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{printedAt}</p>
            </div>
          </div>

          {/* Customer + Loan Details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase font-semibold">Customer Name</p>
              <p className="text-lg font-bold text-gray-800">{client.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Contact</p>
              <p className="font-medium text-gray-800">{client.contactNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Gold Weight</p>
              <p className="font-medium text-gray-800">{goldWeightDisplay}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase font-semibold">Jewellery Details</p>
              <p className="font-medium text-gray-800">{client.jewelleryDetails}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Pawn Date</p>
              <p className="font-semibold text-gray-800">{pawnDateStr}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Due Date</p>
              <p className="font-semibold text-gray-800">{dueDateStr}</p>
            </div>
            {client.createdByName && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Recorded By</p>
                <p className="font-medium text-gray-800">{client.createdByName}</p>
              </div>
            )}
          </div>

          {/* Principal Box */}
          <div className="border-2 border-gray-800 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Principal Amount (Loan)</p>
            <p className="text-4xl font-black text-gray-900 mt-1">
              Rs. {client.pawnAmount.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Interest Rate Schedule */}
          <div className="border border-gray-300 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-3">Interest Rate Schedule</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Month 1</span>
                <span className="font-semibold">12% per annum</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Months 2 – 3</span>
                <span className="font-semibold">18% per annum</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Month 4 onwards</span>
                <span className="font-semibold">24% per annum</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Formula: (Principal × AnnualRate ÷ 12) ÷ DaysInMonth × daysHeld
            </p>
          </div>

          {/* Estimated interest at due date */}
          <div className="border border-gray-300 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-3">
              Estimated Interest at Due Date ({dueDateStr})
            </p>
            {estimatedOutstanding.periods.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Pawn date and due date are the same day.</p>
            ) : (
              <div className="space-y-1.5">
                {estimatedOutstanding.periods.map((p) => (
                  <div key={p.monthNumber} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {p.monthName} — {p.daysHeld}/{p.daysInCalendarMonth} days @ {p.rate}%
                    </span>
                    <span className="font-medium">Rs. {p.interest.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2 space-y-1 text-sm">
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Estimated Total Interest</span>
                    <span>Rs. {estimatedOutstanding.totalInterest.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-black text-gray-900 text-base border-t border-gray-300 pt-1">
                    <span>Estimated Total Due</span>
                    <span>Rs. {estimatedOutstanding.totalDue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          {(client.facePhotoUrl || client.jewelleryPhotoUrl || client.kycDocumentUrl) && (
            <div className="flex flex-wrap gap-6 mb-6 justify-center">
              {client.facePhotoUrl && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase mb-2">Customer Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={client.facePhotoUrl} alt="Customer" className="w-36 h-36 object-cover rounded-xl border-2 border-gray-300 mx-auto" />
                </div>
              )}
              {client.jewelleryPhotoUrl && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase mb-2">Jewellery Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={client.jewelleryPhotoUrl} alt="Jewellery" className="w-36 h-36 object-cover rounded-xl border-2 border-gray-300 mx-auto" />
                </div>
              )}
              {client.kycDocumentUrl && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase mb-2">KYC — Front</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={client.kycDocumentUrl} alt="KYC" className="w-36 h-36 object-cover rounded-xl border-2 border-gray-300 mx-auto" />
                </div>
              )}
            </div>
          )}

          {/* Terms */}
          <div className="border border-gray-200 rounded-lg p-3 mb-6 text-xs text-gray-500">
            <p className="font-semibold text-gray-700 mb-1">Terms & Conditions</p>
            <p>1. Interest is calculated daily and resets to 12% upon full interest payment.</p>
            <p>2. Failure to redeem by the due date may result in rate escalation to 24%.</p>
            <p>3. Jewellery must be redeemed by the account holder or authorized representative.</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-300">
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

          <p className="text-center text-xs text-gray-400 mt-4">
            PPN Finance | {printedAt}
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pawn-receipt-body, #pawn-receipt-body * { visibility: visible; }
          #pawn-receipt-body {
            position: fixed; top: 0; left: 0;
            width: 100%; margin: 0; padding: 0;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
          #pawn-receipt-body * {
            color: black !important;
            background: white !important;
            border-color: #555 !important;
            box-shadow: none !important;
          }
          #pawn-receipt-body img {
            filter: grayscale(100%);
            -webkit-filter: grayscale(100%);
          }
          @page {
            size: ${paperSize === 'a5' ? 'A5' : 'A4'} portrait;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
}
