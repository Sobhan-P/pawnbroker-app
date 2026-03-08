'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WebcamCapture from './WebcamCapture';
import DateInput from './DateInput';
import { getTodayIST } from '@/lib/dateUtils';

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
    interestRate: '', // Empty means use Tiered Logic (18%/24%)
    pawnDate: getTodayIST(),
    expectedReturnDate: getTodayIST(),
    nomineeName: '',
    nomineePhone: '',
    nomineeRelationship: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Photo upload failed');
    }
    const data = await res.json();
    return data.url;
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (loading) return;
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
          nomineePhone: form.nomineePhone ? `+91${form.nomineePhone}` : '',
          goldWeight: grossWeight, // backward compat
          goldWeightGross: grossWeight,
          goldWeightNet: netWeight,
          pawnAmount: parseFloat(form.pawnAmount),
          interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined, // Empty -> Tiered Logic
          facePhotoUrl,
          kycDocumentUrl,
          kycBackDocumentUrl,
          jewelleryPhotoUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(data.error || 'Failed to save');
      }
      const data = await res.json();
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
          <input name="goldWeightGross" type="number" step="0.01" value={form.goldWeightGross} onChange={handleChange}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            required placeholder="TOTAL WEIGHT INCL. STONE" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight (g) *</label>
          <input name="goldWeightNet" type="number" step="0.01" value={form.goldWeightNet} onChange={handleChange}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            required placeholder="PURE GOLD WEIGHT" className={inputClass} />
        </div>
      </div>

      {/* Pawn Amount + Interest Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pawn Amount (Rs.) *</label>
          <input name="pawnAmount" type="number" value={form.pawnAmount} onChange={handleChange}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            required placeholder="LOAN AMOUNT" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (% p.a.)</label>
          <input
            name="interestRate"
            type="number"
            value={form.interestRate}
            onChange={handleChange}
            placeholder="LEAVE EMPTY FOR TIERED (18%/24%)"
            className={inputClass}
          />
          <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">
            Empty = Month 1-3: 18% · Month 4+: 24% p.a. (Compounding)
          </p>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pawn-date" className="block text-sm font-medium text-gray-700 mb-1">Pawn Date *</label>
          <DateInput
            id="pawn-date"
            name="pawnDate"
            value={form.pawnDate}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="expected-return-date" className="block text-sm font-medium text-gray-700 mb-1">Expected Return Date *</label>
          <DateInput
            id="expected-return-date"
            name="expectedReturnDate"
            value={form.expectedReturnDate}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Nominee Details */}
      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Nominee Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nominee Name</label>
            <input name="nomineeName" value={form.nomineeName} onChange={handleChange} placeholder="NOMINEE FULL NAME" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nominee Phone</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 bg-gray-50 text-gray-500 text-sm">+91</span>
              <input
                type="tel"
                name="nomineePhone"
                value={form.nomineePhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm({ ...form, nomineePhone: digits });
                }}
                maxLength={10}
                placeholder="10-DIGIT MOBILE"
                className="w-full border rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
          <select name="nomineeRelationship" value={form.nomineeRelationship} onChange={handleChange} className={inputClass}>
            <option value="">Select relationship</option>
            <option value="Spouse">Spouse</option>
            <option value="Parent">Parent</option>
            <option value="Sibling">Sibling</option>
            <option value="Child">Child</option>
            <option value="Friend">Friend</option>
            <option value="Other">Other</option>
          </select>
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
