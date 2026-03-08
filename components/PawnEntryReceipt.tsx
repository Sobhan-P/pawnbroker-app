'use client';

import { useState } from 'react';
import { IClient } from '@/types';
import { formatDateIST, formatDateTimeIST } from '@/lib/dateUtils';
// interest import removed — estimated section no longer shown

interface PawnEntryReceiptProps {
  client: IClient;
  onClose: () => void;
}

export default function PawnEntryReceipt({ client, onClose }: PawnEntryReceiptProps) {
  const [paperSize, setPaperSize] = useState<'a4' | 'a5'>('a4');

  function handlePrint() {
    const el = document.getElementById('pawn-receipt-body');
    if (!el) return;

    // Clone receipt directly onto <body> so it escapes the fixed/overflow modal
    const clone = el.cloneNode(true) as HTMLElement;
    clone.id = 'pawn-print-clone';
    clone.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; margin: 0; padding: 0;
      background: white;
      transform: scale(0.82); transform-origin: top center;
      box-shadow: none; border-radius: 0;
      z-index: 99999;
    `;
    document.body.appendChild(clone);
    document.body.classList.add('pawn-printing');

    window.print();

    document.body.removeChild(clone);
    document.body.classList.remove('pawn-printing');
  }

  const pawnDateStr = formatDateIST(client.pawnDate);
  const dueDateStr = formatDateIST(client.expectedReturnDate);
  const printedAt = formatDateTimeIST(new Date());

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
        <button onClick={handlePrint} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow hover:bg-blue-800">
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
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">SB Finance</h1>
              <p className="text-xs text-gray-500 mt-0.5">Kozhivilai, Kaliyakkavilai | +91 95006 18457</p>
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
            {client.interestRate ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between font-bold text-blue-900 border-b pb-1 mb-1">
                  <span>Fixed Interest Rate</span>
                  <span>{client.interestRate}% per annum</span>
                </div>
                <p className="text-[10px] text-gray-500 italic">This is a regular flat rate and does not increase or compound.</p>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Months 1–3 (from pawn date)</span>
                  <span className="font-semibold">18% per annum</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Month 4 onwards</span>
                  <span className="font-semibold">24% per annum</span>
                </div>
                <div className="flex justify-between text-blue-800 font-medium pt-1 border-t border-dashed">
                  <span>After 1 Year</span>
                  <span>Annual Compounding</span>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Formula: (Principal × Rate ÷ 12) ÷ Days in month × Days held
            </p>
          </div>

          {/* Terms */}
          <div className="border border-gray-200 rounded-lg p-3 mb-6 text-xs text-gray-500" style={{ pageBreakInside: 'avoid' }}>
            <p className="font-semibold text-gray-700 mb-1">Terms &amp; Conditions</p>
            {client.interestRate ? (
              <p>1. Fixed Interest: {client.interestRate}% p.a. recurring monthly. No tiered increases or compounding.</p>
            ) : (
              <p>1. Tiered Interest: 18% p.a. (Months 1-3), 24% p.a. (Month 4 onwards). Annual compounding applies after 12 months.</p>
            )}
            <p>2. Interest resets only on full interest payment; minimum 15-day interest applies at loan start.</p>
            <p>3. Jewellery must be redeemed by the account holder or authorized representative.</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-300" style={{ pageBreakInside: 'avoid' }}>
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

          <div className="text-center text-xs text-gray-400 mt-4 mb-6 space-y-0.5">
            <p className="font-semibold text-gray-500">SB Finance | +91 95006 18457</p>
            <p>Customer: {client.name} | {client.contactNumber}</p>
            <p>{printedAt}</p>
          </div>

          {/* Photos — placed last so they never disrupt text layout */}
          {(client.facePhotoUrl || client.jewelleryPhotoUrl || client.kycDocumentUrl || client.kycBackDocumentUrl) && (
            <div className="border-t border-gray-200 pt-4" style={{ pageBreakBefore: 'auto', pageBreakInside: 'avoid' }}>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Photos</p>
              <div className="grid grid-cols-4 gap-3 justify-items-center">
                {client.facePhotoUrl && (
                  <div className="text-center w-full">
                    <p className="text-xs text-gray-500 uppercase mb-1">Customer</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={client.facePhotoUrl} alt="Customer" className="w-full aspect-square object-contain bg-gray-100 rounded-lg border border-gray-300" style={{ maxHeight: '100px' }} />
                  </div>
                )}
                {client.jewelleryPhotoUrl && (
                  <div className="text-center w-full">
                    <p className="text-xs text-gray-500 uppercase mb-1">Jewellery</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={client.jewelleryPhotoUrl} alt="Jewellery" className="w-full aspect-square object-contain bg-gray-100 rounded-lg border border-gray-300" style={{ maxHeight: '100px' }} />
                  </div>
                )}
                {client.kycDocumentUrl && (
                  <div className="text-center w-full">
                    <p className="text-xs text-gray-500 uppercase mb-1">KYC Front</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={client.kycDocumentUrl} alt="KYC Front" className="w-full aspect-square object-contain bg-gray-100 rounded-lg border border-gray-300" style={{ maxHeight: '100px' }} />
                  </div>
                )}
                {client.kycBackDocumentUrl && (
                  <div className="text-center w-full">
                    <p className="text-xs text-gray-500 uppercase mb-1">KYC Back</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={client.kycBackDocumentUrl} alt="KYC Back" className="w-full aspect-square object-contain bg-gray-100 rounded-lg border border-gray-300" style={{ maxHeight: '100px' }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          /* Hide everything — only the JS-cloned element (#pawn-print-clone) is shown */
          body.pawn-printing * { display: none !important; }
          body.pawn-printing #pawn-print-clone { display: block !important; transform: scale(0.82) !important; transform-origin: top center !important; }
          body.pawn-printing #pawn-print-clone * { display: revert !important; }

          /* Restore grid/flex inside clone */
          body.pawn-printing #pawn-print-clone .grid { display: grid !important; }
          body.pawn-printing #pawn-print-clone .flex { display: flex !important; }
          body.pawn-printing #pawn-print-clone .inline-flex { display: inline-flex !important; }
          body.pawn-printing #pawn-print-clone .hidden { display: none !important; }

          /* Clean up colours & shadows */
          body.pawn-printing #pawn-print-clone * {
            color: black !important;
            background: white !important;
            border-color: #555 !important;
            box-shadow: none !important;
          }

          /* Compact spacing */
          body.pawn-printing #pawn-print-clone .p-8 { padding: 10px !important; }
          body.pawn-printing #pawn-print-clone .p-4 { padding: 6px !important; }
          body.pawn-printing #pawn-print-clone .p-3 { padding: 5px !important; }
          body.pawn-printing #pawn-print-clone .mb-6 { margin-bottom: 8px !important; }
          body.pawn-printing #pawn-print-clone .mb-4 { margin-bottom: 5px !important; }
          body.pawn-printing #pawn-print-clone .mb-3 { margin-bottom: 4px !important; }
          body.pawn-printing #pawn-print-clone .pt-4 { padding-top: 6px !important; }
          body.pawn-printing #pawn-print-clone .gap-y-3 { row-gap: 4px !important; }
          body.pawn-printing #pawn-print-clone .mt-8 { margin-top: 8px !important; }
          body.pawn-printing #pawn-print-clone .mt-4 { margin-top: 6px !important; }
          body.pawn-printing #pawn-print-clone .h-8 { height: 20px !important; }
          body.pawn-printing #pawn-print-clone h1 { font-size: 18px !important; }
          body.pawn-printing #pawn-print-clone .text-4xl { font-size: 22px !important; }
          body.pawn-printing #pawn-print-clone .text-2xl { font-size: 16px !important; }
          body.pawn-printing #pawn-print-clone .text-lg { font-size: 13px !important; }
          body.pawn-printing #pawn-print-clone .text-sm { font-size: 11px !important; }
          body.pawn-printing #pawn-print-clone .text-xs { font-size: 9.5px !important; }

          /* Photos: 4-column grid, small images */
          body.pawn-printing #pawn-print-clone .grid-cols-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          body.pawn-printing #pawn-print-clone img {
            filter: grayscale(100%);
            -webkit-filter: grayscale(100%);
            max-height: 72px !important;
            width: 100% !important;
            aspect-ratio: 1 !important;
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
