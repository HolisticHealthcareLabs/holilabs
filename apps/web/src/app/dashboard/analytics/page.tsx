'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Users, Stethoscope, FileText, DollarSign,
  TrendingUp, TrendingDown, Minus,
  Download, Calendar,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewMetrics {
  totalPatients: number;
  activePatients: number;
  totalConsultations: number;
  totalPrescriptions: number;
  revenue: number;
  avgConsultationTime: number;
}

interface GrowthTrends {
  patientsGrowth: number;
  consultationsGrowth: number;
  revenueGrowth: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

interface DiagnosisEntry {
  code: string;
  name: string;
  count: number;
}

interface DemographicBand {
  ageGroup: string;
  count: number;
  percentage: number;
}

interface AppointmentType {
  type: string;
  count: number;
  percentage: number;
}

interface HeatmapCell {
  day: string;
  hour: number;
  intensity: number;
}

interface AnalyticsData {
  overview: OverviewMetrics;
  trends: GrowthTrends;
  chartData: ChartPoint[];
  topDiagnoses: DiagnosisEntry[];
  demographics: DemographicBand[];
  appointmentTypes: AppointmentType[];
  heatmap: HeatmapCell[];
}

type UnknownRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Mock data generator
// ---------------------------------------------------------------------------

function generateMockData(): AnalyticsData {
  const chartData: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const month = day <= 28 ? '02' : '03';
    const normalizedDay = day <= 28 ? day : day - 28;
    const date = `2026-${month}-${String(normalizedDay).padStart(2, '0')}`;
    const value = 10 + ((i * 7) % 9) + (i % 4);
    return { date, value };
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);
  const heatmap: HeatmapCell[] = [];
  days.forEach((day) => {
    hours.forEach((hour, hourIndex) => {
      const isWeekend = day === 'Sat' || day === 'Sun';
      const isPeak = hour >= 10 && hour <= 14;
      const dayIndex = days.indexOf(day);
      let intensity = 0;
      if (!isWeekend) {
        intensity = isPeak
          ? 7 + ((dayIndex + hourIndex) % 3)
          : 3 + ((dayIndex * 2 + hourIndex) % 3);
      } else {
        intensity = (dayIndex + hourIndex) % 3;
      }
      heatmap.push({ day, hour, intensity });
    });
  });

