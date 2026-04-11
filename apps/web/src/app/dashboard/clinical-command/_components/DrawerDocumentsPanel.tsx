'use client';

interface DrawerDocumentsPanelProps {
  patientId: string;
}

export function DrawerDocumentsPanel({ patientId }: DrawerDocumentsPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-label-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Documents
      </h3>
      <p className="text-body-dense" style={{ color: 'var(--text-tertiary)' }}>
        No documents available for patient {patientId.slice(0, 8)}.
      </p>
    </div>
  );
}
