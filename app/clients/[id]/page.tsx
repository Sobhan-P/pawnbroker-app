'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IClient } from '@/types';
import { calculateOutstanding, InterestPeriod, OutstandingResult } from '@/lib/interest';
import { formatDateIST, getTodayIST } from '@/lib/dateUtils';
import Link from 'next/link';
import Image from 'next/image';
import WebcamCapture from '@/components/WebcamCapture';
import Receipt from '@/components/Receipt';
import PawnEntryReceipt from '@/components/PawnEntryReceipt';
import DateInput from '@/components/DateInput';

type PanelMode = null | 'close' | 'partial' | 'editDetails' | 'repledge' | 'topup';

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
  const [receiptPrincipalReduced, setReceiptPrincipalReduced] = useState(0); // [FIX] track principal
  const [receiptInterestPaid, setReceiptInterestPaid] = useState(0);       // [FIX] track interest
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

  // Edit pledge details form state
  const [editBankName, setEditBankName] = useState('');
  const [editBankDate, setEditBankDate] = useState(getTodayIST());
  const [editBankAmount, setEditBankAmount] = useState('');

  // Repledge form state
  const [repledgeAmount, setRepledgeAmount] = useState('');
  const [repledgeDueDate, setRepledgeDueDate] = useState(getTodayIST());

  // Top Up form state
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDueDate, setTopupDueDate] = useState(getTodayIST());

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
    ? calculateOutstanding(client.pawnAmount, client.pawnDate, client.payments || [], new Date(), client.interestRate)
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
      body: JSON.stringify({
        totalAmountPaid: savedAmount,
        discount: savedDiscount,
        closingFacePhoto: savedFace,
        closingJewelleryPhoto: savedJewellery
      }),
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
      setReceiptPrincipalReduced(parseFloat(partialPrincipal) || 0); // [FIX]
      setReceiptInterestPaid(parseFloat(partialInterest) || 0);     // [FIX]
      setReceiptOutstanding(savedOutstanding);
      setReceiptType('partial');
      setShowPawnReceipt(false);
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

  async function handleEditDetails() {
    setProcessing(true);
    const res = await fetch(`/api/clients/${id}/edit-details`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankName: editBankName,
        bankDate: editBankDate || null,
        bankAmount: editBankAmount ? parseFloat(editBankAmount) : null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setClient(updated);
      setMode(null);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save details');
    }
    setProcessing(false);
  }

  async function handleTopUp() {
    if (!topupAmount) return alert('Please enter the top-up amount');
    if (!topupDueDate) return alert('Please enter a new due date');
    if (!confirm(`This will increase the principal by Rs. ${parseFloat(topupAmount).toLocaleString('en-IN')} and reset the interest clock. Proceed?`)) return;
    setProcessing(true);
    const res = await fetch(`/api/clients/${id}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        additionalAmount: parseFloat(topupAmount),
        newDueDate: topupDueDate,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setClient(updated);
      setMode(null);
      setTopupAmount('');
      setTopupDueDate('');
    } else {
      let errorMsg = 'Failed to process top-up';
      try {
        const data = await res.json();
        errorMsg = data.error || errorMsg;
      } catch { /* empty body — keep default message */ }
      alert(errorMsg);
    }
    setProcessing(false);
  }

  async function handleRepledge() {
    if (!repledgeAmount) return alert('Please enter the new loan amount');
    if (!repledgeDueDate) return alert('Please enter the new due date');
    if (!confirm('This will close the current loan and create a new one with the same jewellery. Proceed?')) return;
    setProcessing(true);
    const res = await fetch(`/api/clients/${id}/repledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newPawnAmount: parseFloat(repledgeAmount),
        newDueDate: repledgeDueDate,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/clients/${data.newClientId}?newEntry=1`);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to repledge');
    }
    setProcessing(false);
  }

  const partialAmountNum = parseFloat(partialAmountPaid) || 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-blue-600 hover:underline text-sm">
          &larr; {backLabel}
        </Link>
      </div>

      {showPawnReceipt && !showReceipt && (
        <PawnEntryReceipt client={client} onClose={() => setShowPawnReceipt(false)} />
      )}

      {showReceipt && (
        <Receipt
          client={client}
          type={receiptType}
          facePhotoUrl={receiptFaceUrl || undefined}
          jewelleryPhotoUrl={receiptJewelleryUrl || undefined}
          amountPaid={receiptAmountPaid}
          principalReduced={receiptPrincipalReduced} // [FIX]
          interestPaid={receiptInterestPaid}         // [FIX]
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
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${client.status === 'active'
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
          <Detail label="Interest Rate" value={client.interestRate ? `${client.interestRate}% Regular` : "Month 1-3: 18% | Month 4+: 24% p.a."} />
          <Detail label="Pawn Date" value={formatDateIST(client.pawnDate)} />
          <Detail label="Due Date" value={formatDateIST(client.expectedReturnDate)} />
          {client.status === 'closed' && client.closedDate && (
            <Detail label="Closed On" value={formatDateIST(client.closedDate)} />
          )}
          {client.status === 'closed' && client.totalAmountPaid && (
            <Detail label="Total Amount Paid" value={`Rs. ${client.totalAmountPaid.toLocaleString('en-IN')}`} />
          )}
          {client.createdByName && <Detail label="Created By" value={client.createdByName} />}
          {client.status === 'closed' && client.bankName && <Detail label="Bank" value={client.bankName} />}
          {client.status === 'closed' && client.bankDate && <Detail label="Bank Date" value={formatDateIST(client.bankDate)} />}
          {client.status === 'closed' && client.bankAmount && <Detail label="Bank Amount" value={`Rs. ${client.bankAmount.toLocaleString('en-IN')}`} />}
        </div>

        {/* Bank details — always visible for active loans */}
        {client.status === 'active' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5 text-sm">
            <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Bank Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Detail label="Bank Name" value={client.bankName || '—'} />
              <Detail label="Bank Date" value={formatDateIST(client.bankDate)} />
              <Detail label="Bank Amount" value={client.bankAmount ? `Rs. ${client.bankAmount.toLocaleString('en-IN')}` : '—'} />
            </div>
          </div>
        )}

        {/* Interest calculation box */}
        {client.status === 'active' && outstanding && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
            <p className="font-semibold text-blue-800 mb-2 text-sm">Current Outstanding</p>
            <div className="space-y-1 mb-2">
              {outstanding.periods.length === 0 ? (
                <p className="text-xs text-blue-600 italic">No interest yet — 0 days elapsed since last payment.</p>
              ) : (
                outstanding.periods.map((p: InterestPeriod) => (
                  <div key={p.monthNumber} className="flex items-start justify-between gap-2 text-xs text-blue-700">
                    <span className="wrap-break-word min-w-0">
                      {p.monthName} ({p.daysHeld} days @ {p.rate}% p.a.)
                    </span>
                    <span className="font-semibold whitespace-nowrap">Rs. {p.interest.toLocaleString('en-IN')}</span>
                  </div>
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
                Interest from: {formatDateIST(outstanding.lastPaymentDate)} @ {client.interestRate || (outstanding.periods[0]?.rate || 18)}% p.a.
              </p>
            </div>
          </div>
        )}

        {/* Payment history */}
        {client.payments && client.payments.length > 0 && (
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Payment History</p>
            <div className="space-y-2">
              {client.payments.map((p) => {
                const isTopUp = p.type === 'partial' && p.resetsInterestClock === true && p.principalReduced === 0 && (p.interestPaid === 0 || !p.interestPaid);
                const label = isTopUp ? 'Top Up' : p.type === 'full' ? 'Full Closure' : p.type === 'partial' ? 'Partial Payment' : 'Interest Payment';
                const labelColor = isTopUp ? 'text-green-700' : p.type === 'full' ? 'text-green-700' : p.type === 'partial' ? 'text-blue-700' : 'text-amber-700';
                return (
                  <div key={p._id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${labelColor}`}>{label}</span>
                      <span className="text-gray-500">{formatDateIST(p.date)}</span>
                    </div>
                    {isTopUp ? (
                      <div className="mt-0.5">
                        <p className="text-gray-700">Amount Topped Up: <strong>Rs. {p.amountPaid.toLocaleString('en-IN')}</strong></p>
                        <p className="text-gray-600">Interest clock reset to {client.interestRate ? `${client.interestRate}%` : 'Month 1 (18%)'}</p>
                      </div>
                    ) : (
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
                    )}
                    {p.processedByName && <p className="text-gray-400">By: {p.processedByName}</p>}
                  </div>
                );
              })}
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
                <button onClick={() => setMode('topup')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">
                  Top Up Loan
                </button>
                {isAdmin && (
                  <>
                    <button onClick={() => setMode('repledge')} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700">
                      Repledge
                    </button>
                    <button
                      onClick={() => {
                        setEditBankName(client.bankName || '');
                        setEditBankDate(client.bankDate ? new Date(client.bankDate).toISOString().split('T')[0] : getTodayIST());
                        setEditBankAmount(client.bankAmount ? String(client.bankAmount) : '');
                        setMode('editDetails');
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700"
                    >
                      Edit Details
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowPawnReceipt(true)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-600"
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

            {/* Edit Pledge Details Panel */}
            {mode === 'editDetails' && (
              <div className="space-y-4">
                <p className="font-semibold text-gray-800">Edit Pledge Details</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. SBI, HDFC..."
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Disbursement Date</label>
                  <DateInput
                    value={editBankDate}
                    onChange={(e) => setEditBankDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Disbursement Amount (Rs.)</label>
                  <input
                    type="number"
                    placeholder="AMOUNT"
                    value={editBankAmount}
                    onChange={(e) => setEditBankAmount(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleEditDetails} disabled={processing} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {processing ? 'Saving...' : 'Save Details'}
                  </button>
                  <button onClick={() => setMode(null)} className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            )}

            {/* Top Up Loan Panel */}
            {mode === 'topup' && (
              <div className="space-y-4">
                <p className="font-semibold text-gray-800">Top Up Loan — Add to Principal</p>
                <p className="text-xs text-gray-500">
                  Current principal: <strong>Rs. {client.pawnAmount.toLocaleString('en-IN')}</strong>. The additional amount will be added and the interest clock will reset from today.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Amount (Rs.) *</label>
                  <input
                    type="number"
                    placeholder="TOP-UP AMOUNT"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 placeholder:text-gray-400"
                  />
                  {topupAmount && !isNaN(parseFloat(topupAmount)) && (
                    <p className="text-xs text-green-700 mt-1">
                      New principal will be: Rs. {(client.pawnAmount + parseFloat(topupAmount)).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Due Date *</label>
                  <DateInput
                    value={topupDueDate}
                    onChange={(e) => setTopupDueDate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleTopUp} disabled={processing} className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                    {processing ? 'Processing...' : 'Confirm Top Up'}
                  </button>
                  <button onClick={() => setMode(null)} className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            )}

            {/* Repledge Panel */}
            {mode === 'repledge' && (
              <div className="space-y-4">
                <p className="font-semibold text-gray-800">Repledge — Same Jewellery, New Loan</p>
                <p className="text-xs text-gray-500">This will close the current loan and create a new active loan for the same customer and jewellery.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Loan Amount (Rs.) *</label>
                  <input
                    type="number"
                    placeholder="NEW PRINCIPAL"
                    value={repledgeAmount}
                    onChange={(e) => setRepledgeAmount(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Due Date *</label>
                  <DateInput
                    value={repledgeDueDate}
                    onChange={(e) => setRepledgeDueDate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleRepledge} disabled={processing} className="bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50">
                    {processing ? 'Processing...' : 'Confirm Repledge'}
                  </button>
                  <button onClick={() => setMode(null)} className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Delete for closed loans (admin only) */}
        {client.status === 'closed' && isAdmin && (
          <div className="border-t pt-4 flex flex-wrap gap-3">
            <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">
              Delete Record
            </button>
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
