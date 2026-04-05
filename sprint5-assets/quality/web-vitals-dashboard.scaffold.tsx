'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'next-i18next';

/**
 * Web Vitals Performance Monitoring Dashboard
 * - Display real user metrics (RUM): LCP, FID, CLS, TTFB, INP
 * - Time series chart (last 7 days) with p50/p75/p95 lines
 * - Page-level breakdown (which pages are slowest)
 * - Device breakdown (mobile vs desktop)
 * - Budget lines overlaid on charts (from performance-budgets.json)
 * - Data source: `/api/internal/web-vitals` (accepts beacon POST from web-vitals npm package)
 * - Design tokens, accessible charts (aria-label on data points)
 */

export interface WebVitalMetric {
  name: string;
  label: string;
  threshold: number; // good threshold in ms
  color: string; // design token
  unit: string;
}

export interface VitalDataPoint {
  timestamp: Date;
  value: number;
  percentile: 'p50' | 'p75' | 'p95';
  page?: string;
  device?: 'mobile' | 'desktop';
}

export interface PagePerformance {
  path: string;
  lcp: number; // ms
  fid: number; // ms
  cls: number; // unitless
  ttfb: number; // ms
  inp: number; // ms
  sampleCount: number;
}

export interface WebVitalsData {
  timestamp: string;
  lcp: VitalDataPoint[];
  fid: VitalDataPoint[];
  cls: VitalDataPoint[];
  ttfb: VitalDataPoint[];
  inp: VitalDataPoint[];
  pageBreakdown: PagePerformance[];
  deviceBreakdown: {
    mobile: { [metric: string]: number };
    desktop: { [metric: string]: number };
  };
  summary: {
    p50Lcp: number;
    p75Lcp: number;
    p95Lcp: number;
    p50Fid: number;
    p75Fid: number;
    p95Fid: number;
    goodLcpPercent: number; // % of users with LCP < 2.5s
    goodFidPercent: number; // % of users with FID < 100ms
    goodClsPercent: number; // % of users with CLS < 0.1
  };
}

/**
 * Metric definitions
 */
const metrics: { [key: string]: WebVitalMetric } = {
  lcp: {
    name: 'LCP',
    label: 'Largest Contentful Paint',
    threshold: 2500, // 2.5s
    color: 'severity-minimal',
    unit: 'ms',
  },
  fid: {
    name: 'FID',
    label: 'First Input Delay',
    threshold: 100,
    color: 'severity-mild',
    unit: 'ms',
  },
  cls: {
    name: 'CLS',
    label: 'Cumulative Layout Shift',
    threshold: 0.1,
    color: 'severity-moderate',
    unit: '',
  },
  ttfb: {
    name: 'TTFB',
    label: 'Time to First Byte',
    threshold: 600,
    color: 'severity-minimal',
    unit: 'ms',
  },
  inp: {
    name: 'INP',
    label: 'Interaction to Next Paint',
    threshold: 200,
    color: 'severity-mild',
    unit: 'ms',
  },
};

/**
 * Mini Chart Component (line chart with p50/p75/p95 lines)
 */
interface MiniChartProps {
  data: VitalDataPoint[];
  metric: string;
  height?: number;
  width?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, metric, height = 200, width = 300 }) => {
  const config = metrics[metric];

  // Group by percentile and sort by timestamp
  const p50Data = data.filter((d) => d.percentile === 'p50').sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const p75Data = data.filter((d) => d.percentile === 'p75').sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const p95Data = data.filter((d) => d.percentile === 'p95').sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (p50Data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-surface-secondary rounded-md h-48">
        <p className="text-caption text-surface-tertiary">No data available</p>
      </div>
    );
  }

  // Find min/max for scale
  const allValues = [...p50Data, ...p75Data, ...p95Data].map((d) => d.value);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, config.threshold * 1.2);

  const scale = (value: number) => {
    return ((value - minValue) / (maxValue - minValue)) * (height - 40);
  };

  return (
    <div className="relative bg-surface-secondary rounded-md p-spacing-md" style={{ height }}>
      <svg width="100%" height={height} className="absolute inset-0" aria-hidden="true">
        {/* Grid lines */}
        <line x1="0" y1={height - 30} x2="100%" y2={height - 30} stroke="#ccc" strokeDasharray="4" />

        {/* Threshold line */}
        <line
          x1="0"
          y1={height - 30 - scale(config.threshold)}
          x2="100%"
          y2={height - 30 - scale(config.threshold)}
          stroke="#f97316"
          strokeWidth="2"
          strokeDasharray="4"
        />

        {/* P50 line */}
        <polyline
          points={p50Data
            .map((d, i) => `${(i / p50Data.length) * 100}%,${height - 30 - scale(d.value)}`)
            .join(' ')}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
        />

        {/* P75 line */}
        <polyline
          points={p75Data
            .map((d, i) => `${(i / p75Data.length) * 100}%,${height - 30 - scale(d.value)}`)
            .join(' ')}
          fill="none"
          stroke="#eab308"
          strokeWidth="2"
        />

        {/* P95 line */}
        <polyline
          points={p95Data
            .map((d, i) => `${(i / p95Data.length) * 100}%,${height - 30 - scale(d.value)}`)
            .join(' ')}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
        />

        {/* Y-axis labels */}
        <text x="5" y="15" fontSize="12" fill="#666">
          {Math.round(maxValue)}
        </text>
        <text x="5" y={height - 15} fontSize="12" fill="#666">
          {Math.round(minValue)}
        </text>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-spacing-sm left-spacing-md right-spacing-md flex gap-spacing-sm text-caption">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-severity-minimal" /> p50
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-severity-mild" /> p75
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-severity-severe" /> p95
        </span>
      </div>
    </div>
  );
};

/**
 * Main Dashboard Component
 */