  return {
    overview: {
      totalPatients: 247,
      activePatients: 186,
      totalConsultations: 423,
      totalPrescriptions: 315,
      revenue: 125430,
      avgConsultationTime: 32,
    },
    trends: {
      patientsGrowth: 12.5,
      consultationsGrowth: 8.3,
      revenueGrowth: 18.7,
    },
    chartData,
    topDiagnoses: [
      { code: 'I10', name: 'Essential Hypertension', count: 42 },
      { code: 'E11.9', name: 'Type 2 Diabetes Mellitus', count: 31 },
      { code: 'I48.91', name: 'Atrial Fibrillation', count: 24 },
      { code: 'I50.9', name: 'Heart Failure', count: 19 },
      { code: 'E78.5', name: 'Dyslipidemia', count: 17 },
      { code: 'N18.3', name: 'CKD Stage 3', count: 14 },
      { code: 'I25.10', name: 'Coronary Artery Disease', count: 11 },
      { code: 'E03.9', name: 'Hypothyroidism', count: 9 },
    ],
    demographics: [
      { ageGroup: '18-35', count: 38, percentage: 15 },
      { ageGroup: '36-50', count: 62, percentage: 25 },
      { ageGroup: '51-65', count: 84, percentage: 34 },
      { ageGroup: '66-80', count: 48, percentage: 19 },
      { ageGroup: '80+', count: 15, percentage: 7 },
    ],
    appointmentTypes: [
      { type: 'Follow-up Visit', count: 178, percentage: 42 },
      { type: 'New Patient', count: 89, percentage: 21 },
      { type: 'Urgent / Same-day', count: 68, percentage: 16 },
      { type: 'Procedure', count: 51, percentage: 12 },
      { type: 'Telehealth', count: 37, percentage: 9 },
    ],
    heatmap,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function GrowthBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="w-3 h-3" /> +{value}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
        <TrendingDown className="w-3 h-3" /> {value}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-gray-400">
      <Minus className="w-3 h-3" /> 0%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Mini SVG line chart (no external lib)
// ---------------------------------------------------------------------------

function SparklineChart({ data, color }: { data: ChartPoint[]; color: string }) {
  if (!data.length) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const w = 600;
  const h = 180;
  const px = 32;
  const py = 20;

  const pts = values.map((v, i) => ({
    x: px + (i / (values.length - 1)) * (w - px * 2),
    y: h - py - ((v - min) / range) * (h - py * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1].x} ${h - py} L ${px} ${h - py} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`ag-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((r) => (
        <line
          key={r}
          x1={px} y1={py + r * (h - py * 2)}
          x2={w - px} y2={py + r * (h - py * 2)}
          stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="4 4"
        />
      ))}
      <path d={area} fill={`url(#ag-${color})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1.5" className="opacity-0 hover:opacity-100 transition-opacity">
          <title>{data[i].date}: {data[i].value}</title>
        </circle>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

const HEAT_COLORS = [
  'bg-gray-100 dark:bg-gray-800',
  'bg-blue-100 dark:bg-blue-900/30',
  'bg-blue-300 dark:bg-blue-700/50',
  'bg-blue-500 dark:bg-blue-600/70',
  'bg-blue-700 dark:bg-blue-500',
];

function heatColor(intensity: number): string {
  if (intensity === 0) return HEAT_COLORS[0];
  if (intensity < 3) return HEAT_COLORS[1];
  if (intensity < 6) return HEAT_COLORS[2];
  if (intensity < 9) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeAnalyticsData(input: unknown, fallback: AnalyticsData): AnalyticsData {
  const root = asRecord(input);
  if (!root) return fallback;

  const overview = asRecord(root.overview);
  const trends = asRecord(root.trends);

  const recentActivity = Array.isArray(root.recentActivity) ? root.recentActivity : [];
  const chartData = recentActivity
    .map((entry) => {
      const row = asRecord(entry);
      if (!row) return null;
      const rawDate = typeof row.date === 'string' ? row.date : '';
      const date = rawDate ? rawDate.split('T')[0] : '';
      const value = asNumber(row.consultations, NaN);
      if (!date || !Number.isFinite(value)) return null;
      return { date, value };
    })
    .filter((row): row is ChartPoint => row !== null);

  const topDiagnosesRaw = Array.isArray(root.topDiagnoses) ? root.topDiagnoses : fallback.topDiagnoses;
  const topDiagnoses = topDiagnosesRaw
    .map((entry) => {
      const row = asRecord(entry);
      if (!row || typeof row.code !== 'string' || typeof row.name !== 'string') return null;
      return {
        code: row.code,
        name: row.name,
        count: asNumber(row.count, 0),
      };
    })
    .filter((row): row is DiagnosisEntry => row !== null);

  return {
    overview: {
      totalPatients: asNumber(overview?.totalPatients, fallback.overview.totalPatients),
      activePatients: asNumber(overview?.activePatients, fallback.overview.activePatients),
      totalConsultations: asNumber(overview?.totalConsultations, fallback.overview.totalConsultations),
      totalPrescriptions: asNumber(overview?.totalPrescriptions, fallback.overview.totalPrescriptions),
      revenue: asNumber(overview?.revenue, fallback.overview.revenue),
      avgConsultationTime: asNumber(overview?.avgConsultationTime, fallback.overview.avgConsultationTime),
    },
    trends: {
      patientsGrowth: asNumber(trends?.patientsGrowth, fallback.trends.patientsGrowth),
      consultationsGrowth: asNumber(trends?.consultationsGrowth, fallback.trends.consultationsGrowth),
      revenueGrowth: asNumber(trends?.revenueGrowth, fallback.trends.revenueGrowth),
    },
    chartData: chartData.length ? chartData : fallback.chartData,
    topDiagnoses: topDiagnoses.length ? topDiagnoses : fallback.topDiagnoses,
    demographics: fallback.demographics,
    appointmentTypes: fallback.appointmentTypes,
    heatmap: fallback.heatmap,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type TimeRange = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>(() => generateMockData());
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/analytics/dashboard?range=${timeRange}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) {
          setData((prev) => normalizeAnalyticsData(json, prev));
        }
      } catch { /* mock data already showing */ }
    })();
    return () => { cancelled = true; };
  }, [timeRange]);

  const { overview, trends } = data;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  const heatmapLookup = useMemo(() => {
    const map = new Map<string, number>();
    (data.heatmap ?? []).forEach((c) => map.set(`${c.day}-${c.hour}`, c.intensity));
    return map;
  }, [data.heatmap]);

  async function handleExportCSV() {
    const rows = [
      ['Metric', 'Value'],
      ['Total Patients', String(overview.totalPatients)],
      ['Active Patients', String(overview.activePatients)],
      ['Consultations', String(overview.totalConsultations)],
      ['Prescriptions', String(overview.totalPrescriptions)],
      ['Revenue (BRL)', String(overview.revenue)],
      ['Avg Consultation (min)', String(overview.avgConsultationTime)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="header-entrance">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Practice performance metrics and clinical trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeRange === r
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          icon={Users} label="Total Patients" value={String(overview.totalPatients)}
          sub={`${overview.activePatients} active`}
          growth={trends.patientsGrowth}
          accent="text-blue-600 dark:text-blue-400" border="border-blue-200/60 dark:border-blue-500/20"
          iconBg="bg-blue-50 dark:bg-blue-500/10" index={1}
        />
        <KPICard
          icon={Stethoscope} label="Consultations" value={String(overview.totalConsultations)}
          sub={`~${overview.avgConsultationTime} min avg`}
          growth={trends.consultationsGrowth}
          accent="text-emerald-600 dark:text-emerald-400" border="border-emerald-200/60 dark:border-emerald-500/20"
          iconBg="bg-emerald-50 dark:bg-emerald-500/10" index={2}
        />
        <KPICard
          icon={FileText} label="Prescriptions" value={String(overview.totalPrescriptions)}
          sub={`${(overview.totalPrescriptions / Math.max(overview.totalConsultations, 1)).toFixed(1)} per visit`}
          accent="text-violet-600 dark:text-violet-400" border="border-violet-200/60 dark:border-violet-500/20"
          iconBg="bg-violet-50 dark:bg-violet-500/10" index={3}
        />
        <KPICard
          icon={DollarSign} label="Revenue" value={formatCurrency(overview.revenue)}
          sub="Current period"
          growth={trends.revenueGrowth}
          accent="text-amber-600 dark:text-amber-400" border="border-amber-200/60 dark:border-amber-500/20"
          iconBg="bg-amber-50 dark:bg-amber-500/10" index={4}
        />
      </div>

      {/* Trend Chart */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Consultation Trend</h2>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Calendar className="w-3 h-3" />
            Last {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days
          </div>
        </div>
        <div className="p-5">
          <SparklineChart data={data.chartData} color="#3b82f6" />
        </div>
      </div>

      {/* Three-column: Diagnoses, Demographics, Appointment Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Diagnoses */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Top Diagnoses (ICD-10)</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.topDiagnoses.slice(0, 6).map((dx, i) => (
              <div key={dx.code} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{dx.name}</p>
                  <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{dx.code}</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300">{dx.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demographics */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Patient Demographics</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {data.demographics.map((band) => (
              <div key={band.ageGroup}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{band.ageGroup}</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                    {band.count} ({band.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                    style={{ width: `${band.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appointment Types */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Visit Types</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.appointmentTypes.map((t) => (
              <div key={t.type} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{t.type}</p>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 mt-1.5">
                    <div
                      className="h-1 rounded-full bg-violet-500 dark:bg-violet-400 transition-all duration-500"
                      style={{ width: `${t.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300">{t.count}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{t.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Clinic Activity Heatmap</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Consultation density by day and hour</p>
        </div>
        <div className="p-5 overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 pt-5">
                {days.map((d) => (
                  <div key={d} className="h-7 flex items-center justify-end pr-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium w-10">
                    {d}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-1 mb-1">
                  {hours.map((h) => (
                    <div key={h} className="w-7 text-center text-[10px] text-gray-400 dark:text-gray-500">{h}</div>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  {days.map((day) => (
                    <div key={day} className="flex gap-1">
                      {hours.map((hour) => (
                        <div
                          key={`${day}-${hour}`}
                          className={`w-7 h-7 rounded ${heatColor(heatmapLookup.get(`${day}-${hour}`) ?? 0)} transition-colors`}
                          title={`${day} ${hour}:00 - ${heatmapLookup.get(`${day}-${hour}`) ?? 0} consultations`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
              <span>Less</span>
              <div className="flex gap-0.5">
                {HEAT_COLORS.map((c, i) => (
                  <div key={i} className={`w-4 h-4 rounded ${c}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  growth,
  accent,
  border,
  iconBg,
  index = 1,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  growth?: number;
  accent: string;
  border: string;
  iconBg: string;
  index?: number;
}) {
  return (
    <div className={`rounded-2xl border bg-white dark:bg-gray-900 p-4 overflow-hidden min-w-0 card-entrance card-entrance-${index} hover:scale-[1.02] hover:shadow-md transition-all duration-200 ${border}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
        {growth !== undefined && <GrowthBadge value={growth} />}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 truncate">
        {label}
      </p>
      <p className={`text-base sm:text-xl lg:text-2xl font-bold tabular-nums truncate leading-tight ${accent}`}>{value}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">{sub}</p>
    </div>
  );
}
