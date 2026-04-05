'use client';

/**
 * Health Metrics Detail Page — Time-series charts for patient vitals
 *
 * Charts for: weight, blood pressure, heart rate, blood glucose, HbA1c.
 * Time range selector: 1W, 1M, 3M, 6M, 1Y.
 * Each metric: current value, trend arrow, normal range band.
 *
 * ELENA: display BOTH pathological and functional ranges for every biomarker.
 * ELENA: if outside pathological range → amber/red warning with "Consult your doctor".
 *
 * Design tokens, i18n, 44px touch targets, reduced motion support.
 * Mobile: stack charts vertically.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/* ── Types ───────────────────────────────────────────────────── */

interface HealthMetric {
  id: string;
  metricType: string;
  value: number;
  unit: string;
  notes: string | null;
  recordedAt: string;
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

interface MetricConfig {
  key: string;
  icon: string;
  unit: string;
  pathologicalRange: { min: number; max: number };
  functionalRange: { min: number; max: number };
  apiType: string;
}

/* ── Metric Registry (ELENA: dual ranges) ────────────────────── */

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'weight',
    icon: '⚖️',
    unit: 'kg',
    pathologicalRange: { min: 40, max: 150 },
    functionalRange: { min: 55, max: 90 },
    apiType: 'WEIGHT',
  },
  {
    key: 'bloodPressure',
    icon: '❤️',
    unit: 'mmHg',
    pathologicalRange: { min: 70, max: 180 },
    functionalRange: { min: 90, max: 130 },
    apiType: 'BLOOD_PRESSURE',
  },
  {
    key: 'heartRate',
    icon: '💓',
    unit: 'bpm',
    pathologicalRange: { min: 40, max: 150 },
    functionalRange: { min: 60, max: 100 },
    apiType: 'HEART_RATE',
  },
  {
    key: 'glucose',
    icon: '🩸',
    unit: 'mg/dL',
    pathologicalRange: { min: 50, max: 250 },
    functionalRange: { min: 70, max: 100 },
    apiType: 'GLUCOSE',
  },
  {
    key: 'hba1c',
    icon: '🔬',
    unit: '%',
    pathologicalRange: { min: 3.0, max: 10.0 },
    functionalRange: { min: 4.0, max: 5.6 },
    apiType: 'OTHER',
  },
];

/* ── Time range → days mapping ───────────────────────────────── */

const RANGE_DAYS: Record<TimeRange, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

/* ── Trend calculation ───────────────────────────────────────── */