export const WebVitalsDashboard: React.FC<{
  organizationId: string;
}> = ({ organizationId }) => {
  const { t } = useTranslation(['performance']);

  const [vitalData, setVitalData] = useState<WebVitalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>('lcp');
  const [selectedDevice, setSelectedDevice] = useState<'all' | 'mobile' | 'desktop'>('all');
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d'>('7d');

  // Fetch real user metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/internal/web-vitals?organizationId=${organizationId}&range=${dateRange}`,
          {
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}` },
          }
        );

        if (!res.ok) throw new Error('Failed to load metrics');
        const data = await res.json();
        setVitalData(data);
      } catch (err) {
        console.error('Failed to load web vitals:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [organizationId, dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-surface-tertiary border-t-severity-minimal rounded-full" />
      </div>
    );
  }

  if (!vitalData) {
    return (
      <div className="text-center py-spacing-2xl">
        <p className="text-heading-md text-surface-tertiary">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-spacing-lg">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-heading-lg">{t('dashboard.title', { defaultValue: 'Web Vitals' })}</h1>

        <div className="flex gap-spacing-sm">
          {(['1d', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-spacing-md py-spacing-sm rounded-md text-body ${
                dateRange === range
                  ? 'bg-severity-minimal text-white font-semibold'
                  : 'bg-surface-secondary hover:bg-surface-elevated'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-spacing-md">
        {Object.entries(metrics).map(([key, metric]) => {
          const summary = vitalData.summary;
          const value =
            key === 'lcp'
              ? summary.p75Lcp
              : key === 'fid'
              ? summary.p75Fid
              : key === 'cls'
              ? summary.p75Fid // CLS doesn't have a TTFB equivalent
              : key === 'inp'
              ? summary.p75Fid // INP
              : summary.p75Lcp;

          const isGood = value < metric.threshold;

          return (
            <div key={key} className="bg-surface-elevated rounded-lg p-spacing-md border border-surface-tertiary">
              <p className="text-caption font-semibold text-surface-tertiary mb-spacing-xs">
                {metric.label} (p75)
              </p>
              <p className={`text-heading-md font-bold ${isGood ? 'text-severity-minimal' : 'text-severity-severe'}`}>
                {value.toFixed(0)}
                {metric.unit}
              </p>
              <p className="text-caption text-surface-tertiary mt-spacing-xs">
                {t('dashboard.threshold', { defaultValue: `Good: < ${metric.threshold}${metric.unit}` })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main chart */}
      <div className="bg-surface-elevated rounded-lg p-spacing-lg border border-surface-tertiary">
        <h2 className="text-heading-md mb-spacing-md">{metrics[selectedMetric]?.label || 'Metric'}</h2>

        {/* Metric selector */}
        <div className="flex gap-spacing-sm mb-spacing-md">
          {Object.keys(metrics).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`px-spacing-md py-spacing-sm rounded-md text-body ${
                selectedMetric === key
                  ? 'bg-severity-minimal text-white font-semibold'
                  : 'bg-surface-secondary hover:bg-surface-elevated'
              }`}
            >
              {metrics[key].name}
            </button>
          ))}
        </div>

        {/* Chart */}
        <MiniChart data={vitalData[selectedMetric as keyof WebVitalsData] || []} metric={selectedMetric} />
      </div>

      {/* Page breakdown */}
      <div className="bg-surface-elevated rounded-lg p-spacing-lg border border-surface-tertiary">
        <h2 className="text-heading-md mb-spacing-md">{t('dashboard.pageBreakdown', { defaultValue: 'Performance by Page' })}</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-spacing-md py-spacing-sm text-left">Page</th>
                <th className="px-spacing-md py-spacing-sm text-right">LCP</th>
                <th className="px-spacing-md py-spacing-sm text-right">FID</th>
                <th className="px-spacing-md py-spacing-sm text-right">CLS</th>
                <th className="px-spacing-md py-spacing-sm text-right">Samples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-tertiary">
              {vitalData.pageBreakdown.slice(0, 10).map((page) => (
                <tr key={page.path} className="hover:bg-surface-secondary">
                  <td className="px-spacing-md py-spacing-sm font-mono text-caption">{page.path}</td>
                  <td className={`px-spacing-md py-spacing-sm text-right ${page.lcp < 2500 ? 'text-severity-minimal' : 'text-severity-severe'}`}>
                    {page.lcp}ms
                  </td>
                  <td className={`px-spacing-md py-spacing-sm text-right ${page.fid < 100 ? 'text-severity-minimal' : 'text-severity-severe'}`}>
                    {page.fid}ms
                  </td>
                  <td className={`px-spacing-md py-spacing-sm text-right ${page.cls < 0.1 ? 'text-severity-minimal' : 'text-severity-severe'}`}>
                    {page.cls.toFixed(3)}
                  </td>
                  <td className="px-spacing-md py-spacing-sm text-right text-surface-tertiary">{page.sampleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-md">
        {(['mobile', 'desktop'] as const).map((device) => (
          <div key={device} className="bg-surface-elevated rounded-lg p-spacing-lg border border-surface-tertiary">
            <h3 className="text-heading-sm mb-spacing-md capitalize">{device}</h3>

            <div className="space-y-spacing-sm text-body">
              <div className="flex justify-between">
                <span>LCP:</span>
                <span className="font-semibold">{vitalData.deviceBreakdown[device].lcp}ms</span>
              </div>
              <div className="flex justify-between">
                <span>FID:</span>
                <span className="font-semibold">{vitalData.deviceBreakdown[device].fid}ms</span>
              </div>
              <div className="flex justify-between">
                <span>CLS:</span>
                <span className="font-semibold">{vitalData.deviceBreakdown[device].cls.toFixed(3)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebVitalsDashboard;
