'use client';

/**
 * AlertBanner — Real-time clinical alert display
 *
 * Reference for src/components/clinical/AlertBanner.tsx
 *
 * Subscribes to SSE clinical_alert events. Sticky banner on clinical pages.
 * Critical alerts require acknowledgment checkbox before dismissal.
 *
 * ACCESSIBILITY: role="alert", aria-live, color + icon + text (never color alone)
 * DESIGN TOKENS: zero raw Tailwind — all from design-token-migration.json
 *
 * @see sprint5-assets/code-scaffolds/sse-client-hook.scaffold.ts
 * @see sprint5-assets/clinical-decision-rules.json
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Zap,
  Info,
  X,
  ExternalLink,
  CheckSquare,
  Square,
} from 'lucide-react';

// TODO: holilabsv2 — import from actual hook location
// import { useEventStream } from '@/hooks/useEventStream';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClinicalAlert {
  id: string;
  ruleId: string;
  severity: 'minimal' | 'mild' | 'moderate' | 'severe' | 'critical';
  summary: string;
  recommendation: Record<string, string>;
  sourceAuthority: string;
  citationUrl: string;
  humanReviewRequired: boolean;
  triggeredBy: string;
}

// ─── Severity Config ─────────────────────────────────────────────────────────
// Uses design tokens from design-token-migration.json — NEVER raw Tailwind colors

interface SeverityConfig {
  icon: React.ElementType;
  textClass: string;
  bgClass: string;
  borderClass: string;
  label: Record<string, string>;
  ariaLive: 'assertive' | 'polite';
  requiresAcknowledgment: boolean;
}

const SEVERITY_CONFIG: Record<string, SeverityConfig> = {
  critical: {
    icon: Zap,
    textClass: 'text-severity-critical',
    bgClass: 'bg-severity-critical/10',
    borderClass: 'border-severity-critical/30',
    label: { en: 'EMERGENCY', 'pt-BR': 'EMERGÊNCIA', es: 'EMERGENCIA' },
    ariaLive: 'assertive',
    requiresAcknowledgment: true,
  },
  severe: {
    icon: AlertOctagon,
    textClass: 'text-severity-severe',
    bgClass: 'bg-severity-severe/10',
    borderClass: 'border-severity-severe/30',
    label: { en: 'CRITICAL', 'pt-BR': 'CRÍTICO', es: 'CRÍTICO' },
    ariaLive: 'assertive',
    requiresAcknowledgment: true,
  },
  moderate: {
    icon: AlertTriangle,
    textClass: 'text-severity-moderate',
    bgClass: 'bg-severity-moderate/10',
    borderClass: 'border-severity-moderate/30',
    label: { en: 'Attention', 'pt-BR': 'Atenção', es: 'Atención' },
    ariaLive: 'polite',
    requiresAcknowledgment: false,
  },
  mild: {
    icon: Info,
    textClass: 'text-severity-mild',
    bgClass: 'bg-severity-mild/10',
    borderClass: 'border-severity-mild/30',
    label: { en: 'Caution', 'pt-BR': 'Cautela', es: 'Precaución' },
    ariaLive: 'polite',
    requiresAcknowledgment: false,
  },
  minimal: {
    icon: CheckCircle2,
    textClass: 'text-severity-minimal',
    bgClass: 'bg-severity-minimal/10',
    borderClass: 'border-severity-minimal/30',
    label: { en: 'Normal', 'pt-BR': 'Normal', es: 'Normal' },
    ariaLive: 'polite',
    requiresAcknowledgment: false,
  },
};

// ─── Reduced Motion Hook ─────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefersReduced;
}

// ─── Single Alert Row ────────────────────────────────────────────────────────

function AlertRow({
  alert,
  onDismiss,
  locale,
}: {
  alert: ClinicalAlert;
  onDismiss: (alertId: string) => void;
  locale: string;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.moderate;
  const Icon = config.icon;

  const canDismiss = config.requiresAcknowledgment ? acknowledged : true;

  return (
    <div
      className={`flex items-start gap-sm px-md py-sm rounded-lg border ${config.bgClass} ${config.borderClass}`}
      role="alert"
      aria-live={config.ariaLive}
      data-testid={`alert-${alert.ruleId}`}
    >
      {/* Severity: ICON + TEXT LABEL (never color alone — WCAG) */}
      <div className="flex items-center gap-xs shrink-0 mt-px">
        <Icon className={`h-5 w-5 ${config.textClass}`} aria-hidden="true" />
        <span className={`text-caption font-bold uppercase tracking-wider ${config.textClass}`}>
          {config.label[locale] || config.label.en}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-[var(--text-foreground)]">
          {alert.summary}
        </p>
        <p className="text-body text-[var(--text-muted)] mt-xs">
          {alert.recommendation[locale] || alert.recommendation.en}
        </p>
        <div className="flex items-center gap-md mt-xs">
          <a
            href={alert.citationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-xs text-caption text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
            aria-label={`Evidence source: ${alert.sourceAuthority}`}
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {alert.sourceAuthority}
          </a>
          <span className="text-caption text-[var(--text-subtle)]">
            Triggered by: {alert.triggeredBy}
          </span>
        </div>

        {/* Critical alerts: require acknowledgment before dismiss */}
        {config.requiresAcknowledgment && (
          <label className="flex items-center gap-xs mt-sm cursor-pointer min-h-[var(--touch-md)]">
            <button
              onClick={() => setAcknowledged(!acknowledged)}
              className="shrink-0"
              aria-label={acknowledged ? 'Acknowledged' : 'Click to acknowledge you have reviewed this alert'}
            >
              {acknowledged
                ? <CheckSquare className={`h-5 w-5 ${config.textClass}`} />
                : <Square className="h-5 w-5 text-[var(--text-subtle)]" />
              }
            </button>
            <span className="text-body-dense text-[var(--text-muted)]">
              {locale === 'pt-BR' ? 'Revisei este alerta' : locale === 'es' ? 'He revisado esta alerta' : 'I have reviewed this alert'}
            </span>
          </label>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => canDismiss && onDismiss(alert.id)}
        disabled={!canDismiss}
        className="shrink-0 min-h-[var(--touch-sm)] min-w-[var(--touch-sm)] flex items-center justify-center rounded-md hover:bg-[var(--surface-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label={canDismiss ? 'Dismiss alert' : 'Acknowledge alert before dismissing'}
      >
        <X className="h-4 w-4 text-[var(--text-subtle)]" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Main AlertBanner Component ──────────────────────────────────────────────

export default function AlertBanner({
  alerts: initialAlerts = [],
  locale = 'pt-BR',
}: {
  alerts?: ClinicalAlert[];
  locale?: string;
}) {
  const t = useTranslations('copilot');
  const prefersReducedMotion = usePrefersReducedMotion();
  const [alerts, setAlerts] = useState<ClinicalAlert[]>(initialAlerts);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // TODO: holilabsv2 — subscribe to SSE events
  // const { lastEvent } = useEventStream({ eventTypes: ['clinical_alert'] });
  // useEffect(() => {
  //   if (lastEvent?.type === 'clinical_alert') {
  //     setAlerts((prev) => [lastEvent.data as ClinicalAlert, ...prev]);
  //   }
  // }, [lastEvent]);

  const handleDismiss = useCallback((alertId: string) => {
    setDismissed((prev) => new Set(prev).add(alertId));
  }, []);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div
      className="sticky top-0 z-30 space-y-xs px-md py-sm bg-surface-elevated border-b border-[var(--border-default)]"
      role="region"
      aria-label={locale === 'pt-BR' ? 'Alertas clínicos' : locale === 'es' ? 'Alertas clínicas' : 'Clinical alerts'}
      data-testid="alert-banner"
      style={prefersReducedMotion ? {} : { animation: 'slideDown 0.3s ease-out' }}
    >
      {visibleAlerts.map((alert) => (
        <AlertRow
          key={alert.id}
          alert={alert}
          onDismiss={handleDismiss}
          locale={locale}
        />
      ))}
    </div>
  );
}
