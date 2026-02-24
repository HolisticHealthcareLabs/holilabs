'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// =============================================================================
// MOCK FALLBACK DATA
// =============================================================================

const OUTCOME_TYPES = ['READMISSION', 'ADVERSE_EVENT', 'COMPLICATION', 'RESOLVED'] as const;

const MOCK_OUTCOMES = Array.from({ length: 40 }, (_, i) => {
  const type = OUTCOME_TYPES[Math.floor(Math.random() * 4)];
  const hasOverride = Math.random() > 0.5;
  return {
    id: `outcome-${i + 1}`,
    anonymizedPatientId: `anon-${(i * 11 + 5).toString(16).padStart(4, '0')}-${(i * 17).toString(16).padStart(4, '0')}`,
    outcomeType: type,
    linkedOverrideIds: hasOverride ? [`override-${Math.ceil(Math.random() * 100)}`] : [],
    recordedAt: new Date(Date.now() - Math.random() * 60 * 86400000).toISOString(),
  };
});

// =============================================================================
// TYPES
// =============================================================================

interface OutcomeRecord {
  id: string;
  anonymizedPatientId: string;
  outcomeType: string;
  linkedOverrideIds: string[];
  recordedAt: string;
}

interface CorrelationData {
  totalOverrides: number;
  totalOutcomes: number;
  overridesWithAdverseOutcome: number;
  adverseEventRate: number;
  readmissionRate: number;
  complicationRate: number;
  resolvedRate: number;
  byOutcomeType: Record<string, number>;
  correlationConfidence: number;
}

// =============================================================================
// DATA FETCHING HOOK
// =============================================================================

