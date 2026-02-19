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
  AreaChart,
  Area,
} from 'recharts';
import { RevenueImpactBadge } from '@/components/ui/finance/RevenueImpactBadge';
import {
  getAllCodes,
  estimateClaimCost,
  type TUSSCode,
} from '@/lib/finance/tuss-lookup';
import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
  type RiskTier,
} from '@/services/risk-calculator.service';

// =============================================================================
// MOCK DATA — Simulated insurer cohort
// =============================================================================

const MOCK_COHORT: Array<{ id: string; patient: PatientRiskInput; overrides: OverrideHistoryInput }> = [
  {
    id: 'cohort-001',
    patient: {
      cvdRiskScore: 45, diabetesRiskScore: 18, lastBloodPressureCheck: new Date(Date.now() - 30 * 86400000),
      lastCholesterolTest: null, lastHbA1c: new Date(Date.now() - 400 * 86400000), lastPhysicalExam: new Date(Date.now() - 100 * 86400000),
      tobaccoUse: true, tobaccoPackYears: 15, alcoholUse: false, alcoholDrinksPerWeek: null,
      physicalActivityMinutesWeek: 40, bmi: 31, ageYears: 67,
    },
    overrides: { totalOverrides: 4, hardBlockOverrides: 2, totalRulesEvaluated: 27 },
  },
  {
    id: 'cohort-002',
    patient: {
      cvdRiskScore: 12, diabetesRiskScore: 6, lastBloodPressureCheck: new Date(Date.now() - 60 * 86400000),
      lastCholesterolTest: new Date(Date.now() - 90 * 86400000), lastHbA1c: new Date(Date.now() - 180 * 86400000), lastPhysicalExam: new Date(Date.now() - 200 * 86400000),
      tobaccoUse: false, tobaccoPackYears: null, alcoholUse: true, alcoholDrinksPerWeek: 5,
      physicalActivityMinutesWeek: 200, bmi: 23, ageYears: 34,
    },
    overrides: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 15 },
  },
  {
    id: 'cohort-003',
    patient: {
      cvdRiskScore: 78, diabetesRiskScore: 22, lastBloodPressureCheck: null,
      lastCholesterolTest: null, lastHbA1c: null, lastPhysicalExam: null,
      tobaccoUse: true, tobaccoPackYears: 30, alcoholUse: true, alcoholDrinksPerWeek: 18,
      physicalActivityMinutesWeek: 0, bmi: 38, ageYears: 71,
    },
    overrides: { totalOverrides: 7, hardBlockOverrides: 3, totalRulesEvaluated: 27 },
  },
  {
    id: 'cohort-004',
    patient: {
      cvdRiskScore: 5, diabetesRiskScore: 3, lastBloodPressureCheck: new Date(Date.now() - 15 * 86400000),
      lastCholesterolTest: new Date(Date.now() - 45 * 86400000), lastHbA1c: new Date(Date.now() - 60 * 86400000), lastPhysicalExam: new Date(Date.now() - 30 * 86400000),
      tobaccoUse: false, tobaccoPackYears: null, alcoholUse: false, alcoholDrinksPerWeek: null,
      physicalActivityMinutesWeek: 300, bmi: 21.5, ageYears: 28,
    },
    overrides: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 10 },
  },
  {
    id: 'cohort-005',
    patient: {
      cvdRiskScore: 55, diabetesRiskScore: 16, lastBloodPressureCheck: new Date(Date.now() - 380 * 86400000),
      lastCholesterolTest: null, lastHbA1c: new Date(Date.now() - 500 * 86400000), lastPhysicalExam: new Date(Date.now() - 400 * 86400000),
      tobaccoUse: true, tobaccoPackYears: 20, alcoholUse: true, alcoholDrinksPerWeek: 12,
      physicalActivityMinutesWeek: 30, bmi: 33, ageYears: 58,
    },
    overrides: { totalOverrides: 5, hardBlockOverrides: 2, totalRulesEvaluated: 27 },
  },
];

const MOCK_API_USAGE = [
  { day: 'Mon', requests: 124, assessments: 89 },
  { day: 'Tue', requests: 156, assessments: 112 },
  { day: 'Wed', requests: 203, assessments: 178 },
  { day: 'Thu', requests: 189, assessments: 145 },
  { day: 'Fri', requests: 245, assessments: 201 },
  { day: 'Sat', requests: 67, assessments: 48 },
  { day: 'Sun', requests: 42, assessments: 31 },
];

