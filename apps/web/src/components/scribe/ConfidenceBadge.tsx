'use client';

interface ConfidenceBadgeProps {
  confidence: number; // 0.0 to 1.0
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConfidenceBadge({ confidence, size = 'md', showLabel = true }: ConfidenceBadgeProps) {
  const getColor = () => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
    if (confidence >= 0.75) return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
    return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
  };

  const getLabel = () => {
    if (confidence >= 0.9) return 'ALTA';
    if (confidence >= 0.75) return 'MÉDIA';
    return 'BAIXA';
  };

  const getIcon = () => {
    if (confidence >= 0.9) return '✅';
    if (confidence >= 0.75) return '⚠️';
    return '❌';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5';
      case 'lg':
        return 'text-sm px-3 py-1.5';
      case 'md':
      default:
        return 'text-xs px-2 py-1';
    }
  };

  const percentage = (confidence * 100).toFixed(0);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold ${getColor()} ${getSizeClasses()}`}>
      <span className="flex items-center gap-1">
        {getIcon()}
        {showLabel && (
          <>
            <span>Confiança: {getLabel()}</span>
            <span className="opacity-75">({percentage}%)</span>
          </>
        )}
        {!showLabel && <span>{percentage}%</span>}
      </span>
    </span>
  );
}

interface ConfidenceBarProps {
  confidence: number; // 0.0 to 1.0
  label?: string;
}

export function ConfidenceBar({ confidence, label }: ConfidenceBarProps) {
  const getBarColor = () => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const percentage = confidence * 100;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{label}</span>
          <span className="font-semibold">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface ConfidenceAlertProps {
  confidence: number; // 0.0 to 1.0
  sectionName?: string;
}

export function ConfidenceAlert({ confidence, sectionName }: ConfidenceAlertProps) {
  if (confidence >= 0.9) {
    return null; // No alert needed for high confidence
  }

  const getMessage = () => {
    if (confidence >= 0.75) {
      return `⚠️ Confiança média (${(confidence * 100).toFixed(0)}%) ${sectionName ? `na seção "${sectionName}"` : ''}. Revise cuidadosamente antes de assinar.`;
    }
    return `❌ Baixa confiança (${(confidence * 100).toFixed(0)}%) ${sectionName ? `na seção "${sectionName}"` : ''}. É ALTAMENTE recomendado revisar e editar esta seção manualmente.`;
  };

  const getAlertColor = () => {
    if (confidence >= 0.75) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300';
    }
    return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300';
  };

  return (
    <div className={`rounded-md border p-3 text-sm ${getAlertColor()}`}>
      {getMessage()}
    </div>
  );
}