function useOutcomesData() {
  const [correlation, setCorrelation] = React.useState<CorrelationData | null>(null);
  const [outcomes, setOutcomes] = React.useState<OutcomeRecord[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const headers = { 'x-pharma-partner-key': process.env.NEXT_PUBLIC_ENTERPRISE_API_KEY ?? '' };

    fetch('/api/enterprise/outcomes/correlation', { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.correlation) setCorrelation(data.correlation);
        if (data?.outcomes?.length > 0) setOutcomes(data.outcomes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { correlation, outcomes, loading };
}

// =============================================================================
// HELPERS — compute stats from raw outcomes
// =============================================================================

function computeStats(outcomeData: OutcomeRecord[]) {
  const typeCounts: Record<string, number> = {};
  let withOverrides = 0;
  let adverseWithOverrides = 0;
  for (const o of outcomeData) {
    typeCounts[o.outcomeType] = (typeCounts[o.outcomeType] ?? 0) + 1;
    if (o.linkedOverrideIds.length > 0) {
      withOverrides++;
      if (o.outcomeType === 'ADVERSE_EVENT' || o.outcomeType === 'COMPLICATION') {
        adverseWithOverrides++;
      }
    }
  }
  const total = outcomeData.length;
  const adverseRate = total > 0 ? Math.round(((typeCounts['ADVERSE_EVENT'] ?? 0) / total) * 100) : 0;
  const correlationConfidence = Math.min(total / 30, 1);
  const overrideAdverseRate = withOverrides > 0 ? Math.round((adverseWithOverrides / withOverrides) * 100) : 0;
  return { typeCounts, withOverrides, adverseWithOverrides, total, adverseRate, correlationConfidence, overrideAdverseRate };
}

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const TOOLTIP_STYLE = {
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const OUTCOME_COLORS: Record<string, string> = {
  READMISSION: '#f59e0b',
  ADVERSE_EVENT: '#ef4444',
  COMPLICATION: '#f97316',
  RESOLVED: '#22c55e',
};

// =============================================================================
// PAGE
// =============================================================================

export default function OutcomesPage() {
  const { correlation: liveCorrelation, outcomes: liveOutcomes, loading } = useOutcomesData();

  const isLive = liveOutcomes !== null && liveOutcomes.length > 0;
  const outcomeData = liveOutcomes ?? MOCK_OUTCOMES;

  // Use live correlation or compute from raw data
  const stats = React.useMemo(() => {
    if (liveCorrelation && liveCorrelation.totalOutcomes > 0) {
      return {
        typeCounts: liveCorrelation.byOutcomeType,
        withOverrides: liveCorrelation.totalOverrides,
        adverseWithOverrides: liveCorrelation.overridesWithAdverseOutcome,
        total: liveCorrelation.totalOutcomes,
        adverseRate: Math.round(liveCorrelation.adverseEventRate * 100),
        correlationConfidence: liveCorrelation.correlationConfidence,
        overrideAdverseRate: liveCorrelation.totalOverrides > 0
          ? Math.round((liveCorrelation.overridesWithAdverseOutcome / liveCorrelation.totalOverrides) * 100)
          : 0,
      };
    }
    return computeStats(outcomeData);
  }, [liveCorrelation, outcomeData]);

  const barData = OUTCOME_TYPES.map((t) => ({
    name: t.replace(/_/g, ' '),
    count: stats.typeCounts[t] ?? 0,
    color: OUTCOME_COLORS[t],
  }));

  const recentOutcomes = [...outcomeData]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, 20);

  return (
    <div className="relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-amber-500/6 to-orange-500/6 dark:from-amber-900/12 dark:to-orange-900/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-red-400/4 to-pink-500/4 dark:from-red-900/8 dark:to-pink-900/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.header {...fadeUp} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-amber-200/50 dark:border-amber-800/30 backdrop-blur-sm mb-4">
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : isLive ? 'bg-amber-500' : 'bg-neutral-400'} animate-pulse`} />
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-600 dark:text-amber-400">
              {loading ? 'Loading...' : isLive ? 'Live Data' : 'Demo Mode'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Outcome Tracking
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl">
            Correlate doctor override decisions with patient outcomes. The link between overrides and adverse events is the most valuable actuarial signal.
          </p>
        </motion.header>

        <motion.div {...stagger} initial="initial" animate="animate" className="space-y-8">
          {/* KPI Strip */}
          <motion.section {...fadeUp}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Outcomes" value={String(stats.total)} sublabel="recorded events" />
              <KpiCard label="Adverse Rate" value={`${stats.adverseRate}%`} sublabel="of all outcomes" />
              <KpiCard label="Correlation" value={`${Math.round(stats.correlationConfidence * 100)}%`} sublabel="confidence level" />
              <KpiCard label="Override→Adverse" value={`${stats.overrideAdverseRate}%`} sublabel="override adverse rate" />
            </div>
          </motion.section>

          {/* Outcome Distribution + Correlation Card */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Distribution" title="Outcome Type Breakdown" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="lg:col-span-2 rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Outcomes by Type</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Count">
                      {barData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Correlation Highlight Card */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Override Correlation</div>
                  <div className="text-4xl font-bold tabular-nums text-neutral-800 dark:text-neutral-100">{stats.overrideAdverseRate}%</div>
                  <div className="text-sm text-neutral-500 mt-1">of overrides lead to adverse outcomes</div>
                </div>
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Overrides with outcomes</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{stats.withOverrides}</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Adverse after override</span>
                    <span className="font-semibold text-red-500">{stats.adverseWithOverrides}</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Confidence</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{Math.round(stats.correlationConfidence * 100)}%</span>
                  </div>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-neutral-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${stats.correlationConfidence * 100}%` }} />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Recent Outcomes Table */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Recent" title="Latest Outcomes" />
            <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md overflow-hidden mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200/40 dark:border-white/5">
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Patient ID</th>
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Override Linked</th>
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Recorded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOutcomes.map((o) => (
                      <tr key={o.id} className="border-b border-neutral-100/60 dark:border-white/[0.03] hover:bg-neutral-50/50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-2 font-mono text-neutral-600 dark:text-neutral-300">{o.anonymizedPatientId}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${OUTCOME_COLORS[o.outcomeType]}18`, color: OUTCOME_COLORS[o.outcomeType] }}>
                            {o.outcomeType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-neutral-500">
                          {o.linkedOverrideIds.length > 0
                            ? o.linkedOverrideIds.map((id) => (
                                <span key={id} className="inline-flex px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono mr-1">
                                  {id}
                                </span>
                              ))
                            : <span className="text-neutral-300 dark:text-neutral-600">&mdash;</span>
                          }
                        </td>
                        <td className="px-4 py-2 text-neutral-400">{new Date(o.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>
        </motion.div>

        <motion.footer {...fadeUp} className="mt-16 pt-8 border-t border-neutral-200/40 dark:border-white/5">
          <p className="text-xs text-neutral-400 text-center">
            Cortex by Holi Labs &mdash; Outcome Tracking &mdash; {stats.total} outcomes, {stats.withOverrides} override-linked
            {isLive && ' (live)'}
          </p>
        </motion.footer>
      </div>
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

function SectionLabel({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400">{label}</span>
      <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mt-0.5">{title}</h2>
    </div>
  );
}

function KpiCard({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-4">
      <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-2xl font-bold tabular-nums text-neutral-800 dark:text-neutral-100">{value}</div>
      <div className="text-[10px] text-neutral-400 mt-1">{sublabel}</div>
    </div>
  );
}
