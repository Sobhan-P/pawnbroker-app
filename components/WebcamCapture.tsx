'use client';

import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface WebcamCaptureProps {
  label: string;
  onCapture: (dataUrl: string) => void;
  captured: string | null;
  defaultFacingMode?: 'user' | 'environment';
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

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) {
      onCapture(img);
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
