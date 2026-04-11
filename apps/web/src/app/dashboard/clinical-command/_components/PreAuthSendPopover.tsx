'use client';

interface PreAuthSendPopoverProps {
  open?: boolean;
  onClose?: () => void;
  onSend?: () => void;
  patientId?: string;
  children?: React.ReactNode;
}

export function PreAuthSendPopover({ open, onClose, children }: PreAuthSendPopoverProps) {
  if (!open) return <>{children}</>;

  return (
    <div className="relative inline-block">
      {children}
      <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">Pre-authorization submission</p>
        <button
          onClick={onClose}
          className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
