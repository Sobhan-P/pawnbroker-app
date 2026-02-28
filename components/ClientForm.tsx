'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WebcamCapture from './WebcamCapture';

export default function ClientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [kycPhoto, setKycPhoto] = useState<string | null>(null);
  const [jewelleryPhoto, setJewelleryPhoto] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    contactNumber: '',
    jewelleryDetails: '',
    goldWeight: '',
    pawnAmount: '',
    interestRate: '2',
    pawnDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function uploadPhoto(dataUrl: string, folder: string): Promise<string | undefined> {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, folder }),
    });
    const data = await res.json();
    return data.url;
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setLoading(true);
    try {
      let facePhotoUrl: string | undefined;
      let kycDocumentUrl: string | undefined;
      let jewelleryPhotoUrl: string | undefined;
      if (facePhoto) facePhotoUrl = await uploadPhoto(facePhoto, 'face');
      if (kycPhoto) kycDocumentUrl = await uploadPhoto(kycPhoto, 'kyc');
      if (jewelleryPhoto) jewelleryPhotoUrl = await uploadPhoto(jewelleryPhoto, 'jewellery');

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          goldWeight: parseFloat(form.goldWeight),
          pawnAmount: parseFloat(form.pawnAmount),
          interestRate: parseFloat(form.interestRate),
          facePhotoUrl,
          kycDocumentUrl,
          jewelleryPhotoUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      router.push('/clients');
    } catch {
      alert('Error saving record. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
          <input name="name" value={form.name} onChange={handleChange} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
          <input name="contactNumber" value={form.contactNumber} onChange={handleChange} required className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jewellery Details *</label>
        <textarea name="jewelleryDetails" value={form.jewelleryDetails} onChange={handleChange} required rows={2} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gold Weight (g) *</label>
          <input name="goldWeight" type="number" step="0.01" value={form.goldWeight} onChange={handleChange} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pawn Amount (Rs.) *</label>
          <input name="pawnAmount" type="number" value={form.pawnAmount} onChange={handleChange} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%/month) *</label>
          <input name="interestRate" type="number" step="0.1" value={form.interestRate} onChange={handleChange} required className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pawn Date *</label>
          <input name="pawnDate" type="date" value={form.pawnDate} onChange={handleChange} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Return Date *</label>
          <input name="expectedReturnDate" type="date" value={form.expectedReturnDate} onChange={handleChange} required className={inputClass} />
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Webcam Capture</p>
        <WebcamCapture label="Face Photo" onCapture={setFacePhoto} captured={facePhoto} />
        <WebcamCapture label="KYC Document (Aadhaar / PAN)" onCapture={setKycPhoto} captured={kycPhoto} />
        <WebcamCapture label="Jewellery Photo" onCapture={setJewelleryPhoto} captured={jewelleryPhoto} defaultFacingMode="environment" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving & Sending WhatsApp...' : 'Save Pawn Record'}
      </button>
    </form>
  );
}