const MOCK_DAILY_RISK_TREND = [
  { date: 'Feb 6', avgRisk: 38 },
  { date: 'Feb 7', avgRisk: 41 },
  { date: 'Feb 8', avgRisk: 39 },
  { date: 'Feb 9', avgRisk: 44 },
  { date: 'Feb 10', avgRisk: 42 },
  { date: 'Feb 11', avgRisk: 46 },
  { date: 'Feb 12', avgRisk: 43 },
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
// TIER COLORS
// =============================================================================

const TIER_COLORS: Record<RiskTier, string> = {
  LOW: '#22c55e',
  MODERATE: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const TIER_TEXT: Record<RiskTier, string> = {
  LOW: 'text-green-500',
  MODERATE: 'text-yellow-500',
  HIGH: 'text-orange-500',
  CRITICAL: 'text-red-500',
};

// =============================================================================
// PAGE
// =============================================================================

export default function EnterpriseDashboardPage() {
  // Compute risk for each cohort member
  const cohortResults = React.useMemo(
    () =>
      MOCK_COHORT.map((m) => ({
        id: m.id,
        result: calculateCompositeRisk(m.patient, m.overrides),
      })),
    [],
  );

  const scores = cohortResults.map((r) => r.result.compositeScore);
  const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
  const avgConfidence =
    Math.round(
      (cohortResults.reduce((sum, r) => sum + r.result.confidence, 0) / cohortResults.length) * 100,
    ) / 100;

  // Tier distribution for pie chart
  const tierCounts: Record<RiskTier, number> = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
  for (const r of cohortResults) tierCounts[r.result.riskTier]++;
  const pieData = (Object.entries(tierCounts) as Array<[RiskTier, number]>)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => ({ name: tier, value: count, color: TIER_COLORS[tier] }));

  // Cohort classification
  const cohortTier: RiskTier = avgScore >= 75 ? 'CRITICAL' : avgScore >= 50 ? 'HIGH' : avgScore >= 25 ? 'MODERATE' : 'LOW';

  // TUSS value delivered
  const allCodes = getAllCodes();
  const costEstimate = estimateClaimCost(
    allCodes.map((c) => c.code),
    'BLOCK',
  );

  // Total API requests this week
  const totalRequests = MOCK_API_USAGE.reduce((sum, d) => sum + d.requests, 0);
  const totalAssessments = MOCK_API_USAGE.reduce((sum, d) => sum + d.assessments, 0);

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f] relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/8 to-purple-500/8 dark:from-indigo-900/15 dark:to-purple-900/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-400/6 to-indigo-500/6 dark:from-blue-900/10 dark:to-indigo-900/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* ============================================================= */}
        {/* HEADER */}
        {/* ============================================================= */}
        <motion.header {...fadeUp} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-indigo-200/50 dark:border-indigo-800/30 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
              Enterprise Partner
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1]">
            Actuarial{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Command Center
            </span>
          </h1>
          <p className="mt-3 text-base text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Real-time population risk intelligence, API consumption metrics, and actuarial value tracking
            — powered by the Cortex Risk Engine.
          </p>
        </motion.header>

        <motion.div {...stagger} initial="initial" animate="animate" className="space-y-10">
          {/* ============================================================= */}
          {/* KPI STRIP */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Cohort Risk Score" value={String(avgScore)} sublabel={cohortTier} color={TIER_TEXT[cohortTier]} />
              <KpiCard label="Avg Confidence" value={`${Math.round(avgConfidence * 100)}%`} sublabel="Data Completeness" />
              <KpiCard label="API Requests (7d)" value={totalRequests.toLocaleString()} sublabel={`${totalAssessments} assessments`} />
              <KpiCard label="Value Delivered" value={`Bs. ${costEstimate.estimatedCostBOB.toLocaleString()}`} sublabel={`${costEstimate.codeCount} TUSS codes`} />
            </div>
          </motion.section>

          {/* ============================================================= */}
          {/* API USAGE + RISK TREND — Side by Side */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Analytics" title="API Usage & Risk Trend" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* API Usage Bar Chart */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">API Requests This Week</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={MOCK_API_USAGE} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Bar dataKey="requests" fill="#818cf8" radius={[6, 6, 0, 0]} name="Requests" />
                    <Bar dataKey="assessments" fill="#c4b5fd" radius={[6, 6, 0, 0]} name="Assessments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Trend Area Chart */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Average Population Risk (7d)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={MOCK_DAILY_RISK_TREND}>
                    <defs>
                      <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Area type="monotone" dataKey="avgRisk" stroke="#818cf8" fill="url(#riskGradient)" strokeWidth={2} name="Avg Risk Score" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.section>

          {/* ============================================================= */}
          {/* POPULATION RISK DISTRIBUTION */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Cohort" title="Population Risk Distribution" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              {/* Pie Chart */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5 flex flex-col items-center justify-center">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Tier Breakdown</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Patient Risk Table */}
              <div className="lg:col-span-2 rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Individual Assessments</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200/40 dark:border-white/5">
                        <th className="text-left py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Patient</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Score</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Tier</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Confidence</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Top Domain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortResults.map((r) => {
                        const topDomain = Object.entries(r.result.domainBreakdown).sort(
                          ([, a], [, b]) => (b as number) - (a as number),
                        )[0];
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-neutral-100/40 dark:border-white/[0.03] hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">{r.id}</td>
                            <td className="py-2.5 px-3 tabular-nums font-semibold text-neutral-800 dark:text-neutral-100">{r.result.compositeScore}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  r.result.riskTier === 'CRITICAL'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : r.result.riskTier === 'HIGH'
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                      : r.result.riskTier === 'MODERATE'
                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}
                              >
                                {r.result.riskTier}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 tabular-nums text-neutral-500 dark:text-neutral-400">
                              {Math.round(r.result.confidence * 100)}%
                            </td>
                            <td className="py-2.5 px-3 text-xs text-neutral-500 dark:text-neutral-400">
                              {topDomain[0].replace(/([A-Z])/g, ' $1').trim()}
                              <span className="ml-1 text-neutral-400">({topDomain[1] as number})</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ============================================================= */}
          {/* TUSS VALUE DELIVERED */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Revenue" title="TUSS Value Delivered" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {allCodes.map((code: TUSSCode) => (
                <motion.div
                  key={code.code}
                  whileHover={{ scale: 1.02 }}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md transition-colors hover:border-indigo-300/40 dark:hover:border-indigo-700/30"
                >
                  <RevenueImpactBadge tussCode={code.code} showRate size="md" />
                  <span className="text-xs text-center text-neutral-500 dark:text-neutral-400 leading-tight">
                    {code.description}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                    <span>Weight: {code.actuarialWeight}</span>
                    <span className="w-px h-3 bg-neutral-200 dark:bg-neutral-700" />
                    <span>{code.applicableSeverities.join(', ')}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ============================================================= */}
          {/* API ENDPOINT REFERENCE */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Integration" title="API Endpoints" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <EndpointCard
                method="POST"
                path="/api/enterprise/risk-assessment"
                description="Single-patient risk assessment. Returns CompositeRiskScore, tier classification, and optional TUSS cost estimate."
              />
              <EndpointCard
                method="POST"
                path="/api/enterprise/bulk-assessment"
                description="Batch cohort assessment (max 100). Returns population-level summary with tier distribution and aggregate cost."
              />
            </div>
          </motion.section>
        </motion.div>

        {/* Footer */}
        <motion.footer
          {...fadeUp}
          className="mt-20 pt-8 border-t border-neutral-200/40 dark:border-white/5"
        >
          <p className="text-xs text-neutral-400 text-center">
            Cortex by Holi Labs &mdash; Enterprise Actuarial Intelligence Platform
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
      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
        {label}
      </span>
      <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mt-0.5">
        {title}
      </h2>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string;
  sublabel: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-4">
      <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color ?? 'text-neutral-800 dark:text-neutral-100'}`}>
        {value}
      </div>
      <div className="text-[10px] text-neutral-400 mt-1">{sublabel}</div>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
          {method}
        </span>
        <code className="text-xs font-mono text-neutral-600 dark:text-neutral-300">{path}</code>
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-neutral-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Auth: <code className="text-neutral-500">x-pharma-partner-key</code>
      </div>
    </div>
  );
}
