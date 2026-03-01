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
      const ts = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
      });
      const stampLabel = `PPN Finance | ${ts}`;

      const padding = 10;
      ctx.font = 'bold 14px monospace';
      const textW = ctx.measureText(stampLabel).width;
      const boxH = 26;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(padding, canvas.height - boxH - padding, textW + padding * 2, boxH);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(stampLabel, padding * 2, canvas.height - padding - 6);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = dataUrl;
  });
}

export default function WebcamCapture({
  label,
  onCapture,
  captured,
  defaultFacingMode = 'user',
}: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
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

  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      {captured ? (
        <div className="flex items-center gap-3">
          <img src={captured} alt="Captured" className="w-24 h-24 object-cover rounded border" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm text-amber-700 underline"
          >
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-sm hover:bg-amber-200"
        >
          Open Camera
        </button>
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
