'use client';

interface Alert {
  ruleId: string;
  severity: 'RED' | 'AMBER' | 'GREEN';
  message: string;
}

interface AlertBannerProps {
  alerts: Alert[];
  patientId: string;
  onAcknowledge?: (ruleId: string) => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  RED: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
  AMBER: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  GREEN: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
};

export default function AlertBanner({ alerts, onAcknowledge }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.ruleId}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.GREEN}`}
        >
          <span>{alert.message}</span>
          {onAcknowledge && (
            <button
              onClick={() => onAcknowledge(alert.ruleId)}
              className="ml-2 text-xs underline opacity-70 hover:opacity-100"
            >
              Acknowledge
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
