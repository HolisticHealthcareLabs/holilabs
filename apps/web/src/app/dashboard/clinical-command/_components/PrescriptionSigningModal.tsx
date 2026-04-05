'use client';

interface PrescriptionSigningModalProps {
  open?: boolean;
  onClose?: () => void;
  onSign?: (method: 'password' | 'webauthn') => void;
  prescriptionId?: string;
}

export function PrescriptionSigningModal({ open, onClose, onSign }: PrescriptionSigningModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sign Prescription</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Choose a signing method to authorize this prescription.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => onSign?.('webauthn')}
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign with Biometrics
          </button>
          <button
            onClick={() => onSign?.('password')}
            className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Sign with Password
          </button>
        </div>
        <button onClick={onClose} className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Cancel
        </button>
      </div>
    </div>
  );
}
