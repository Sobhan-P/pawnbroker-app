'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IClient } from '@/types';
import { calculateOutstanding, InterestPeriod, OutstandingResult } from '@/lib/interest';
import Link from 'next/link';
import Image from 'next/image';
import WebcamCapture from '@/components/WebcamCapture';
import Receipt from '@/components/Receipt';
import PawnEntryReceipt from '@/components/PawnEntryReceipt';

type PanelMode = null | 'close' | 'partial';

function ClientDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === 'admin';

  const [client, setClient] = useState<IClient | null>(null);
  const [mode, setMode] = useState<PanelMode>(null);
  const [processing, setProcessing] = useState(false);

  // Receipt display state — saved BEFORE form state is cleared
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptType, setReceiptType] = useState<'close' | 'partial'>('close');
  const [receiptFaceUrl, setReceiptFaceUrl] = useState<string | null>(null);
  const [receiptJewelleryUrl, setReceiptJewelleryUrl] = useState<string | null>(null);
  const [receiptAmountPaid, setReceiptAmountPaid] = useState(0);
  const [receiptDiscount, setReceiptDiscount] = useState(0);
  const [receiptOutstanding, setReceiptOutstanding] = useState<OutstandingResult | null>(null);

  // Pawn entry receipt — shown immediately after creating a new loan
  const [showPawnReceipt, setShowPawnReceipt] = useState(false);

  // Close loan form state
  const [closingFace, setClosingFace] = useState<string | null>(null);
  const [closingJewellery, setClosingJewellery] = useState<string | null>(null);
  const [closeAmount, setCloseAmount] = useState('');
  const [closeDiscount, setCloseDiscount] = useState('');

  // Partial payment form state
  const [partialFace, setPartialFace] = useState<string | null>(null);
  const [partialAmountPaid, setPartialAmountPaid] = useState('');
  const [partialPrincipal, setPartialPrincipal] = useState('');
  const [partialInterest, setPartialInterest] = useState('');

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data);
        if (searchParams.get('newEntry') === '1') {
          setShowPawnReceipt(true);
        }
      });
  }, [id, searchParams]);

  if (!client) return <p className="text-gray-500">Loading...</p>;

  const isOverdue = client.status === 'active' && new Date(client.expectedReturnDate) < new Date();
  const backHref = client.status === 'closed' ? '/closed' : '/clients';
  const backLabel = client.status === 'closed' ? 'Back to Closed Records' : 'Back to Active Loans';

  const outstanding = client.status === 'active'
    ? calculateOutstanding(client.pawnAmount, client.pawnDate, client.payments || [], new Date())
    : null;

  function recalcPartialSplit(amountStr: string) {
    if (!outstanding || !amountStr) { setPartialInterest(''); setPartialPrincipal(''); return; }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) { setPartialInterest(''); setPartialPrincipal(''); return; }
    // Use rounded values to avoid floating-point comparison issues
    const principal = Math.round(outstanding.currentPrincipal);
    const interest = Math.round(outstanding.totalInterest);
    if (amount >= principal) {
      // Paying the full principal: skip interest deduction, all goes to principal
      setPartialInterest('0');
      setPartialPrincipal(String(principal));
    } else if (amount >= interest) {
      // Covers interest + some principal: interest first, remainder to principal
      setPartialInterest(String(interest));
      setPartialPrincipal(String(Math.round(amount - interest)));
    } else {
      // Less than outstanding interest: all to interest only
      setPartialInterest(String(Math.round(amount)));
      setPartialPrincipal('0');
    }
  }

  async function handleClose() {
    if (!closeAmount) return alert('Please enter the total amount paid');
    const savedAmount = parseFloat(closeAmount);
    const discount = parseFloat(closeDiscount) || 0;
    if (outstanding && savedAmount + discount < outstanding.totalDue) {
      return alert(
        `Amount + discount (Rs. ${(savedAmount + discount).toLocaleString('en-IN')}) is less than total due (Rs. ${outstanding.totalDue.toLocaleString('en-IN')}).\n\nUse "Partial Payment" to record a partial payment instead.`
      );
    }
    setProcessing(true);
    const savedOutstanding = outstanding;
    const savedFace = closingFace;
    const savedJewellery = closingJewellery;
    const savedDiscount = discount;

    const res = await fetch(`/api/clients/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalAmountPaid: savedAmount, discount, closingFacePhoto: savedFace, closingJewelleryPhoto: savedJewellery }),
    });
    if (res.ok) {
      const updated = await res.json();
      setClient(updated);
      setReceiptFaceUrl(savedFace);
      setReceiptJewelleryUrl(savedJewellery);
      setReceiptAmountPaid(savedAmount);
      setReceiptDiscount(savedDiscount);
      setReceiptOutstanding(savedOutstanding);
      setReceiptType('close');
      setShowReceipt(true);
      setMode(null);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to close loan');
    }
    setProcessing(false);
  }

  async function handlePartialPayment() {
    if (!partialAmountPaid) return alert('Please enter the amount paid');
    setProcessing(true);
    const savedOutstanding = outstanding;
    const savedFace = partialFace;
    const savedAmount = parseFloat(partialAmountPaid);

    const res = await fetch(`/api/clients/${id}/partial-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountPaid: savedAmount,
        principalReduced: parseFloat(partialPrincipal) || 0,
        interestPaid: parseFloat(partialInterest) || 0,
        facePhoto: partialFace,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setClient(updated);
      setReceiptFaceUrl(savedFace);
      setReceiptJewelleryUrl(null);
      setReceiptAmountPaid(savedAmount);
      setReceiptOutstanding(savedOutstanding);
      setReceiptType('partial');
      setShowReceipt(true);
      setMode(null);
      setPartialFace(null);
      setPartialAmountPaid('');
      setPartialPrincipal('');
      setPartialInterest('');
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to record payment');
    }
    setProcessing(false);
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this closed record? This cannot be undone.')) return;
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/');
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete record');
    }
  }

  const partialAmountNum = parseFloat(partialAmountPaid) || 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-blue-600 hover:underline text-sm">
          &larr; {backLabel}
        </Link>
      </div>

      {showPawnReceipt && (
        <PawnEntryReceipt client={client} onClose={() => setShowPawnReceipt(false)} />
      )}

      {showReceipt && (
        <Receipt
          client={client}
          type={receiptType}
          facePhotoUrl={receiptFaceUrl || undefined}
          jewelleryPhotoUrl={receiptJewelleryUrl || undefined}
          amountPaid={receiptAmountPaid}
          discount={receiptDiscount || (client.payments?.find(p => p.type === 'full')?.discount)}
          prePaymentOutstanding={receiptOutstanding || undefined}
          onClose={() => setShowReceipt(false)}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            {client.glNumber && <p className="text-xs text-amber-600 font-bold mb-0.5">GL: {client.glNumber}</p>}
            <p className="text-xs text-blue-500 font-medium mb-0.5">#{client.serialNumber}</p>
            <h1 className="text-xl font-bold text-gray-800">{client.name}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
            client.status === 'active'
              ? isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {client.status}{isOverdue && ' — OVERDUE'}
          </span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-5">
          <Detail label="Contact" value={client.contactNumber} />
          {client.goldWeightGross && client.goldWeightNet ? (
            <>
              <Detail label="Gross Weight" value={`${client.goldWeightGross} g`} />
              <Detail label="Net Weight" value={`${client.goldWeightNet} g`} />
            </>
          ) : (
            <Detail label="Gold Weight" value={`${client.goldWeight} g`} />
          )}
          <Detail label="Jewellery Details" value={client.jewelleryDetails} />
          <Detail label="Principal Amount" value={`Rs. ${client.pawnAmount.toLocaleString('en-IN')}`} />
          <Detail label="Pawn Date" value={new Date(client.pawnDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} />
          <Detail label="Due Date" value={new Date(client.expectedReturnDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} />
          {client.status === 'closed' && client.closedDate && (
            <Detail label="Closed On" value={new Date(client.closedDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} />
          )}
          {client.status === 'closed' && client.totalAmountPaid && (
            <Detail label="Total Amount Paid" value={`Rs. ${client.totalAmountPaid.toLocaleString('en-IN')}`} />
          )}
          {client.createdByName && <Detail label="Created By" value={client.createdByName} />}
        </div>

        {/* Interest calculation box */}
        {client.status === 'active' && outstanding && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
            <p className="font-semibold text-blue-800 mb-2 text-sm">Current Outstanding</p>
            <div className="space-y-1 mb-2">
              {outstanding.periods.length === 0 ? (
                <p className="text-xs text-blue-600 italic">No interest yet — 0 days elapsed since last payment.</p>
              ) : (
                outstanding.periods.map((p: InterestPeriod) => (
                  <p key={p.monthNumber} className="text-xs text-blue-700">
                    {p.monthName} ({p.daysHeld}/{p.daysInCalendarMonth} days @ {p.rate}% p.a.):
                    <span className="font-semibold ml-1">Rs. {p.interest.toLocaleString('en-IN')}</span>
                  </p>
                ))
              )}
            </div>
            <div className="border-t border-blue-200 pt-2 text-sm">
              <p>Remaining Principal: <strong>Rs. {outstanding.currentPrincipal.toLocaleString('en-IN')}</strong></p>
              {outstanding.interestCreditBalance > 0 && (
                <>
                  <p className="text-xs text-blue-600">Gross Interest: Rs. {outstanding.rawInterest.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-green-700">Partial Interest Paid: − Rs. {outstanding.interestCreditBalance.toLocaleString('en-IN')}</p>
                </>
              )}
              <p>Total Interest: <strong>Rs. {outstanding.totalInterest.toLocaleString('en-IN')}</strong></p>
              <p className="text-base font-bold text-blue-900 mt-1">Total Due: Rs. {outstanding.totalDue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-blue-500 mt-1">
                Interest from: {outstanding.lastPaymentDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} @ 12% p.a. first month
              </p>
            </div>
          </div>
        )}

        {/* Payment history */}
        {client.payments && client.payments.length > 0 && (
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Payment History</p>
            <div className="space-y-2">
              {client.payments.map((p) => (
                <div key={p._id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold capitalize ${
                      p.type === 'full' ? 'text-green-700' : p.type === 'partial' ? 'text-blue-700' : 'text-amber-700'
                    }`}>
                      {p.type === 'full' ? 'Full Closure' : p.type === 'partial' ? 'Partial Payment' : 'Interest Payment'}
                    </span>
                    <span className="text-gray-500">{new Date(p.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                  </div>
                  <p className="text-gray-700 mt-0.5">
                    Paid: <strong>Rs. {p.amountPaid.toLocaleString('en-IN')}</strong>
                    {(p.principalReduced > 0 || p.interestPaid > 0) && (
                      <span className="text-gray-500 text-xs ml-1">
                        ({[
                          p.principalReduced > 0 && `Principal: Rs. ${p.principalReduced.toLocaleString('en-IN')}`,
                          p.interestPaid > 0 && `Interest: Rs. ${p.interestPaid.toLocaleString('en-IN')}`,
                        ].filter(Boolean).join(' + ')})
                      </span>
                    )}
                    {p.discount && p.discount > 0 ? (
                      <span className="text-emerald-600 text-xs ml-1">(Discount: Rs. {p.discount.toLocaleString('en-IN')})</span>
                    ) : null}
                  </p>
                  {p.processedByName && <p className="text-gray-400">By: {p.processedByName}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {(client.facePhotoUrl || client.kycDocumentUrl || client.kycBackDocumentUrl || client.jewelleryPhotoUrl || client.closingFacePhotoUrl || client.closingJewelleryPhotoUrl) && (
          <div className="flex flex-wrap gap-4 mb-5">
            <PhotoThumb url={client.facePhotoUrl} label="Face (KYC)" />
            <PhotoThumb url={client.kycDocumentUrl} label="KYC — Front" />
            <PhotoThumb url={client.kycBackDocumentUrl} label="KYC — Back" />
            <PhotoThumb url={client.jewelleryPhotoUrl} label="Jewellery" />
            <PhotoThumb url={client.closingFacePhotoUrl} label="Face (Closure)" />
            <PhotoThumb url={client.closingJewelleryPhotoUrl} label="Jewellery (Closure)" />
          </div>
        )}

        {/* Action buttons */}
        {client.status === 'active' && (
          <div className="border-t pt-4">
            {mode === null && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMode('close')} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">
                  Close Loan
                </button>
                <button onClick={() => setMode('partial')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
                  Partial Payment
                </button>
                <button
                  onClick={() => setShowPawnReceipt(true)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700"
                >
                  Print Entry Slip
                </button>
              </div>
            )}

            {/* Close Loan Panel */}
            {mode === 'close' && (
              <div className="space-y-4">
                <p className="font-semibold text-gray-800">Close Loan — Capture & Confirm</p>
                <WebcamCapture label="Customer Face Photo" onCapture={setClosingFace} captured={closingFace} />
                <WebcamCapture label="Jewellery Photo (Return Confirmation)" onCapture={setClosingJewellery} captured={closingJewellery} defaultFacingMode="environment" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount Received (Rs.) *</label>
                  <input
                    type="number"
                    placeholder={outstanding ? `TOTAL DUE: Rs. ${outstanding.totalDue.toLocaleString('en-IN')}` : 'AMOUNT'}
                    value={closeAmount}
                    onChange={(e) => setCloseAmount(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount on Interest (Rs.) — Optional</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={closeDiscount}
                    onChange={(e) => setCloseDiscount(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
                  />
                  {closeDiscount && outstanding && parseFloat(closeDiscount) > 0 && (
                    <p className="text-xs text-emerald-700 mt-1">
                      Effective total: Rs. {(outstanding.totalDue - (parseFloat(closeDiscount) || 0)).toLocaleString('en-IN')}
                      {' '}(Interest reduced by Rs. {parseFloat(closeDiscount).toLocaleString('en-IN')})
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={handleClose} disabled={processing} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                    {processing ? 'Processing...' : 'Confirm Closure'}
                  </button>
                  <button onClick={() => setMode(null)} className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            )}

            {/* Partial Payment Panel */}
            {mode === 'partial' && (
              <div className="space-y-4">
                <p className="font-semibold text-gray-800">Partial Payment — Capture & Record</p>
                <WebcamCapture label="Customer Face Photo" onCapture={setPartialFace} captured={partialFace} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount Paid (Rs.) *</label>
                  <input
                    type="number"
                    placeholder="AMOUNT PAID"
                    value={partialAmountPaid}
                    onChange={(e) => { setPartialAmountPaid(e.target.value); recalcPartialSplit(e.target.value); }}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
                  />
                </div>
                {partialAmountPaid && outstanding && (() => {
                  const principal = Math.round(outstanding.currentPrincipal);
                  const interest = Math.round(outstanding.totalInterest);
                  return (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-0.5">
                      {partialAmountNum >= principal ? (
                        <>
                          <p>Full principal cleared: <strong>Rs. {principal.toLocaleString('en-IN')}</strong></p>
                          {interest > 0 && <p className="text-amber-700">Outstanding interest Rs. {interest.toLocaleString('en-IN')} remains — collect via Interest Payment.</p>}
                        </>
                      ) : partialAmountNum >= interest ? (
                        <>
                          <p>Interest cleared: <strong>Rs. {interest.toLocaleString('en-IN')}</strong></p>
                          <p>Principal reduced by: <strong>Rs. {Math.round(partialAmountNum - interest).toLocaleString('en-IN')}</strong></p>
                        </>
                      ) : (
                        <p>Entire <strong>Rs. {Math.round(partialAmountNum).toLocaleString('en-IN')}</strong> applied to interest only — no principal reduction</p>
                      )}
                    </div>
                  );
                })()}
                <div className="flex gap-3">
                  <button onClick={handlePartialPayment} disabled={processing} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {processing ? 'Processing...' : 'Record Payment'}
                  </button>
                  <button onClick={() => setMode(null)} className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Print receipt + delete for closed loans */}
        {client.status === 'closed' && (
          <div className="border-t pt-4 flex flex-wrap gap-3">
            <button
              onClick={() => { setReceiptType('close'); setShowReceipt(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Print Receipt
            </button>
            {isAdmin && (
              <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">
                Delete Record
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
      <ClientDetailContent />
    </Suspense>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}

function PhotoThumb({ url, label }: { url?: string; label: string }) {
  if (!url) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {/* object-contain shows the full image including the timestamp bar at the bottom */}
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Image src={url} alt={label} width={160} height={160} className="w-40 h-40 object-contain bg-gray-100 rounded border hover:opacity-90 transition-opacity" />
      </a>
    </div>
  );
}
