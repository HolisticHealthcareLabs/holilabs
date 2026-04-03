'use client';

interface ScreeningsDueProps {
  patientId?: string;
}

export default function ScreeningsDue({ patientId }: ScreeningsDueProps) {
  return (
    <div className="text-body-dense" style={{ color: 'var(--text-tertiary)' }}>
      No screenings due{patientId ? '' : ' — select a patient'}
    </div>
  );
}
