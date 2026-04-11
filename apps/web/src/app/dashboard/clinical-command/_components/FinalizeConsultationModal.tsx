'use client';

interface FinalizeConsultationModalProps {
  open?: boolean;
  onClose?: () => void;
  onFinalize?: () => void;
  patientName?: string;
}

export function FinalizeConsultationModal({ open, onClose, onFinalize }: FinalizeConsultationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Finalize Consultation</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to finalize this consultation? This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={onFinalize} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
            Finalize
          </button>
        </div>
      </div>
    </div>
  );
}
