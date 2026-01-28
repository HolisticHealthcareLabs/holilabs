'use client';

import { useState, useCallback } from 'react';
import type { TrafficLightResult, TrafficLightSignal, TrafficLightColor } from '@/lib/traffic-light/types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TrafficLightProps {
  result: TrafficLightResult | null;
  loading?: boolean;
  onOverride?: (signals: TrafficLightSignal[], justification: string) => Promise<void>;
  showDetails?: boolean;
  compact?: boolean;
  language?: 'en' | 'pt';
}

interface SignalCardProps {
  signal: TrafficLightSignal;
  language: 'en' | 'pt';
  expanded?: boolean;
  onToggle?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COLOR_STYLES: Record<TrafficLightColor, { bg: string; text: string; border: string; glow: string }> = {
  RED: {
    bg: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500',
    glow: 'shadow-red-500/50',
  },
  YELLOW: {
    bg: 'bg-yellow-400',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500',
    glow: 'shadow-yellow-400/50',
  },
  GREEN: {
    bg: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500',
    glow: 'shadow-green-500/50',
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  CLINICAL: '/icons/stethoscope.svg',
  BILLING: '/icons/receipt.svg',
  ADMINISTRATIVE: '/icons/clipboard.svg',
};

const CATEGORY_LABELS: Record<string, { en: string; pt: string }> = {
  CLINICAL: { en: 'Clinical', pt: 'Clinico' },
  BILLING: { en: 'Billing', pt: 'Faturamento' },
  ADMINISTRATIVE: { en: 'Administrative', pt: 'Administrativo' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function SignalCard({ signal, language, expanded = false, onToggle }: SignalCardProps) {
  const colorStyle = COLOR_STYLES[signal.color];
  const message = language === 'pt' ? signal.messagePortuguese : signal.message;
  const correction = language === 'pt' ? signal.suggestedCorrectionPortuguese : signal.suggestedCorrection;
  const categoryLabel = CATEGORY_LABELS[signal.category]?.[language] || signal.category;

  return (
    <div
      className={`rounded-lg border-l-4 ${colorStyle.border} bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorStyle.bg} text-white`}
              >
                {signal.color}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{categoryLabel}</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{signal.ruleName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{message}</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          {/* Evidence */}
          {signal.evidence.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                {language === 'pt' ? 'Evidencia' : 'Evidence'}
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                {signal.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Regulatory Reference */}
          {signal.regulatoryReference && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                {language === 'pt' ? 'Referencia Regulatoria' : 'Regulatory Reference'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{signal.regulatoryReference}</p>
            </div>
          )}

          {/* Glosa Risk */}
          {signal.estimatedGlosaRisk && (
            <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-1">
                {language === 'pt' ? 'Risco de Glosa' : 'Denial Risk'}
              </h4>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-yellow-800 dark:text-yellow-300 font-semibold">
                    {signal.estimatedGlosaRisk.probability.toFixed(0)}%
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                    {language === 'pt' ? 'probabilidade' : 'probability'}
                  </span>
                </div>
                {signal.estimatedGlosaRisk.estimatedAmount > 0 && (
                  <div>
                    <span className="text-yellow-800 dark:text-yellow-300 font-semibold">
                      R$ {signal.estimatedGlosaRisk.estimatedAmount.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                      {language === 'pt' ? 'em risco' : 'at risk'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggested Correction */}
          {correction && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">
                {language === 'pt' ? 'Acao Sugerida' : 'Suggested Action'}
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300">{correction}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TRAFFIC LIGHT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TrafficLight({
  result,
  loading = false,
  onOverride,
  showDetails = true,
  compact = false,
  language = 'en',
}: TrafficLightProps) {
  const [expandedSignals, setExpandedSignals] = useState<Set<string>>(new Set());
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [justification, setJustification] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  const toggleSignal = useCallback((ruleId: string) => {
    setExpandedSignals((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

  const handleOverride = useCallback(async () => {
    if (!result || !onOverride || justification.length < 10) return;

    setOverrideLoading(true);
    try {
      await onOverride(result.signals, justification);
      setShowOverrideModal(false);
      setJustification('');
    } finally {
      setOverrideLoading(false);
    }
  }, [result, onOverride, justification]);

  // Loading state
  if (loading) {
    return (
      <div className={`${compact ? 'p-3' : 'p-6'} bg-white dark:bg-gray-800 rounded-xl shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
          </div>
        </div>
      </div>
    );
  }

  // No result yet
  if (!result) {
    return (
      <div className={`${compact ? 'p-3' : 'p-6'} bg-white dark:bg-gray-800 rounded-xl shadow-lg`}>
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-lg">?</span>
          </div>
          <span className="text-sm">
            {language === 'pt' ? 'Aguardando avaliacao...' : 'Awaiting evaluation...'}
          </span>
        </div>
      </div>
    );
  }

  const colorStyle = COLOR_STYLES[result.color];
  const hasSignals = result.signals.length > 0;

  return (
    <div className="space-y-4">
      {/* Main Status Display */}
      <div
        className={`${compact ? 'p-3' : 'p-6'} bg-white dark:bg-gray-800 rounded-xl shadow-lg ${colorStyle.glow} shadow-xl`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Traffic Light Indicator */}
            <div className="flex flex-col gap-1">
              <div
                className={`w-6 h-6 rounded-full ${result.color === 'RED' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-gray-300 dark:bg-gray-600'}`}
              />
              <div
                className={`w-6 h-6 rounded-full ${result.color === 'YELLOW' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 'bg-gray-300 dark:bg-gray-600'}`}
              />
              <div
                className={`w-6 h-6 rounded-full ${result.color === 'GREEN' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-300 dark:bg-gray-600'}`}
              />
            </div>

            {/* Status Text */}
            <div>
              <h3 className={`text-lg font-bold ${colorStyle.text}`}>
                {result.color === 'GREEN'
                  ? language === 'pt'
                    ? 'Aprovado'
                    : 'Approved'
                  : result.color === 'YELLOW'
                    ? language === 'pt'
                      ? 'Atencao Necessaria'
                      : 'Attention Required'
                    : language === 'pt'
                      ? 'Bloqueado'
                      : 'Blocked'}
              </h3>
              {hasSignals && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result.signals.length}{' '}
                  {language === 'pt'
                    ? result.signals.length === 1
                      ? 'alerta'
                      : 'alertas'
                    : result.signals.length === 1
                      ? 'alert'
                      : 'alerts'}
                  {' • '}
                  {result.summary.clinical.red + result.summary.clinical.yellow > 0 &&
                    `${result.summary.clinical.red + result.summary.clinical.yellow} ${language === 'pt' ? 'clinico' : 'clinical'}`}
                  {result.summary.billing.red + result.summary.billing.yellow > 0 &&
                    ` ${result.summary.billing.red + result.summary.billing.yellow} ${language === 'pt' ? 'faturamento' : 'billing'}`}
                  {result.summary.administrative.red + result.summary.administrative.yellow > 0 &&
                    ` ${result.summary.administrative.red + result.summary.administrative.yellow} ${language === 'pt' ? 'admin' : 'admin'}`}
                </p>
              )}
            </div>
          </div>

          {/* Override Button */}
          {result.canOverride && result.color !== 'GREEN' && onOverride && (
            <button
              onClick={() => setShowOverrideModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {result.overrideRequires === 'supervisor'
                ? language === 'pt'
                  ? 'Solicitar Override'
                  : 'Request Override'
                : language === 'pt'
                  ? 'Override'
                  : 'Override'}
            </button>
          )}
        </div>

        {/* Glosa Risk Summary */}
        {result.totalGlosaRisk && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {language === 'pt' ? 'Risco Total de Glosa' : 'Total Denial Risk'}
              </span>
              <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">
                ({result.totalGlosaRisk.issueCount}{' '}
                {language === 'pt'
                  ? result.totalGlosaRisk.issueCount === 1
                    ? 'problema'
                    : 'problemas'
                  : result.totalGlosaRisk.issueCount === 1
                    ? 'issue'
                    : 'issues'}
                )
              </span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-yellow-800 dark:text-yellow-300">
                R$ {result.totalGlosaRisk.totalAmountAtRisk.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                {result.totalGlosaRisk.probability.toFixed(0)}%{' '}
                {language === 'pt' ? 'probabilidade' : 'probability'}
              </div>
            </div>
          </div>
        )}

        {/* Latency indicator */}
        {result.metadata.latencyMs && !compact && (
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            {language === 'pt' ? 'Avaliado em' : 'Evaluated in'} {result.metadata.latencyMs}ms
          </div>
        )}
      </div>

      {/* Signal Details */}
      {showDetails && hasSignals && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {language === 'pt' ? 'Detalhes dos Alertas' : 'Alert Details'}
          </h4>
          {result.signals.map((signal) => (
            <SignalCard
              key={signal.ruleId}
              signal={signal}
              language={language}
              expanded={expandedSignals.has(signal.ruleId)}
              onToggle={() => toggleSignal(signal.ruleId)}
            />
          ))}
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {language === 'pt' ? 'Justificativa para Override' : 'Override Justification'}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {result.overrideRequires === 'supervisor'
                ? language === 'pt'
                  ? 'Este override requer aprovacao de supervisor. Por favor, fornica justificativa clinica detalhada.'
                  : 'This override requires supervisor approval. Please provide detailed clinical justification.'
                : language === 'pt'
                  ? 'Por favor, fornica justificativa para prosseguir apesar dos alertas.'
                  : 'Please provide justification for proceeding despite the alerts.'}
            </p>

            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={
                language === 'pt'
                  ? 'Descreva a justificativa clinica para este override (minimo 10 caracteres)...'
                  : 'Describe the clinical justification for this override (minimum 10 characters)...'
              }
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {language === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleOverride}
                disabled={justification.length < 10 || overrideLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {overrideLoading
                  ? language === 'pt'
                    ? 'Enviando...'
                    : 'Submitting...'
                  : language === 'pt'
                    ? 'Confirmar Override'
                    : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACT INDICATOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface TrafficLightIndicatorProps {
  color: TrafficLightColor;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function TrafficLightIndicator({ color, size = 'md', pulse = false }: TrafficLightIndicatorProps) {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const colorStyle = COLOR_STYLES[color];

  return (
    <div
      className={`${sizes[size]} rounded-full ${colorStyle.bg} ${pulse ? 'animate-pulse' : ''} ${colorStyle.glow} shadow-md`}
      title={color}
    />
  );
}