function getTrend(data: HealthMetric[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable';
  const sorted = [...data].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const latest = sorted[sorted.length - 1].value;
  const prev = sorted[sorted.length - 2].value;
  const pctChange = ((latest - prev) / prev) * 100;
  if (Math.abs(pctChange) < 2) return 'stable';
  return pctChange > 0 ? 'up' : 'down';
}

const TREND_ICONS: Record<string, { symbol: string; color: string }> = {
  up: { symbol: '↑', color: 'var(--severity-moderate)' },
  down: { symbol: '↓', color: 'var(--severity-minimal)' },
  stable: { symbol: '→', color: 'var(--text-tertiary)' },
};

/* ── Simple sparkline (SVG, no chart library) ────────────────── */

function Sparkline({
  data,
  width = 320,
  height = 120,
  functionalRange,
  pathologicalRange,
  unit,
}: {
  data: HealthMetric[];
  width?: number;
  height?: number;
  functionalRange: { min: number; max: number };
  pathologicalRange: { min: number; max: number };
  unit: string;
}) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const values = sorted.map((d) => d.value);
  const allMin = Math.min(...values, pathologicalRange.min);
  const allMax = Math.max(...values, pathologicalRange.max);
  const range = allMax - allMin || 1;

  const padX = 4;
  const padY = 10;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const toX = (i: number) => padX + (i / Math.max(sorted.length - 1, 1)) * chartW;
  const toY = (v: number) => padY + chartH - ((v - allMin) / range) * chartH;

  const linePath = sorted.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.value)}`).join(' ');

  const funcMinY = toY(functionalRange.min);
  const funcMaxY = toY(functionalRange.max);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Health metric sparkline chart">
      {/* ELENA: Functional range band (green) */}
      <rect
        x={padX}
        y={funcMaxY}
        width={chartW}
        height={Math.max(funcMinY - funcMaxY, 0)}
        fill="color-mix(in srgb, var(--severity-minimal) 8%, transparent)"
        rx="4"
      />

      {/* Functional range boundary lines */}
      <line x1={padX} y1={funcMaxY} x2={padX + chartW} y2={funcMaxY} stroke="var(--severity-minimal)" strokeWidth="0.5" strokeDasharray="4 2" opacity="0.5" />
      <line x1={padX} y1={funcMinY} x2={padX + chartW} y2={funcMinY} stroke="var(--severity-minimal)" strokeWidth="0.5" strokeDasharray="4 2" opacity="0.5" />

      {/* Data line */}
      <path d={linePath} fill="none" stroke="var(--channel-sms)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {sorted.map((d, i) => {
        const isOutside = d.value < pathologicalRange.min || d.value > pathologicalRange.max;
        const isWarning = d.value < functionalRange.min || d.value > functionalRange.max;
        return (
          <circle
            key={d.id}
            cx={toX(i)}
            cy={toY(d.value)}
            r={isOutside ? 5 : isWarning ? 4 : 3}
            fill={isOutside ? 'var(--severity-critical)' : isWarning ? 'var(--severity-moderate)' : 'var(--channel-sms)'}
            stroke="var(--surface-primary)"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function HealthMetricsDetailPage() {
  const router = useRouter();
  const t = useTranslations('portal.healthMetrics');
  const prefersReduced = usePrefersReducedMotion();

  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [metricsData, setMetricsData] = useState<Record<string, HealthMetric[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  // Fetch metrics for the selected time range
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - RANGE_DAYS[timeRange]);

    try {
      const res = await fetch(
        `/api/portal/health-metrics?startDate=${startDate.toISOString()}&limit=500`
      );
      const data = await res.json();
      if (data.success && data.data?.metricsByType) {
        setMetricsData(data.data.metricsByType);
      }
    } catch { /* non-blocking */ }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Build metric cards
  const metricCards = useMemo(() => {
    return METRIC_CONFIGS.map((cfg) => {
      const data = metricsData[cfg.apiType] ?? [];
      const sorted = [...data].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      const latest = sorted[0] ?? null;
      const trend = getTrend(data);
      const trendCfg = TREND_ICONS[trend];

      const isOutsidePathological = latest
        ? latest.value < cfg.pathologicalRange.min || latest.value > cfg.pathologicalRange.max
        : false;
      const isOutsideFunctional = latest
        ? latest.value < cfg.functionalRange.min || latest.value > cfg.functionalRange.max
        : false;

      return { cfg, data: sorted, latest, trend, trendCfg, isOutsidePathological, isOutsideFunctional };
    });
  }, [metricsData]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-secondary)' }}>
      <div className="max-w-5xl mx-auto" style={{ padding: 'var(--space-lg) var(--space-md)' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <button
            onClick={() => router.push('/portal/dashboard/health')}
            style={{
              display: 'flex', alignItems: 'center', color: 'var(--text-secondary)',
              cursor: 'pointer', border: 'none', backgroundColor: 'transparent',
              fontSize: 'var(--text-body)', marginBottom: 'var(--space-md)',
              minHeight: 'var(--touch-sm)',
            }}
          >
            ← {t('backToHealth')}
          </button>
          <h1
            style={{
              fontSize: 'var(--text-heading-lg)', fontWeight: 700,
              color: 'var(--text-primary)', marginBottom: 'var(--space-xs)',
            }}
          >
            {t('title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>
            {t('subtitle')}
          </p>
        </div>

        {/* Time range selector */}
        <div
          className="flex gap-1"
          style={{
            marginBottom: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-default)',
            padding: '4px',
            width: 'fit-content',
          }}
        >
          {(['1W', '1M', '3M', '6M', '1Y'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className="font-semibold transition-all"
              style={{
                minHeight: 'var(--touch-sm)',
                padding: '0 var(--space-md)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-body)',
                background: timeRange === r ? 'var(--text-primary)' : 'transparent',
                color: timeRange === r ? 'var(--surface-primary)' : 'var(--text-tertiary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t(`range_${r}`)}
            </button>
          ))}
        </div>

        {/* Metric cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  height: '200px',
                  borderRadius: 'var(--radius-xl)',
                  background: 'var(--surface-primary)',
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {metricCards.map(({ cfg, data, latest, trend, trendCfg, isOutsidePathological, isOutsideFunctional }) => {
              const isExpanded = activeMetric === cfg.key;
              return (
                <div
                  key={cfg.key}
                  style={{
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--surface-primary)',
                    border: isOutsidePathological
                      ? '1px solid var(--severity-critical)'
                      : isOutsideFunctional
                        ? '1px solid var(--severity-moderate)'
                        : '1px solid var(--border-default)',
                    boxShadow: 'var(--token-shadow-sm)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Card header — always visible */}
                  <button
                    onClick={() => setActiveMetric(isExpanded ? null : cfg.key)}
                    className="w-full text-left flex items-center justify-between"
                    style={{
                      padding: 'var(--space-md) var(--space-lg)',
                      minHeight: 'var(--touch-sm)',
                      cursor: 'pointer',
                      border: 'none',
                      background: 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '24px' }} aria-hidden="true">{cfg.icon}</span>
                      <div>
                        <span
                          className="font-semibold block"
                          style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}
                        >
                          {t(cfg.key)}
                        </span>
                        {latest && (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)' }}>
                            {new Date(latest.recordedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {latest ? (
                        <>
                          <div className="text-right">
                            <span
                              className="font-bold"
                              style={{
                                fontSize: 'var(--text-heading)',
                                color: isOutsidePathological
                                  ? 'var(--severity-critical)'
                                  : isOutsideFunctional
                                    ? 'var(--severity-moderate)'
                                    : 'var(--text-primary)',
                              }}
                            >
                              {latest.value}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)', marginLeft: '4px' }}>
                              {cfg.unit}
                            </span>
                          </div>
                          <span style={{ color: trendCfg.color, fontSize: '18px', fontWeight: 700 }}>
                            {trendCfg.symbol}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-body)' }}>
                          {t('noData')}
                        </span>
                      )}
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{
                          color: 'var(--text-tertiary)',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: prefersReduced ? 'none' : 'transform 0.15s',
                        }}
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded chart + details */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-md) var(--space-lg)' }}>
                      {/* ELENA warning if outside pathological range */}
                      {isOutsidePathological && (
                        <div
                          className="flex items-center gap-2"
                          style={{
                            padding: 'var(--space-sm) var(--space-md)',
                            borderRadius: 'var(--radius-md)',
                            background: 'color-mix(in srgb, var(--severity-critical) 10%, transparent)',
                            color: 'var(--severity-critical)',
                            fontSize: 'var(--text-body)',
                            marginBottom: 'var(--space-md)',
                            fontWeight: 500,
                          }}
                        >
                          ⚠️ {t('outsideRange')}
                        </div>
                      )}

                      {isOutsideFunctional && !isOutsidePathological && (
                        <div
                          className="flex items-center gap-2"
                          style={{
                            padding: 'var(--space-sm) var(--space-md)',
                            borderRadius: 'var(--radius-md)',
                            background: 'color-mix(in srgb, var(--severity-moderate) 10%, transparent)',
                            color: 'var(--severity-moderate)',
                            fontSize: 'var(--text-body)',
                            marginBottom: 'var(--space-md)',
                            fontWeight: 500,
                          }}
                        >
                          ⚠️ {t('outsideFunctional')}
                        </div>
                      )}

                      {/* Sparkline chart */}
                      {data.length > 0 ? (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                          <Sparkline
                            data={data}
                            width={480}
                            height={140}
                            functionalRange={cfg.functionalRange}
                            pathologicalRange={cfg.pathologicalRange}
                            unit={cfg.unit}
                          />
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-center"
                          style={{
                            height: '120px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--surface-secondary)',
                            color: 'var(--text-tertiary)',
                            fontSize: 'var(--text-body)',
                          }}
                        >
                          {t('noDataForRange')}
                        </div>
                      )}

                      {/* ELENA: Dual range legend */}
                      <div
                        className="flex flex-wrap gap-4"
                        style={{
                          padding: 'var(--space-sm) 0',
                          borderTop: '1px solid var(--border-subtle)',
                          marginTop: 'var(--space-sm)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              width: '12px', height: '12px', borderRadius: '2px',
                              background: 'color-mix(in srgb, var(--severity-minimal) 20%, transparent)',
                              border: '1px solid var(--severity-minimal)',
                              display: 'inline-block',
                            }}
                          />
                          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                            {t('functionalRange')}: {cfg.functionalRange.min}–{cfg.functionalRange.max} {cfg.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              width: '12px', height: '12px', borderRadius: '2px',
                              background: 'transparent',
                              border: '1px dashed var(--text-tertiary)',
                              display: 'inline-block',
                            }}
                          />
                          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                            {t('pathologicalRange')}: {cfg.pathologicalRange.min}–{cfg.pathologicalRange.max} {cfg.unit}
                          </span>
                        </div>
                      </div>

                      {/* Recent readings table */}
                      {data.length > 0 && (
                        <div style={{ marginTop: 'var(--space-md)' }}>
                          <span
                            className="font-semibold block"
                            style={{
                              fontSize: 'var(--text-caption)',
                              color: 'var(--text-secondary)',
                              marginBottom: 'var(--space-xs)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {t('recentReadings')}
                          </span>
                          <div className="space-y-1">
                            {data.slice(0, 5).map((d) => {
                              const outPath = d.value < cfg.pathologicalRange.min || d.value > cfg.pathologicalRange.max;
                              const outFunc = d.value < cfg.functionalRange.min || d.value > cfg.functionalRange.max;
                              return (
                                <div
                                  key={d.id}
                                  className="flex items-center justify-between"
                                  style={{
                                    padding: 'var(--space-xs) var(--space-sm)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: outPath
                                      ? 'color-mix(in srgb, var(--severity-critical) 6%, transparent)'
                                      : outFunc
                                        ? 'color-mix(in srgb, var(--severity-moderate) 6%, transparent)'
                                        : 'var(--surface-secondary)',
                                  }}
                                >
                                  <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)', fontVariantNumeric: 'tabular-nums' }}>
                                    {new Date(d.recordedAt).toLocaleDateString()}
                                  </span>
                                  <span
                                    className="font-semibold"
                                    style={{
                                      color: outPath ? 'var(--severity-critical)' : outFunc ? 'var(--severity-moderate)' : 'var(--text-primary)',
                                      fontSize: 'var(--text-body)',
                                      fontVariantNumeric: 'tabular-nums',
                                    }}
                                  >
                                    {d.value} {cfg.unit}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
