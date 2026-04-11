'use client';

interface RiskScorePanelProps {
  patientId?: string;
  scores?: Record<string, number>;
}

export default function RiskScorePanel({ scores }: RiskScorePanelProps) {
  if (!scores || Object.keys(scores).length === 0) {
    return (
      <div className="text-body-dense" style={{ color: 'var(--text-tertiary)' }}>
        No risk scores available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(scores).map(([name, value]) => (
        <div key={name} className="flex items-center justify-between text-body-dense">
          <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
          <span className="font-medium" style={{ color: value > 0.7 ? 'var(--color-red)' : 'var(--text-primary)' }}>
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}
