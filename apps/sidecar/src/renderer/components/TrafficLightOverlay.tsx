/**
 * Traffic Light Overlay Component
 *
 * Displays the current Traffic Light status with signals.
 * Part of the Cortex Assurance desktop overlay.
 *
 * @module sidecar/renderer/components/TrafficLightOverlay
 */

import React from 'react';
import type { TrafficLightResult, TrafficLightSignal } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TrafficLightOverlayProps {
  result: TrafficLightResult | null;
  isEvaluating: boolean;
  onEvaluate: () => void;
  onApplyCorrection: (text: string) => void;
  language: 'en' | 'pt';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations = {
  en: {
    evaluate: 'Evaluate Now',
    evaluating: 'Evaluating...',
    noEvaluation: 'No evaluation yet',
    tapToEvaluate: 'Tap to evaluate current screen',
    signals: 'Signals',
    noSignals: 'All clear - no issues detected',
    glosaRisk: 'Glosa Risk',
    overrideRequired: 'Override Required',
    overrideTypes: {
      justification: 'Justification required',
      supervisor: 'Supervisor approval required',
      blocked: 'Cannot be overridden',
    },
    colors: {
      RED: 'Blocked',
      YELLOW: 'Warning',
      GREEN: 'Clear',
    },
  },
  pt: {
    evaluate: 'Avaliar Agora',
    evaluating: 'Avaliando...',
    noEvaluation: 'Nenhuma avaliação ainda',
    tapToEvaluate: 'Toque para avaliar a tela atual',
    signals: 'Alertas',
    noSignals: 'Tudo certo - nenhum problema detectado',
    glosaRisk: 'Risco de Glosa',
    overrideRequired: 'Sobreposição Necessária',
    overrideTypes: {
      justification: 'Justificativa necessária',
      supervisor: 'Aprovação de supervisor necessária',
      blocked: 'Não pode ser sobreposto',
    },
    colors: {
      RED: 'Bloqueado',
      YELLOW: 'Atenção',
      GREEN: 'Liberado',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const TrafficLightOverlay: React.FC<TrafficLightOverlayProps> = ({
  result,
  isEvaluating,
  onEvaluate,
  onApplyCorrection,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="traffic-light-overlay">
      {/* Traffic Light Display */}
      <div className="traffic-light-display">
        <TrafficLightVisual
          color={result?.color || 'GREEN'}
          isEvaluating={isEvaluating}
          hasResult={result !== null}
        />
        <div className="traffic-light-info">
          <h2 className={`status-text color-${(result?.color || 'GREEN').toLowerCase()}`}>
            {result ? t.colors[result.color] : t.noEvaluation}
          </h2>
          {!result && <p className="hint-text">{t.tapToEvaluate}</p>}
        </div>
      </div>

      {/* Evaluate Button */}
      <button
        className={`evaluate-button ${isEvaluating ? 'evaluating' : ''}`}
        onClick={onEvaluate}
        disabled={isEvaluating}
      >
        {isEvaluating ? t.evaluating : t.evaluate}
      </button>

      {/* Signals List */}
      {result && result.signals.length > 0 && (
        <div className="signals-section">
          <h3>{t.signals}</h3>
          <div className="signals-list">
            {result.signals.map((signal, idx) => (
              <SignalCard
                key={`${signal.ruleId}-${idx}`}
                signal={signal}
                language={language}
                onApplyCorrection={onApplyCorrection}
              />
            ))}
          </div>
        </div>
      )}

      {/* No signals message */}
      {result && result.signals.length === 0 && (
        <div className="no-signals">
          <span className="check-icon">✓</span>
          <p>{t.noSignals}</p>
        </div>
      )}

      {/* Glosa Risk */}
      {result?.totalGlosaRisk && (
        <div className="glosa-risk-card">
          <h4>{t.glosaRisk}</h4>
          <div className="glosa-amount">
            R$ {result.totalGlosaRisk.totalAmountAtRisk.toLocaleString('pt-BR')}
          </div>
          <div className="glosa-probability">
            {result.totalGlosaRisk.probability}%{' '}
            {language === 'pt' ? 'probabilidade' : 'probability'}
          </div>
        </div>
      )}

      {/* Override Requirements */}
      {result?.overrideRequires && result.overrideRequires !== 'blocked' && (
        <div className={`override-info override-${result.overrideRequires}`}>
          <span className="override-icon">⚠️</span>
          <span>{t.overrideTypes[result.overrideRequires]}</span>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface TrafficLightVisualProps {
  color: 'RED' | 'YELLOW' | 'GREEN';
  isEvaluating: boolean;
  hasResult: boolean;
}

const TrafficLightVisual: React.FC<TrafficLightVisualProps> = ({
  color,
  isEvaluating,
  hasResult,
}) => {
  return (
    <div className={`traffic-light-visual ${isEvaluating ? 'evaluating' : ''}`}>
      <div className="light-housing">
        <div className={`light red ${color === 'RED' && hasResult ? 'active' : ''}`} />
        <div className={`light yellow ${color === 'YELLOW' && hasResult ? 'active' : ''}`} />
        <div className={`light green ${color === 'GREEN' && hasResult ? 'active' : ''}`} />
      </div>
    </div>
  );
};

interface SignalCardProps {
  signal: TrafficLightSignal;
  language: 'en' | 'pt';
  onApplyCorrection: (text: string) => void;
}

const SignalCard: React.FC<SignalCardProps> = ({ signal, language, onApplyCorrection }) => {
  const message = language === 'pt' ? signal.messagePortuguese : signal.message;
  const colorIcon = signal.color === 'RED' ? '🔴' : signal.color === 'YELLOW' ? '🟡' : '🟢';
  const categoryLabels = {
    CLINICAL: language === 'pt' ? 'Clínico' : 'Clinical',
    ADMINISTRATIVE: language === 'pt' ? 'Administrativo' : 'Administrative',
    BILLING: language === 'pt' ? 'Faturamento' : 'Billing',
  };

  return (
    <div className={`signal-card signal-${signal.color.toLowerCase()}`}>
      <div className="signal-header">
        <span className="signal-icon">{colorIcon}</span>
        <span className="signal-name">{signal.ruleName}</span>
        <span className="signal-category">{categoryLabels[signal.category]}</span>
      </div>
      <p className="signal-message">{message}</p>
      {signal.regulatoryReference && (
        <div className="signal-reference">
          <span className="reference-icon">📋</span>
          <span>{signal.regulatoryReference}</span>
        </div>
      )}
      {signal.suggestedCorrection && (
        <div className="signal-correction">
          <span className="correction-icon">💡</span>
          <span>{signal.suggestedCorrection}</span>
          <button
            className="apply-fix-button"
            onClick={() => onApplyCorrection(signal.suggestedCorrection!)}
            title={language === 'pt' ? 'Aplicar correção' : 'Apply fix'}
          >
            {language === 'pt' ? 'Aplicar' : 'Apply'}
          </button>
        </div>
      )}
      {signal.estimatedGlosaRisk && (
        <div className="signal-glosa">
          <span className="glosa-icon">💰</span>
          <span>
            R$ {signal.estimatedGlosaRisk.estimatedAmount.toLocaleString('pt-BR')}
            {signal.estimatedGlosaRisk.denialCode && ` (${signal.estimatedGlosaRisk.denialCode})`}
          </span>
        </div>
      )}
    </div>
  );
};

export default TrafficLightOverlay;
