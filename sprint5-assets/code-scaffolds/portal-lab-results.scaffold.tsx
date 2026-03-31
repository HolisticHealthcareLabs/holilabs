'use client';

/**
 * Portal Lab Results — Patient-facing lab results with interpretation
 *
 * Reference for src/app/portal/dashboard/lab-results/page.tsx
 *
 * Features: color-coded interpretation, sparkline trends, category grouping,
 * abnormal-only filter, reference range bar, responsive single-column mobile.
 *
 * ACCESSIBILITY: role="listitem", severity announced via aria-label, 44px touch targets
 * DESIGN TOKENS: zero raw Tailwind — severity tokens for interpretation
 *
 * @see sprint5-assets/billing-code-mappings.json — LOINC codes
 * @see sprint5-assets/i18n-sprint6.json — common.* keys
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LabResult {
  id: string;
  testName: string;
  loincCode: string;
  category: string; // Hematology, Chemistry, Microbiology, etc.
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  status: 'normal' | 'low' | 'high' | 'critical';
  collectedAt: string;
  orderingDoctor: string;
}

type DateRange = '30d' | '90d' | '1y' | 'all';

// ─── Interpretation Logic ────────────────────────────────────────────────────

function interpretResult(value: number, refMin: number, refMax: number): { status: LabResult['status']; icon: React.ElementType; textClass: string; ariaLabel: string } {
  if (value > refMax * 1.5) return { status: 'critical', icon: AlertTriangle, textClass: 'text-severity-critical', ariaLabel: 'Critical high value' };
  if (value > refMax) return { status: 'high', icon: ArrowUp, textClass: 'text-severity-severe', ariaLabel: 'Above normal range' };
  if (value < refMin) return { status: 'low', icon: ArrowDown, textClass: 'text-severity-moderate', ariaLabel: 'Below normal range' };
  return { status: 'normal', icon: CheckCircle2, textClass: 'text-severity-minimal', ariaLabel: 'Within normal range' };
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────

function Sparkline({ values, refMin, refMax, reducedMotion }: { values: number[]; refMin: number; refMax: number; reducedMotion: boolean }) {
  if (values.length < 3) return null;

  const w = 120;
  const h = 40;
  const pad = 4;
  const dataMin = Math.min(...values, refMin) * 0.9;
  const dataMax = Math.max(...values, refMax) * 1.1;
  const range = dataMax - dataMin || 1;

  const points = values.slice(-6).map((v, i, arr) => {
    const x = pad + ((w - 2 * pad) * i) / (arr.length - 1);
    const y = h - pad - ((v - dataMin) / range) * (h - 2 * pad);
    return `${x},${y}`;
  }).join(' ');

  const refMinY = h - pad - ((refMin - dataMin) / range) * (h - 2 * pad);
  const refMaxY = h - pad - ((refMax - dataMin) / range) * (h - 2 * pad);

  return (
    <svg width={w} height={h} className="shrink-0" role="img" aria-label={`Trend: ${values.length} values from ${values[0]} to ${values[values.length - 1]}`}>
      {/* Reference range band */}
      <rect x={pad} y={Math.min(refMinY, refMaxY)} width={w - 2 * pad} height={Math.abs(refMaxY - refMinY)} fill="var(--severity-minimal)" opacity={0.1} rx={2} />
      {/* Data line */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--text-foreground)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={reducedMotion ? {} : { strokeDasharray: '500', strokeDashoffset: '500', animation: 'draw 1s ease forwards' }}
      />
      {/* Last value dot */}
      {(() => {
        const lastParts = points.split(' ').pop()!.split(',');
        return <circle cx={parseFloat(lastParts[0])} cy={parseFloat(lastParts[1])} r={3} fill="var(--text-foreground)" />;
      })()}
    </svg>
  );
}

// ─── Reference Range Bar ─────────────────────────────────────────────────────

function ReferenceRangeBar({ value, refMin, refMax }: { value: number; refMin: number; refMax: number }) {
  const totalMin = Math.min(value, refMin) * 0.8;
  const totalMax = Math.max(value, refMax) * 1.2;
  const totalRange = totalMax - totalMin || 1;
  const leftPct = ((refMin - totalMin) / totalRange) * 100;
  const widthPct = ((refMax - refMin) / totalRange) * 100;
  const valuePct = ((value - totalMin) / totalRange) * 100;

  return (
    <div className="relative h-2 rounded-full bg-[var(--surface-secondary)] w-full" aria-hidden="true">
      {/* Normal range band */}
      <div className="absolute h-full rounded-full bg-severity-minimal/20" style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
      {/* Value marker */}
      <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-[var(--surface-primary)]"
        style={{
          left: `${Math.max(0, Math.min(valuePct, 100))}%`,
          backgroundColor: value < refMin || value > refMax ? 'var(--severity-severe)' : 'var(--severity-minimal)',
        }}
      />
    </div>
  );
}

// ─── Result Card ─────────────────────────────────────────────────────────────

