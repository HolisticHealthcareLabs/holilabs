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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
} from 'recharts';
import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
  type RiskTier,
} from '@/services/risk-calculator.service';
import {
  getAllCodes,
  estimateClaimCost,
  getTUSSBySeverity,
} from '@/lib/finance/tuss-lookup';

// =============================================================================
// DATA FETCHING
// =============================================================================

interface FlywheelStats {
  totalAssessments: number;
  byTier: Record<string, number>;
  latestAt: string | null;
}

function useAnalyticsData() {
  const [flywheelStats, setFlywheelStats] = React.useState<FlywheelStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const headers = { 'x-pharma-partner-key': process.env.NEXT_PUBLIC_ENTERPRISE_API_KEY ?? '' };

    fetch('/api/enterprise/flywheel/stats', { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.stats) setFlywheelStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { flywheelStats, loading };
}

// =============================================================================
// MOCK DATA (fallback)
// =============================================================================

const MOCK_COHORT: Array<{ patient: PatientRiskInput; overrides: OverrideHistoryInput }> = [
  {
    patient: { cvdRiskScore: 45, diabetesRiskScore: 18, lastBloodPressureCheck: new Date(Date.now() - 30 * 86400000), lastCholesterolTest: null, lastHbA1c: new Date(Date.now() - 400 * 86400000), lastPhysicalExam: new Date(Date.now() - 100 * 86400000), tobaccoUse: true, tobaccoPackYears: 15, alcoholUse: false, alcoholDrinksPerWeek: null, physicalActivityMinutesWeek: 40, bmi: 31, ageYears: 67 },
    overrides: { totalOverrides: 4, hardBlockOverrides: 2, totalRulesEvaluated: 27 },
  },
  {
    patient: { cvdRiskScore: 12, diabetesRiskScore: 6, lastBloodPressureCheck: new Date(Date.now() - 60 * 86400000), lastCholesterolTest: new Date(Date.now() - 90 * 86400000), lastHbA1c: new Date(Date.now() - 180 * 86400000), lastPhysicalExam: new Date(Date.now() - 200 * 86400000), tobaccoUse: false, tobaccoPackYears: null, alcoholUse: true, alcoholDrinksPerWeek: 5, physicalActivityMinutesWeek: 200, bmi: 23, ageYears: 34 },
    overrides: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 15 },
  },
  {
    patient: { cvdRiskScore: 78, diabetesRiskScore: 22, lastBloodPressureCheck: null, lastCholesterolTest: null, lastHbA1c: null, lastPhysicalExam: null, tobaccoUse: true, tobaccoPackYears: 30, alcoholUse: true, alcoholDrinksPerWeek: 18, physicalActivityMinutesWeek: 0, bmi: 38, ageYears: 71 },
    overrides: { totalOverrides: 7, hardBlockOverrides: 3, totalRulesEvaluated: 27 },
  },
  {
    patient: { cvdRiskScore: 5, diabetesRiskScore: 3, lastBloodPressureCheck: new Date(Date.now() - 15 * 86400000), lastCholesterolTest: new Date(Date.now() - 45 * 86400000), lastHbA1c: new Date(Date.now() - 60 * 86400000), lastPhysicalExam: new Date(Date.now() - 30 * 86400000), tobaccoUse: false, tobaccoPackYears: null, alcoholUse: false, alcoholDrinksPerWeek: null, physicalActivityMinutesWeek: 300, bmi: 21.5, ageYears: 28 },
    overrides: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 10 },
  },
  {
    patient: { cvdRiskScore: 55, diabetesRiskScore: 16, lastBloodPressureCheck: new Date(Date.now() - 380 * 86400000), lastCholesterolTest: null, lastHbA1c: new Date(Date.now() - 500 * 86400000), lastPhysicalExam: new Date(Date.now() - 400 * 86400000), tobaccoUse: true, tobaccoPackYears: 20, alcoholUse: true, alcoholDrinksPerWeek: 12, physicalActivityMinutesWeek: 30, bmi: 33, ageYears: 58 },
    overrides: { totalOverrides: 5, hardBlockOverrides: 2, totalRulesEvaluated: 27 },
  },
  {
    patient: { cvdRiskScore: 62, diabetesRiskScore: 20, lastBloodPressureCheck: new Date(Date.now() - 500 * 86400000), lastCholesterolTest: null, lastHbA1c: null, lastPhysicalExam: new Date(Date.now() - 600 * 86400000), tobaccoUse: true, tobaccoPackYears: 25, alcoholUse: true, alcoholDrinksPerWeek: 14, physicalActivityMinutesWeek: 10, bmi: 35, ageYears: 65 },
    overrides: { totalOverrides: 6, hardBlockOverrides: 3, totalRulesEvaluated: 27 },
  },
  {
    patient: { cvdRiskScore: 28, diabetesRiskScore: 10, lastBloodPressureCheck: new Date(Date.now() - 100 * 86400000), lastCholesterolTest: new Date(Date.now() - 200 * 86400000), lastHbA1c: new Date(Date.now() - 300 * 86400000), lastPhysicalExam: new Date(Date.now() - 150 * 86400000), tobaccoUse: false, tobaccoPackYears: null, alcoholUse: true, alcoholDrinksPerWeek: 8, physicalActivityMinutesWeek: 90, bmi: 26.5, ageYears: 48 },
    overrides: { totalOverrides: 1, hardBlockOverrides: 0, totalRulesEvaluated: 20 },
  },
  {
    patient: { cvdRiskScore: 88, diabetesRiskScore: 24, lastBloodPressureCheck: null, lastCholesterolTest: null, lastHbA1c: null, lastPhysicalExam: null, tobaccoUse: true, tobaccoPackYears: 40, alcoholUse: true, alcoholDrinksPerWeek: 21, physicalActivityMinutesWeek: 0, bmi: 42, ageYears: 74 },
    overrides: { totalOverrides: 9, hardBlockOverrides: 5, totalRulesEvaluated: 27 },
  },
];

