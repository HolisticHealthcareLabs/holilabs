'use client';

/**
 * Electronic Signature Component
 * Supports two signature methods:
 * 1. PIN Entry (4-6 digits)
 * 2. Signature Pad (canvas-based drawing)
 */

import { useState, useRef, useEffect } from 'react';

export type SignatureMethod = 'pin' | 'signature_pad';

interface ElectronicSignatureProps {
  onSign: (method: SignatureMethod, signatureData: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ElectronicSignature({
  onSign,
  onCancel,
  isSubmitting = false,
}: ElectronicSignatureProps) {
  const [method, setMethod] = useState<SignatureMethod>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Canvas drawing setup
  useEffect(() => {
    if (method === 'signature_pad' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [method]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
      }
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length <= 6) {
      setPin(digitsOnly);
      setPinError('');
    }
  };

  const handleSubmit = () => {
    if (method === 'pin') {
      // Validate PIN
      if (pin.length < 4) {
        setPinError('PIN must be at least 4 digits');
        return;
      }
      onSign('pin', pin);
    } else {
      // signature_pad
      if (!hasDrawn) {
        return;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        // Convert canvas to base64 image
        const signatureData = canvas.toDataURL('image/png');
        onSign('signature_pad', signatureData);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white p-6">
          <h2 className="text-2xl font-bold mb-2">Electronic Signature</h2>
          <p className="text-primary-100">
            Sign this prescription electronically to authorize
          </p>
        </div>

        <div className="p-6">
          {/* Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Signature Method
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMethod('pin')}
                className={`p-4 border-2 rounded-xl transition-all ${
                  method === 'pin'
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <svg
                    className="w-8 h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">PIN Entry</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Quick and secure
                </p>
              </button>

              <button
                onClick={() => setMethod('signature_pad')}
                className={`p-4 border-2 rounded-xl transition-all ${
                  method === 'signature_pad'
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <svg
                    className="w-8 h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">Signature Pad</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Draw signature</p>
              </button>
            </div>
          </div>

          {/* PIN Entry */}
          {method === 'pin' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Enter Your PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="Enter 4-6 digit PIN"
                maxLength={6}
                className={`w-full px-4 py-3 text-center text-2xl tracking-widest border-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  pinError
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                autoFocus
              />
              {pinError && <p className="text-red-600 text-sm mt-2">{pinError}</p>}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Your PIN must be 4-6 digits. This PIN securely authorizes your electronic
                signature.
              </p>
            </div>
          )}

          {/* Signature Pad */}
          {method === 'signature_pad' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Draw Your Signature
              </label>
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full cursor-crosshair"
                  style={{ touchAction: 'none' }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sign with your mouse or touchscreen
                </p>
                <button
                  onClick={clearSignature}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (method === 'pin' && pin.length < 4) ||
                (method === 'signature_pad' && !hasDrawn)
              }
              className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-lg hover:from-primary-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Sign Prescription
                </>
              )}
            </button>
          </div>

          {/* Legal Notice */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Legal Notice:</strong> By signing this prescription electronically, you
              certify that you are the authorized prescriber and that this prescription is
              accurate and complete. Your electronic signature has the same legal standing as a
              handwritten signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
