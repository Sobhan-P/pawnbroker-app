'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IClient } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<IClient | null>(null);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then(setClient);
  }, [id]);

  async function handleClose() {
    if (!amountPaid) return alert('Please enter the total amount paid');
    setClosing(true);
    await fetch(`/api/clients/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalAmountPaid: parseFloat(amountPaid) }),
    });
    router.push('/closed');
  }

  async function handleDelete() {
    if (!confirm('Delete this closed record permanently?')) return;
    setDeleting(true);
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    router.push('/closed');
  }

  if (!client) return <p className="text-gray-500">Loading...</p>;

  const isOverdue = client.status === 'active' && new Date(client.expectedReturnDate) < new Date();
  const monthsElapsed = Math.max(1, Math.ceil(
    (new Date().getTime() - new Date(client.pawnDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  ));
  const totalInterest = Math.round(client.pawnAmount * (client.interestRate / 100) * monthsElapsed);
  const totalDue = client.pawnAmount + totalInterest;

  const backHref = client.status === 'closed' ? '/closed' : '/clients';
  const backLabel = client.status === 'closed' ? 'Back to Closed Records' : 'Back to Active Records';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-blue-600 hover:underline text-sm">
          &larr; {backLabel}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm max-w-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-blue-500 font-medium mb-0.5">#{client.serialNumber}</p>
            <h1 className="text-xl font-bold text-gray-800">{client.name}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
            client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {client.status}
            {isOverdue && ' — OVERDUE'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-5">
          <Detail label="Contact" value={client.contactNumber} />
          <Detail label="Gold Weight" value={`${client.goldWeight} g`} />
          <Detail label="Jewellery Details" value={client.jewelleryDetails} />
          <Detail label="Pawn Amount" value={`Rs. ${client.pawnAmount.toLocaleString('en-IN')}`} />
          <Detail label="Interest Rate" value={`${client.interestRate}% / month`} />
          <Detail label="Pawn Date" value={new Date(client.pawnDate).toLocaleDateString('en-IN')} />
          <Detail label="Due Date" value={new Date(client.expectedReturnDate).toLocaleDateString('en-IN')} />
          {client.status === 'closed' && client.closedDate && (
            <Detail label="Closed On" value={new Date(client.closedDate).toLocaleDateString('en-IN')} />
          )}
          {client.status === 'closed' && client.totalAmountPaid && (
            <Detail label="Amount Paid" value={`Rs. ${client.totalAmountPaid.toLocaleString('en-IN')}`} />
          )}
        </div>

        {client.status === 'active' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm">
            <p className="font-semibold text-blue-800 mb-1">Current Outstanding</p>
            <p>Principal: <strong>Rs. {client.pawnAmount.toLocaleString('en-IN')}</strong></p>
            <p>Interest ({monthsElapsed} month{monthsElapsed > 1 ? 's' : ''}): <strong>Rs. {totalInterest.toLocaleString('en-IN')}</strong></p>
            <p className="mt-1 text-base font-bold text-blue-900">Total Due: Rs. {totalDue.toLocaleString('en-IN')}</p>
          </div>
        )}

        {(client.facePhotoUrl || client.kycDocumentUrl || client.jewelleryPhotoUrl) && (
          <div className="flex flex-wrap gap-4 mb-5">
            {client.facePhotoUrl && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Face Photo</p>
                <Image src={client.facePhotoUrl} alt="Face" width={96} height={96} className="w-24 h-24 object-cover rounded border" />
              </div>
            )}
            {client.kycDocumentUrl && (
              <div>
                <p className="text-xs text-gray-500 mb-1">KYC Document</p>
                <Image src={client.kycDocumentUrl} alt="KYC" width={96} height={96} className="w-24 h-24 object-cover rounded border" />
              </div>
            )}
            {client.jewelleryPhotoUrl && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Jewellery Photo</p>
                <Image src={client.jewelleryPhotoUrl} alt="Jewellery" width={96} height={96} className="w-24 h-24 object-cover rounded border" />
              </div>
            )}
          </div>
        )}

        {client.status === 'active' && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Close This Loan</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                placeholder="Total amount paid (Rs.)"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleClose}
                disabled={closing}
                className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {closing ? 'Closing...' : 'Mark as Closed'}
              </button>
            </div>
          </div>
        )}

        {client.status === 'closed' && (
          <div className="border-t pt-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Record'}
            </button>
          </div>
        )}
      </div>
    </div>
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
