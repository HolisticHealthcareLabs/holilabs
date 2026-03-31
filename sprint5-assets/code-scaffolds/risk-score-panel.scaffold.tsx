'use client';

/**
 * RiskScorePanel — Patient risk score display (compact + expanded modes)
 *
 * Reference for src/components/clinical/RiskScorePanel.tsx
 *
 * Shows SCORE2, FINDRISC, PHQ-9, GAD-7 scores with severity badges.
 * Compact: single row of score badges (Clinical Command right panel).
 * Expanded: full cards with trend chart and "Administer Screening" CTA.
 *
 * DESIGN TOKENS: zero raw Tailwind
 * ACCESSIBILITY: score + icon + text label (never number alone)
 *
 * @see sprint5-assets/screening-instruments.json — instrument definitions
 * @see sprint5-assets/i18n-sprint6.json — prevention.* keys
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Heart,
  Brain,
  Activity,
  Beaker,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RiskScore {
  instrumentId: string;
  score: number;
  maxScore: number;
  severity: string;
  severityColor: string;
  lastAssessed: string | null;
  interpretation: Record<string, string>;
  trend?: 'improving' | 'stable' | 'worsening'; // Compared to previous score
}

interface RiskScorePanelProps {
  patientId: string;
  mode: 'compact' | 'expanded';
  locale?: string;
}

// ─── Instrument Config ───────────────────────────────────────────────────────

const INSTRUMENT_CONFIG: Record<string, { icon: React.ElementType; label: Record<string, string>; domain: string; color: string }> = {
  score2: { icon: Heart, label: { en: 'Cardiovascular', 'pt-BR': 'Cardiovascular', es: 'Cardiovascular' }, domain: 'cardiovascular', color: 'var(--severity-severe)' },
  findrisc: { icon: Activity, label: { en: 'Diabetes Risk', 'pt-BR': 'Risco Diabetes', es: 'Riesgo Diabetes' }, domain: 'diabetes', color: 'var(--severity-moderate)' },
  phq9: { icon: Brain, label: { en: 'Depression', 'pt-BR': 'Depressão', es: 'Depresión' }, domain: 'depression', color: 'var(--severity-mild)' },
  gad7: { icon: Brain, label: { en: 'Anxiety', 'pt-BR': 'Ansiedade', es: 'Ansiedad' }, domain: 'anxiety', color: 'var(--severity-mild)' },
  framingham: { icon: Heart, label: { en: 'Framingham CV', 'pt-BR': 'Framingham CV', es: 'Framingham CV' }, domain: 'cardiovascular', color: 'var(--severity-severe)' },
};

const TrendIcon = ({ trend }: { trend?: string }) => {
  if (trend === 'improving') return <TrendingDown className="h-3 w-3 text-severity-minimal" aria-label="Improving" />;
  if (trend === 'worsening') return <TrendingUp className="h-3 w-3 text-severity-severe" aria-label="Worsening" />;
  return <Minus className="h-3 w-3 text-[var(--text-subtle)]" aria-label="Stable" />;
};

// ─── Compact Score Badge ─────────────────────────────────────────────────────

function CompactBadge({ score, config, locale }: { score: RiskScore; config: typeof INSTRUMENT_CONFIG[string]; locale: string }) {
  const Icon = config.icon;
  return (
    <div
      className="flex items-center gap-xs rounded-lg border border-[var(--border-default)] bg-surface-elevated px-sm py-xs"
      title={score.interpretation[locale] || score.interpretation.en}
      role="status"
      aria-label={`${config.label[locale] || config.label.en}: ${score.score}/${score.maxScore} — ${score.severity}`}
    >
      <Icon className="h-4 w-4" style={{ color: config.color }} aria-hidden="true" />
      <span className="text-caption font-semibold text-[var(--text-foreground)]">
        {score.score}
      </span>
      <span className={`text-caption font-bold text-${score.severityColor.replace('clinical-', 'severity-')}`}>
        {score.severity}
      </span>
      <TrendIcon trend={score.trend} />
    </div>
  );
}

// ─── Expanded Score Card ─────────────────────────────────────────────────────

function ExpandedCard({
  score,
  config,
  locale,
  patientId,
}: {
  score: RiskScore;
  config: typeof INSTRUMENT_CONFIG[string];
  locale: string;
  patientId: string;
}) {
  const t = useTranslations('prevention');
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl border border-[var(--border-default)] bg-surface-elevated px-md py-md"
      role="region"
      aria-label={`${config.label[locale] || config.label.en} risk score`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-sm">
        <div className="flex items-center gap-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${config.color}15` }}>
            <Icon className="h-4 w-4" style={{ color: config.color }} aria-hidden="true" />
          </div>
          <div>
            <p className="text-body font-semibold text-[var(--text-foreground)]">
              {config.label[locale] || config.label.en}
            </p>
            <p className="text-caption text-[var(--text-subtle)]">
              {score.lastAssessed
                ? `${t('lastScreening')}: ${new Date(score.lastAssessed).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es' : 'en-US')}`
                : t('lastScreening') + ': —'}
            </p>
          </div>
        </div>
        <TrendIcon trend={score.trend} />
      </div>

      {/* Score Display — number + severity badge (COLOR + TEXT, never number alone) */}
      <div className="flex items-baseline gap-sm mb-sm">
        <span className="text-display font-bold text-[var(--text-foreground)]" aria-hidden="true">
          {score.score}
        </span>
        <span className="text-body text-[var(--text-subtle)]">/ {score.maxScore}</span>
        <span
          className={`ml-auto rounded-full px-sm py-xs text-caption font-bold text-${score.severityColor.replace('clinical-', 'severity-')}`}
          style={{ backgroundColor: `${config.color}15` }}
        >
          {score.severity}
        </span>
      </div>

      {/* Interpretation */}
      <p className="text-body text-[var(--text-muted)] mb-md">
        {score.interpretation[locale] || score.interpretation.en}
      </p>

      {/* TODO: holilabsv2 — trend chart (last 3 scores over time) */}
      {/* <TrendChart data={score.history} /> */}

      {/* CTA: Administer Screening */}
      <a
        href={`/dashboard/prevencao/rastreamento?instrumentId=${score.instrumentId}&patientId=${patientId}`}
        className="inline-flex items-center gap-xs text-body font-semibold text-[var(--text-foreground)] hover:text-severity-minimal min-h-[var(--touch-md)]"
      >
        <Beaker className="h-4 w-4" aria-hidden="true" />
        {t('startScreening')}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RiskScorePanel({ patientId, mode, locale = 'pt-BR' }: RiskScorePanelProps) {
  const t = useTranslations('prevention');
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch risk scores ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchScores() {
      setLoading(true);
      try {
        const res = await fetch(`/api/clinical/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Access-Reason': 'TREATMENT' },
          body: JSON.stringify({ patientId }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setScores(data.riskScores || []);
      } catch {
        // TODO: holilabsv2 — show error state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchScores();
    return () => { cancelled = true; };
  }, [patientId]);

  // ── Loading Skeleton ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={mode === 'compact' ? 'flex gap-xs' : 'space-y-sm'} aria-busy="true" aria-label="Loading risk scores">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`animate-pulse rounded-lg bg-[var(--surface-secondary)] ${
              mode === 'compact' ? 'h-8 w-24' : 'h-32 w-full'
            }`}
          />
        ))}
      </div>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────

  if (scores.length === 0) {
    return (
      <div className="text-center py-lg" role="status">
        <Beaker className="h-10 w-10 text-[var(--text-subtle)] mx-auto mb-sm" aria-hidden="true" />
        <p className="text-body text-[var(--text-muted)]">
          {locale === 'pt-BR'
            ? 'Nenhuma avaliação de risco ainda.'
            : locale === 'es'
              ? 'Sin evaluaciones de riesgo aún.'
              : 'No risk assessments yet.'}
        </p>
        <a
          href={`/dashboard/prevencao/rastreamento?patientId=${patientId}`}
          className="inline-flex items-center gap-xs mt-sm text-body font-semibold text-severity-minimal min-h-[var(--touch-md)]"
        >
          {t('startScreening')}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (mode === 'compact') {
    return (
      <div className="flex flex-wrap gap-xs" role="list" aria-label="Patient risk scores">
        {scores.map((score) => {
          const config = INSTRUMENT_CONFIG[score.instrumentId];
          if (!config) return null;
          return (
            <div key={score.instrumentId} role="listitem">
              <CompactBadge score={score} config={config} locale={locale} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-sm" role="list" aria-label="Patient risk scores (detailed)">
      {scores.map((score) => {
        const config = INSTRUMENT_CONFIG[score.instrumentId];
        if (!config) return null;
        return (
          <div key={score.instrumentId} role="listitem">
            <ExpandedCard score={score} config={config} locale={locale} patientId={patientId} />
          </div>
        );
      })}
    </div>
  );
}