const MONTHLY_TREND = [
  { month: 'Sep', avgRisk: 34, assessments: 120, costBRL: 45000 },
  { month: 'Oct', avgRisk: 37, assessments: 185, costBRL: 62000 },
  { month: 'Nov', avgRisk: 39, assessments: 240, costBRL: 78000 },
  { month: 'Dec', avgRisk: 42, assessments: 310, costBRL: 95000 },
  { month: 'Jan', avgRisk: 41, assessments: 380, costBRL: 110000 },
  { month: 'Feb', avgRisk: 43, assessments: 425, costBRL: 128000 },
];

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

// =============================================================================
// COLORS
// =============================================================================

const TIER_COLORS: Record<RiskTier, string> = {
  LOW: '#22c55e', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
};

const CATEGORY_COLORS: Record<string, string> = {
  STANDARD: '#818cf8',
  DIAGNOSTIC: '#38bdf8',
  SPECIALIZED: '#f59e0b',
  SURGICAL: '#ef4444',
  PREVENTIVE: '#22c55e',
  REHABILITATION: '#14b8a6',
  MENTAL_HEALTH: '#a78bfa',
};

const TOOLTIP_STYLE = {
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

// =============================================================================
// PAGE
// =============================================================================

export default function AnalyticsPage() {
  const { flywheelStats, loading } = useAnalyticsData();
  const isLive = flywheelStats !== null && flywheelStats.totalAssessments > 0;

  // Compute all results
  const results = React.useMemo(
    () => MOCK_COHORT.map((m) => calculateCompositeRisk(m.patient, m.overrides)),
    [],
  );

  // Tier distribution — use live flywheel data when available
  const tierCounts: Record<string, number> = isLive
    ? flywheelStats!.byTier
    : (() => {
        const counts: Record<RiskTier, number> = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
        for (const r of results) counts[r.riskTier]++;
        return counts;
      })();
  const pieData = (Object.entries(tierCounts) as Array<[RiskTier, number]>)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => ({ name: tier, value: count, color: TIER_COLORS[tier] }));

  // Domain averages for radar chart
  const domainAvgs = React.useMemo(() => {
    const totals = { cardiovascular: 0, metabolic: 0, screeningCompliance: 0, lifestyle: 0, overrideRisk: 0 };
    for (const r of results) {
      totals.cardiovascular += r.domainBreakdown.cardiovascular;
      totals.metabolic += r.domainBreakdown.metabolic;
      totals.screeningCompliance += r.domainBreakdown.screeningCompliance;
      totals.lifestyle += r.domainBreakdown.lifestyle;
      totals.overrideRisk += r.domainBreakdown.overrideRisk;
    }
    const n = results.length;
    return [
      { domain: 'Cardiovascular', score: Math.round((totals.cardiovascular / n) * 10) / 10, max: 30 },
      { domain: 'Metabolic', score: Math.round((totals.metabolic / n) * 10) / 10, max: 20 },
      { domain: 'Screening', score: Math.round((totals.screeningCompliance / n) * 10) / 10, max: 15 },
      { domain: 'Lifestyle', score: Math.round((totals.lifestyle / n) * 10) / 10, max: 20 },
      { domain: 'Override Risk', score: Math.round((totals.overrideRisk / n) * 10) / 10, max: 15 },
    ];
  }, [results]);

  // TUSS cost by category
  const allCodes = getAllCodes();
  const categoryCosts = React.useMemo(() => {
    const cats: Record<string, { count: number; totalBRL: number; totalBOB: number; avgWeight: number }> = {};
    for (const code of allCodes) {
      if (!cats[code.category]) {
        cats[code.category] = { count: 0, totalBRL: 0, totalBOB: 0, avgWeight: 0 };
      }
      cats[code.category].count++;
      cats[code.category].totalBRL += code.baseRateBRL ?? 0;
      cats[code.category].totalBOB += code.baseRateBOB;
      cats[code.category].avgWeight += code.actuarialWeight;
    }
    return Object.entries(cats).map(([cat, data]) => ({
      name: cat,
      count: data.count,
      avgCostBRL: Math.round(data.totalBRL / data.count),
      avgWeight: Math.round((data.avgWeight / data.count) * 100) / 100,
      fill: CATEGORY_COLORS[cat] ?? '#94a3b8',
    }));
  }, [allCodes]);

  // Top 10 procedures by actuarial weight
  const topProcedures = React.useMemo(
    () => [...allCodes].sort((a, b) => b.actuarialWeight - a.actuarialWeight).slice(0, 10),
    [allCodes],
  );

  // Aggregate stats
  const avgScore = Math.round((results.reduce((s, r) => s + r.compositeScore, 0) / results.length) * 100) / 100;
  const avgConfidence = Math.round((results.reduce((s, r) => s + r.confidence, 0) / results.length) * 100);
  const totalCatalogBRL = allCodes.reduce((s, c) => s + (c.baseRateBRL ?? 0), 0);

  return (
    <div className="relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-500/6 to-indigo-500/6 dark:from-purple-900/12 dark:to-indigo-900/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-blue-400/4 to-indigo-500/4 dark:from-blue-900/8 dark:to-indigo-900/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.header {...fadeUp} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-purple-200/50 dark:border-purple-800/30 backdrop-blur-sm mb-4">
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : isLive ? 'bg-purple-500' : 'bg-neutral-400'} animate-pulse`} />
            <span className="text-[10px] font-bold tracking-widest uppercase text-purple-600 dark:text-purple-400">
              {loading ? 'Loading...' : isLive ? 'Live Data' : 'Demo Mode'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Actuarial Analytics
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl">
            Population risk distribution, domain-level insights, procedure cost analysis, and 6-month trend tracking.
          </p>
        </motion.header>

        <motion.div {...stagger} initial="initial" animate="animate" className="space-y-8">
          {/* KPI Strip */}
          <motion.section {...fadeUp}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Cohort Size" value={String(isLive ? flywheelStats!.totalAssessments : results.length)} sublabel={isLive ? 'flywheel assessments' : 'active patients'} />
              <KpiCard label="Avg Risk Score" value={String(avgScore)} sublabel={avgScore >= 50 ? 'HIGH cohort' : avgScore >= 25 ? 'MODERATE cohort' : 'LOW cohort'} />
              <KpiCard label="Avg Confidence" value={`${avgConfidence}%`} sublabel="data completeness" />
              <KpiCard label="TUSS Catalog" value={`${allCodes.length} codes`} sublabel={`R$ ${totalCatalogBRL.toLocaleString('pt-BR')} total`} />
            </div>
          </motion.section>

          {/* Row 1: Tier Distribution + Domain Radar */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Population" title="Risk Distribution & Domain Profile" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* Tier Pie */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Tier Breakdown</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>

              {/* Domain Radar */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Average Domain Scores</div>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={domainAvgs} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="rgba(0,0,0,0.06)" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <PolarRadiusAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                    <Radar name="Avg Score" dataKey="score" stroke="#818cf8" fill="#818cf8" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.section>

          {/* Row 2: Monthly Trend */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Trend" title="6-Month Risk & Cost Trajectory" />
            <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5 mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={MONTHLY_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="risk" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="risk" type="monotone" dataKey="avgRisk" stroke="#818cf8" strokeWidth={2} name="Avg Risk Score" dot={{ r: 3 }} />
                  <Line yAxisId="cost" type="monotone" dataKey="costBRL" stroke="#f59e0b" strokeWidth={2} name="Est. Cost (BRL)" dot={{ r: 3 }} />
                  <Line yAxisId="risk" type="monotone" dataKey="assessments" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" name="Assessments" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* Row 3: TUSS Category Cost + Top Procedures */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Procedures" title="TUSS Cost Analysis" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* Cost by Category */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Avg Cost by Category (BRL)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryCosts} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={85} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="avgCostBRL" radius={[0, 6, 6, 0]} name="Avg Cost (BRL)">
                      {categoryCosts.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {categoryCosts.map((c) => (
                    <div key={c.name} className="text-[10px] text-neutral-400">
                      <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: c.fill }} />
                      {c.name}: {c.count} codes, avg wt {c.avgWeight}
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 10 Procedures by Actuarial Weight */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Top 10 Procedures by Actuarial Weight</div>
                <div className="space-y-2">
                  {topProcedures.map((proc, i) => (
                    <div key={proc.code} className="flex items-center gap-3">
                      <span className="text-[10px] text-neutral-400 tabular-nums w-4 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate pr-2">{proc.description}</span>
                          <span className="text-xs font-bold tabular-nums text-neutral-800 dark:text-neutral-100 shrink-0">{proc.actuarialWeight}</span>
                        </div>
                        <div className="mt-0.5 h-1 rounded-full bg-neutral-100 dark:bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${proc.actuarialWeight * 100}%`,
                              backgroundColor: CATEGORY_COLORS[proc.category] ?? '#94a3b8',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Row 4: Severity coverage */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Coverage" title="Severity Distribution Across Catalog" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {['BLOCK', 'FLAG', 'ATTESTATION_REQUIRED', 'PASS'].map((sev) => {
                const codes = getTUSSBySeverity(sev);
                const pct = Math.round((codes.length / allCodes.length) * 100);
                return (
                  <div key={sev} className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-4">
                    <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">{sev.replace(/_/g, ' ')}</div>
                    <div className="text-2xl font-bold tabular-nums text-neutral-800 dark:text-neutral-100">{codes.length}</div>
                    <div className="text-[10px] text-neutral-400">{pct}% of catalog</div>
                    <div className="mt-2 h-1 rounded-full bg-neutral-100 dark:bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </motion.div>

        {/* Footer */}
        <motion.footer {...fadeUp} className="mt-16 pt-8 border-t border-neutral-200/40 dark:border-white/5">
          <p className="text-xs text-neutral-400 text-center">
            Cortex by Holi Labs &mdash; Actuarial Analytics Engine &mdash; {allCodes.length} TUSS codes, {results.length} cohort members
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
      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400">{label}</span>
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
