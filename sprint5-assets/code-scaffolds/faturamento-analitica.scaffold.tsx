'use client';

/**
 * Faturamento Analítica — Billing Analytics Dashboard
 *
 * Scaffold for /dashboard/faturamento/analitica/page.tsx
 *
 * Data source: GET /api/billing/analytics (see api-contracts.json)
 * Design tokens: uses clinical severity colors + 8px grid spacing
 * i18n: useTranslations('billing') with keys from i18n-sprint6.json
 *
 * @see sprint5-assets/api-contracts.json — faturamento.GET /api/billing/analytics
 * @see sprint5-assets/billing-code-mappings.json — procedure names and TUSS codes
 * @see sprint5-assets/i18n-sprint6.json — billing.* keys
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// ─── Types (match api-contracts.json GET /api/billing/analytics response) ────

interface BillingAnalytics {
  revenue: {
    total: number;
    outstanding: number;
    overdue: number;
    collectionRate: number;
  };
  trend: TrendDataPoint[];
  payerMix: PayerMixEntry[];
  aging: AgingBuckets;
  denialRate: number;
  topProcedures: ProcedureRevenue[];
}

interface TrendDataPoint {
  period: string;       // "2026-01", "2026-02", etc.
  revenue: number;
  invoiceCount: number;
}

interface PayerMixEntry {
  payerType: string;    // "INSURANCE" | "PRIVATE" | "GOVERNMENT"
  amount: number;
  percentage: number;
}

interface AgingBuckets {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120plus: number;
}

interface ProcedureRevenue {
  code: string;         // TUSS code
  description: string;
  count: number;
  revenue: number;
}

// ─── Design token palette ────────────────────────────────────────────────────

const PAYER_COLORS: Record<string, string> = {
  INSURANCE: '#3B82F6',   // clinical-routine (blue)
  PRIVATE: '#10B981',     // clinical-safe (green)
  GOVERNMENT: '#F59E0B',  // clinical-caution (amber)
};

const AGING_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#7C3AED'];

// ─── KPI Card Component ──────────────────────────────────────────────────────

/** @doc Single KPI metric card with icon, value, label, and optional trend */
function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  accentColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-white dark:bg-gray-900 px-md py-md"
      style={{ borderLeftColor: accentColor, borderLeftWidth: '4px' }}
      data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-center gap-sm">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div>
          <p className="text-caption text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-h3 font-semibold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <p className="text-caption text-gray-400">{trend}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State Component ───────────────────────────────────────────────────

