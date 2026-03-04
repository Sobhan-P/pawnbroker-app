'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WebcamCapture from './WebcamCapture';

export default function ClientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [kycFrontPhoto, setKycFrontPhoto] = useState<string | null>(null);
  const [kycBackPhoto, setKycBackPhoto] = useState<string | null>(null);
  const [jewelleryPhoto, setJewelleryPhoto] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    contactNumber: '',
    glNumber: '',
    jewelleryDetails: '',
    goldWeightGross: '',
    goldWeightNet: '',
    pawnAmount: '',
    pawnDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Contact number: accept only digits, max 10
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, contactNumber: digits });
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
    if (form.contactNumber.length !== 10) {
      alert('Contact number must be exactly 10 digits');
      return;
    }
    const gross = parseFloat(form.goldWeightGross);
    const net = parseFloat(form.goldWeightNet);
    if (net > gross) {
      alert('Net weight cannot be greater than gross weight');
      return;
    }
    setLoading(true);
    try {
      let facePhotoUrl: string | undefined;
      let kycDocumentUrl: string | undefined;
      let kycBackDocumentUrl: string | undefined;
      let jewelleryPhotoUrl: string | undefined;
      if (facePhoto) facePhotoUrl = await uploadPhoto(facePhoto, 'face');
      if (kycFrontPhoto) kycDocumentUrl = await uploadPhoto(kycFrontPhoto, 'kyc');
      if (kycBackPhoto) kycBackDocumentUrl = await uploadPhoto(kycBackPhoto, 'kyc-back');
      if (jewelleryPhoto) jewelleryPhotoUrl = await uploadPhoto(jewelleryPhoto, 'jewellery');

      const grossWeight = parseFloat(form.goldWeightGross);
      const netWeight = parseFloat(form.goldWeightNet);

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          contactNumber: `+91${form.contactNumber}`,
          goldWeight: grossWeight, // backward compat
          goldWeightGross: grossWeight,
          goldWeightNet: netWeight,
          pawnAmount: parseFloat(form.pawnAmount),
          facePhotoUrl,
          kycDocumentUrl,
          kycBackDocumentUrl,
          jewelleryPhotoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      router.push(`/clients/${data._id}?newEntry=1`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving record. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Row 1: Name, Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
          <input name="name" value={form.name} onChange={handleChange} required placeholder="FULL NAME" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 bg-gray-50 text-gray-500 text-sm">+91</span>
            <input
              type="tel"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleContactChange}
              required
              maxLength={10}
              placeholder="10-DIGIT MOBILE"
              className="w-full border rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
            />
          </div>
          {form.contactNumber.length > 0 && form.contactNumber.length < 10 && (
            <p className="text-xs text-red-500 mt-0.5">{10 - form.contactNumber.length} more digits needed</p>
          )}
        </div>
      </div>

      {/* GL Number — mandatory */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">GL Number *</label>
        <input name="glNumber" value={form.glNumber} onChange={handleChange} required placeholder="GL NUMBER" className={inputClass} />
      </div>

      {/* Jewellery Details */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jewellery Details *</label>
        <textarea name="jewelleryDetails" value={form.jewelleryDetails} onChange={handleChange} required rows={2} placeholder="DESCRIBE THE JEWELLERY..." className={inputClass} />
      </div>

      {/* Gold Weight — Gross and Net */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gross Weight (g) *</label>
          <input name="goldWeightGross" type="number" step="0.01" value={form.goldWeightGross} onChange={handleChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} required placeholder="TOTAL WEIGHT INCL. STONE" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight (g) *</label>
          <input name="goldWeightNet" type="number" step="0.01" value={form.goldWeightNet} onChange={handleChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} required placeholder="PURE GOLD WEIGHT" className={inputClass} />
        </div>
      </div>

      {/* Pawn Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pawn Amount (Rs.) *</label>
        <input name="pawnAmount" type="number" value={form.pawnAmount} onChange={handleChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} required placeholder="LOAN AMOUNT" className={inputClass} />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pawn-date" className="block text-sm font-medium text-gray-700 mb-1">Pawn Date *</label>
          <input id="pawn-date" name="pawnDate" type="date" value={form.pawnDate} onChange={handleChange} required className={inputClass} onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }} />
        </div>
        <div>
          <label htmlFor="expected-return-date" className="block text-sm font-medium text-gray-700 mb-1">Expected Return Date *</label>
          <input id="expected-return-date" name="expectedReturnDate" type="date" value={form.expectedReturnDate} onChange={handleChange} required className={inputClass} onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }} />
        </div>
      </div>

      {/* Photo captures */}
      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Photo Captures</p>
        <WebcamCapture label="Customer Face Photo" onCapture={setFacePhoto} captured={facePhoto} />
        <WebcamCapture label="KYC Document — Front (Aadhaar / PAN)" onCapture={setKycFrontPhoto} captured={kycFrontPhoto} defaultFacingMode="environment" />
        <WebcamCapture label="KYC Document — Back" onCapture={setKycBackPhoto} captured={kycBackPhoto} defaultFacingMode="environment" />
        <WebcamCapture label="Jewellery Photo" onCapture={setJewelleryPhoto} captured={jewelleryPhoto} defaultFacingMode="environment" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving...' : 'Save Pawn Record'}
      </button>
    </form>
  );
}
