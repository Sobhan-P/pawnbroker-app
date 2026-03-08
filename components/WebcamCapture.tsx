'use client';

import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface WebcamCaptureProps {
  label: string;
  onCapture: (dataUrl: string) => void;
  captured: string | null;
  defaultFacingMode?: 'user' | 'environment';
}

function addTimestamp(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const now = new Date();
      const datePart = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      const timePart = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
      });

      // Scale font to 4% of image width so it's clearly visible at any resolution
      const fontSize = Math.max(Math.round(canvas.width * 0.04), 28);
      const lineH = Math.round(fontSize * 1.35);
      const pad = Math.round(fontSize * 0.6);

      ctx.font = `bold ${fontSize}px monospace`;

      const line1 = 'SB FINANCE';
      const line2 = `${datePart}  ${timePart.toUpperCase()}`;

      // Full-width bar so text never overflows on any image size
      const barH = lineH * 2 + pad * 1.5;
      const barY = canvas.height - barH;

      // Dark background bar — full width
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(0, barY, canvas.width, barH);

      // Amber top accent line — full width
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(0, barY, canvas.width, Math.round(fontSize * 0.12));

      // White text (padded from left edge)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(line1, pad, barY + pad + fontSize);
      ctx.fillText(line2, pad, barY + pad + fontSize + lineH);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WebcamCapture({
  label,
  onCapture,
  captured,
  defaultFacingMode = 'user',
}: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(defaultFacingMode);

  const capture = useCallback(async () => {
    const img = webcamRef.current?.getScreenshot();
    if (img) {
      const stamped = await addTimestamp(img);
      onCapture(stamped);
      setOpen(false);
    }
  }, [onCapture]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const stamped = await addTimestamp(dataUrl);
    onCapture(stamped);
    e.target.value = '';
  }, [onCapture]);

  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {captured ? (
        <div className="flex items-center gap-3">
          <img src={captured} alt="Captured" className="w-24 h-24 object-cover rounded border" />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-sm text-amber-700 underline"
            >
              Retake (Camera)
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-600 underline"
            >
              Replace (Upload File)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-sm hover:bg-amber-200"
          >
            📷 Open Camera
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-300 rounded text-sm hover:bg-blue-100"
          >
            📎 Upload File
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-4 shadow-xl w-full sm:max-w-md">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-800">{label}</p>
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 font-medium"
              >
                ⟳ Flip Camera
              </button>
            </div>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full rounded"
              videoConstraints={{ facingMode }}
            />
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={capture}
                className="flex-1 bg-amber-700 text-white py-3 rounded-lg font-semibold hover:bg-amber-800 text-sm"
              >
                Capture
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