/** @doc Shown when no invoices exist. Copy from empty-states-i18n.json */
function AnalyticsEmptyState({ t }: { t: ReturnType<typeof useTranslations> }) {
  // TODO: holilabsv2 — import EmptyState component from your shared UI library
  // For now, inline implementation matching empty-states-i18n.json
  return (
    <div className="flex flex-col items-center justify-center py-2xl text-center" data-testid="analytics-empty">
      <TrendingUp className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-md" />
      <h2 className="text-h3 font-semibold text-gray-900 dark:text-white mb-sm">
        {/* TODO: holilabsv2 — wire to i18n key: emptyStates.faturamento-analitica.headline */}
        {t('analytics') || 'No invoices yet'}
      </h2>
      <p className="text-body text-gray-500 dark:text-gray-400 max-w-md mb-lg">
        Revenue analytics will appear after your first billing cycle.
      </p>
      {/* TODO: holilabsv2 — wire CTA to invoice creation wizard */}
      <button className="rounded-xl bg-gray-900 dark:bg-white px-lg py-sm text-body font-semibold text-white dark:text-gray-900 min-h-touch-sm">
        {t('createInvoice')}
      </button>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function FaturamentoAnaliticaPage() {
  const t = useTranslations('billing');
  const [analytics, setAnalytics] = useState<BillingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  // ─── Data Fetching ───────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      setLoading(true);
      try {
        // TODO: holilabsv2 — add X-Access-Reason if this endpoint returns patient-level data
        const res = await fetch(
          `/api/billing/analytics?dateFrom=${dateRange.from}&dateTo=${dateRange.to}&groupBy=month`
        );
        if (!res.ok || cancelled) return;
        const data: BillingAnalytics = await res.json();
        if (!cancelled) setAnalytics(data);
      } catch {
        // TODO: holilabsv2 — show error toast
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [dateRange]);

  // ─── Format helpers ──────────────────────────────────────────────────────

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) =>
    `${(value * 100).toFixed(1)}%`;

  // ─── CSV Export ──────────────────────────────────────────────────────────

  const handleExport = () => {
    if (!analytics) return;
    // TODO: holilabsv2 — implement CSV export with all analytics data
    // Columns: Period, Revenue, InvoiceCount, PayerType, Amount, etc.
    const csvContent = analytics.trend
      .map((row) => `${row.period},${row.revenue},${row.invoiceCount}`)
      .join('\n');
    const blob = new Blob([`Period,Revenue,InvoiceCount\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faturamento-analitica-${dateRange.from}-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Loading State ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-lg px-xl py-lg max-w-7xl mx-auto">
        {/* TODO: holilabsv2 — replace with your Skeleton component */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────────────

  if (!analytics || analytics.revenue.total === 0) {
    return <AnalyticsEmptyState t={t} />;
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const { revenue, trend, payerMix, aging, denialRate, topProcedures } = analytics;

  const agingData = [
    { name: t('aging30') || '30 days', value: aging.days30 },
    { name: t('aging60') || '60 days', value: aging.days60 },
    { name: t('aging90') || '90 days', value: aging.days90 },
    { name: t('aging120plus') || '120+ days', value: aging.days120plus },
  ];

  return (
    <div className="space-y-lg px-xl py-lg max-w-7xl mx-auto" data-testid="analytics-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold text-gray-900 dark:text-white">
            {t('analytics')}
          </h1>
          <p className="text-body text-gray-500 dark:text-gray-400">
            {t('title')} — {dateRange.from} to {dateRange.to}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          {/* TODO: holilabsv2 — replace with your DateRangePicker component */}
          <div className="flex items-center gap-xs rounded-xl border border-gray-200 dark:border-gray-700 px-sm py-xs">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              className="text-body-dense bg-transparent border-none outline-none"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              className="text-body-dense bg-transparent border-none outline-none"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-xs rounded-xl border border-gray-200 dark:border-gray-700 px-sm py-xs text-body-dense min-h-touch-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4" />
            {t('auditExport') || 'Export CSV'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md" data-testid="revenue-kpis">
        <KPICard
          icon={DollarSign}
          label={t('totalRevenue')}
          value={formatBRL(revenue.total)}
          accentColor="#10B981"
        />
        <KPICard
          icon={Clock}
          label={t('outstanding')}
          value={formatBRL(revenue.outstanding)}
          accentColor="#3B82F6"
        />
        <KPICard
          icon={AlertTriangle}
          label={t('overdue')}
          value={formatBRL(revenue.overdue)}
          accentColor="#EF4444"
        />
        <KPICard
          icon={TrendingUp}
          label={t('collectionRate')}
          value={formatPercent(revenue.collectionRate)}
          trend={`${t('denialRate')}: ${formatPercent(denialRate)}`}
          accentColor="#F59E0B"
        />
      </div>

      {/* ── Charts Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">

        {/* Revenue by Month (BarChart) */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-md py-md" data-testid="revenue-trend-chart">
          <h3 className="text-body font-semibold text-gray-900 dark:text-white mb-md">
            {t('totalRevenue')} / {t('thisMonth') || 'Month'}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [formatBRL(value), t('totalRevenue')]}
                labelFormatter={(label: string) => `Period: ${label}`}
              />
              <Bar dataKey="revenue" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payer Mix (PieChart) */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-md py-md" data-testid="payer-mix">
          <h3 className="text-body font-semibold text-gray-900 dark:text-white mb-md">
            {t('payerMix')}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={payerMix}
                dataKey="amount"
                nameKey="payerType"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ payerType, percentage }: PayerMixEntry) =>
                  `${t(`payer${payerType.charAt(0) + payerType.slice(1).toLowerCase()}`) || payerType} ${(percentage * 100).toFixed(0)}%`
                }
              >
                {payerMix.map((entry) => (
                  <Cell key={entry.payerType} fill={PAYER_COLORS[entry.payerType] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatBRL(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Procedures (Horizontal BarChart) */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-md py-md" data-testid="top-procedures">
          <h3 className="text-body font-semibold text-gray-900 dark:text-white mb-md">
            {t('topProcedures')}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProcedures.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={(v: number) => formatBRL(v)} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="code"
                width={90}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, _: string, props: { payload: ProcedureRevenue }) => [
                  `${formatBRL(value)} (${props.payload.count}x)`,
                  props.payload.description,
                ]}
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Aging Report (Stacked BarChart) */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-md py-md" data-testid="aging-report">
          <h3 className="text-body font-semibold text-gray-900 dark:text-white mb-md">
            {t('aging')}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => formatBRL(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatBRL(value)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {agingData.map((_, index) => (
                  <Cell key={index} fill={AGING_COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