function ResultCard({ result, trendValues, reducedMotion }: { result: LabResult; trendValues: number[]; reducedMotion: boolean }) {
  const interp = interpretResult(result.value, result.referenceMin, result.referenceMax);
  const Icon = interp.icon;

  return (
    <div
      className="rounded-xl border border-[var(--border-default)] bg-surface-elevated px-md py-md"
      role="listitem"
      aria-label={`${result.testName}: ${result.value} ${result.unit} — ${interp.ariaLabel}`}
    >
      <div className="flex items-start gap-md">
        {/* Status icon + value */}
        <div className="flex items-center gap-sm shrink-0">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${interp.textClass.replace('text-', 'bg-')}/10`}>
            <Icon className={`h-4 w-4 ${interp.textClass}`} aria-hidden="true" />
          </div>
          <div>
            <p className="text-heading-sm font-bold text-[var(--text-foreground)]">
              {result.value} <span className="text-body text-[var(--text-muted)]">{result.unit}</span>
            </p>
            <p className={`text-caption font-semibold ${interp.textClass}`} role="status"
              {...(interp.status === 'critical' ? { 'aria-live': 'assertive' } : {})}
            >
              {interp.status === 'normal' ? 'Normal' : interp.status === 'low' ? 'Low' : interp.status === 'high' ? 'High' : 'CRITICAL'}
            </p>
          </div>
        </div>

        {/* Test info */}
        <div className="flex-1 min-w-0">
          <p className="text-body font-semibold text-[var(--text-foreground)] truncate">{result.testName}</p>
          <p className="text-caption text-[var(--text-subtle)]">
            LOINC {result.loincCode} &middot; {new Date(result.collectedAt).toLocaleDateString('pt-BR')} &middot; Dr. {result.orderingDoctor}
          </p>
          <div className="mt-xs flex items-center gap-sm">
            <span className="text-caption text-[var(--text-subtle)]">{result.referenceMin}–{result.referenceMax} {result.unit}</span>
            <ReferenceRangeBar value={result.value} refMin={result.referenceMin} refMax={result.referenceMax} />
          </div>
        </div>

        {/* Sparkline trend */}
        {trendValues.length >= 3 && (
          <Sparkline values={trendValues} refMin={result.referenceMin} refMax={result.referenceMax} reducedMotion={reducedMotion} />
        )}
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function PortalLabResultsPage() {
  const t = useTranslations('common');
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('90d');
  const [category, setCategory] = useState<string>('ALL');
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ dateRange });
    if (category !== 'ALL') params.set('category', category);

    fetch(`/api/portal/lab-results?${params}`, {
      headers: { 'X-Access-Reason': 'TREATMENT' },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data) setResults(data.results || []); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [dateRange, category]);

  // Group by category
  const categories = useMemo(() => {
    const cats = new Set(results.map((r) => r.category));
    return ['ALL', ...Array.from(cats).sort()];
  }, [results]);

  // Filter
  const filtered = useMemo(() => {
    let list = results;
    if (abnormalOnly) list = list.filter((r) => r.status !== 'normal');
    if (category !== 'ALL') list = list.filter((r) => r.category === category);
    return list;
  }, [results, abnormalOnly, category]);

  // Group for display
  const grouped = useMemo(() => {
    const groups: Record<string, LabResult[]> = {};
    for (const r of filtered) {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    }
    return groups;
  }, [filtered]);

  // Trend data per LOINC
  const trendMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const r of results) {
      if (!map[r.loincCode]) map[r.loincCode] = [];
      map[r.loincCode].push(r.value);
    }
    return map;
  }, [results]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-md px-md py-md max-w-3xl mx-auto">
      <h1 className="text-heading-lg font-bold text-[var(--text-foreground)]">
        {/* i18n: portal.labResults */}
        Resultados de Exames
      </h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-sm">
        {/* Date range */}
        <div className="flex items-center gap-xs rounded-lg border border-[var(--border-default)] px-sm py-xs">
          <Calendar className="h-4 w-4 text-[var(--text-subtle)]" aria-hidden="true" />
          {(['30d', '90d', '1y', 'all'] as DateRange[]).map((dr) => (
            <button
              key={dr}
              onClick={() => setDateRange(dr)}
              className={`rounded-md px-sm py-xs text-caption font-semibold min-h-[var(--touch-md)] ${
                dateRange === dr ? 'bg-[var(--text-foreground)] text-[var(--surface-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]'
              }`}
              aria-pressed={dateRange === dr}
            >
              {dr === 'all' ? 'Todos' : dr}
            </button>
          ))}
        </div>

        {/* Category */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-[var(--border-default)] bg-transparent px-sm py-xs text-body min-h-[var(--touch-md)]"
          aria-label="Filter by category"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'ALL' ? 'Todas categorias' : c}</option>
          ))}
        </select>

        {/* Abnormal only */}
        <label className="flex items-center gap-xs cursor-pointer min-h-[var(--touch-md)]">
          <input
            type="checkbox"
            checked={abnormalOnly}
            onChange={(e) => setAbnormalOnly(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border-default)]"
          />
          <span className="text-body text-[var(--text-muted)]">Apenas alterados</span>
        </label>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-sm" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--surface-secondary)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-2xl text-center" role="status">
          <Search className="h-12 w-12 text-[var(--text-subtle)] mb-md" aria-hidden="true" />
          <p className="text-body font-semibold text-[var(--text-foreground)]">
            Nenhum resultado encontrado
          </p>
          <p className="text-body text-[var(--text-muted)] max-w-sm">
            {abnormalOnly ? 'Todos os resultados estão dentro da faixa normal.' : 'Seus resultados de exames aparecerão aqui quando disponíveis.'}
          </p>
        </div>
      )}

      {/* Grouped results */}
      {!loading && Object.entries(grouped).map(([cat, catResults]) => (
        <section key={cat} aria-label={`${cat} results`}>
          <h2 className="text-heading-sm font-semibold text-[var(--text-foreground)] mb-sm">{cat}</h2>
          <div className="space-y-sm" role="list">
            {catResults.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                trendValues={trendMap[result.loincCode] || []}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
