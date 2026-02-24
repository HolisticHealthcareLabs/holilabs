'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
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
} from 'recharts';

// =============================================================================
// MOCK FALLBACK DATA — used when flywheel store is empty
// =============================================================================

const MOCK_ASSESSMENTS = Array.from({ length: 60 }, (_, i) => {
  const daysAgo = 60 - i;
  const date = new Date(Date.now() - daysAgo * 86400000);
  const tiers = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
  const tier = tiers[Math.floor(Math.random() * 4)];
  const score = tier === 'LOW' ? 10 + Math.random() * 14
    : tier === 'MODERATE' ? 25 + Math.random() * 24
    : tier === 'HIGH' ? 50 + Math.random() * 24
    : 75 + Math.random() * 24;
  return {
    id: `fly-${i + 1}`,
    anonymizedPatientId: `anon-${(i * 7 + 3).toString(16).padStart(4, '0')}-${(i * 13).toString(16).padStart(4, '0')}`,
    compositeRiskScore: Math.round(score * 10) / 10,
    riskTier: tier,
    trafficLightColor: tier === 'CRITICAL' ? 'RED' : tier === 'HIGH' ? 'YELLOW' : 'GREEN',
    createdAt: date.toISOString(),
  };
});

const MOCK_USAGE = [
  { day: 'Mon', requests: 42, avgMs: 120 },
  { day: 'Tue', requests: 58, avgMs: 115 },
  { day: 'Wed', requests: 35, avgMs: 132 },
  { day: 'Thu', requests: 72, avgMs: 108 },
  { day: 'Fri', requests: 61, avgMs: 125 },
  { day: 'Sat', requests: 18, avgMs: 98 },
  { day: 'Sun', requests: 12, avgMs: 95 },
];

// =============================================================================
// TYPES
// =============================================================================

interface FlywheelAssessment {
  id: string;
  anonymizedPatientId: string;
  compositeRiskScore: number;
  riskTier: string;
  trafficLightColor: string;
  createdAt: string;
}

interface FlywheelStats {
  totalAssessments: number;
  byTier: Record<string, number>;
  latestAt: string | null;
}

interface UsageTrendPoint {
  period: string;
  requests: number;
  patientAssessments: number;
  avgResponseTimeMs: number;
}

// =============================================================================
// DATA FETCHING HOOK
// =============================================================================

function useFlywheelData() {
  const [assessments, setAssessments] = React.useState<FlywheelAssessment[] | null>(null);
  const [stats, setStats] = React.useState<FlywheelStats | null>(null);
  const [usageTrend, setUsageTrend] = React.useState<UsageTrendPoint[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const headers = { 'x-pharma-partner-key': process.env.NEXT_PUBLIC_ENTERPRISE_API_KEY ?? '' };

    Promise.allSettled([
      fetch('/api/enterprise/flywheel/stats', { headers }).then((r) => r.ok ? r.json() : null),
      fetch('/api/enterprise/flywheel/assessments?limit=100', { headers }).then((r) => r.ok ? r.json() : null),
      fetch('/api/enterprise/usage?period=day', { headers }).then((r) => r.ok ? r.json() : null),
    ]).then(([statsResult, assessmentsResult, usageResult]) => {
      if (statsResult.status === 'fulfilled' && statsResult.value?.stats) {
        setStats(statsResult.value.stats);
      }
      if (assessmentsResult.status === 'fulfilled' && assessmentsResult.value?.assessments?.length > 0) {
        setAssessments(assessmentsResult.value.assessments);
      }
      if (usageResult.status === 'fulfilled' && usageResult.value?.trend) {
        setUsageTrend(usageResult.value.trend);
      }
      setLoading(false);
    });
  }, []);

  return { assessments, stats, usageTrend, loading };
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

const TIER_COLORS: Record<string, string> = {
  LOW: '#22c55e', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
};

// =============================================================================
// PAGE
// =============================================================================

export default function FlywheelPage() {
  const { assessments: liveAssessments, stats: liveStats, usageTrend, loading } = useFlywheelData();

  // Use live data or fallback to mock
  const dataSource = liveAssessments ?? MOCK_ASSESSMENTS;
  const isLive = liveAssessments !== null && liveAssessments.length > 0;

  // Stats
  const totalAssessments = liveStats?.totalAssessments ?? dataSource.length;
  const today = new Date().toISOString().slice(0, 10);
  const assessmentsToday = dataSource.filter((a) => a.createdAt.startsWith(today)).length;
  const avgRisk = dataSource.length > 0
    ? Math.round((dataSource.reduce((s, a) => s + a.compositeRiskScore, 0) / dataSource.length) * 10) / 10
    : 0;
  const firstDay = dataSource.length > 0 ? new Date(dataSource[dataSource.length - 1].createdAt) : new Date();
  const daySpan = Math.max(1, Math.ceil((Date.now() - firstDay.getTime()) / 86400000));
  const growthRate = Math.round((totalAssessments / daySpan) * 10) / 10;

  // Tier distribution
  const tierCounts = liveStats?.byTier ?? (() => {
    const counts: Record<string, number> = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    for (const a of dataSource) counts[a.riskTier] = (counts[a.riskTier] ?? 0) + 1;
    return counts;
  })();
  const pieData = Object.entries(tierCounts)
    .filter(([, c]) => c > 0)
    .map(([tier, count]) => ({ name: tier, value: count, color: TIER_COLORS[tier] }));

  // Aggregate by day for the area chart
  const dailyAgg = React.useMemo(() => {
    const buckets = new Map<string, { count: number; totalScore: number }>();
    for (const a of dataSource) {
      const day = a.createdAt.slice(0, 10);
      const b = buckets.get(day) ?? { count: 0, totalScore: 0 };
      b.count++;
      b.totalScore += a.compositeRiskScore;
      buckets.set(day, b);
    }
    let cumulative = 0;
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .filter((_, i, arr) => i % 3 === 0 || i === arr.length - 1)
      .map(([day, b]) => {
        cumulative += b.count;
        return {
          day: day.slice(5),
          assessments: b.count,
          cumulative,
          avgRisk: Math.round((b.totalScore / b.count) * 10) / 10,
        };
      });
  }, [dataSource]);

  // API usage — use live trend or fallback to mock
  const usageData = React.useMemo(() => {
    if (usageTrend && usageTrend.length > 0) {
      return usageTrend.map((t) => ({
        day: t.period.slice(5),
        requests: t.requests,
        avgMs: t.avgResponseTimeMs,
      }));
    }
    return MOCK_USAGE;
  }, [usageTrend]);

  const latest20 = [...dataSource].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);

  return (
    <div className="relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-500/6 to-teal-500/6 dark:from-emerald-900/12 dark:to-teal-900/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-blue-400/4 to-indigo-500/4 dark:from-blue-900/8 dark:to-indigo-900/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.header {...fadeUp} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-emerald-200/50 dark:border-emerald-800/30 backdrop-blur-sm mb-4">
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : isLive ? 'bg-emerald-500' : 'bg-neutral-400'} animate-pulse`} />
            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
              {loading ? 'Loading...' : isLive ? 'Live Data' : 'Demo Mode'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Data Flywheel
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl">
            Every enterprise assessment is persisted and compounded. The dataset grows with every API call.
          </p>
        </motion.header>

        <motion.div {...stagger} initial="initial" animate="animate" className="space-y-8">
          {/* KPI Strip */}
          <motion.section {...fadeUp}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Assessments" value={String(totalAssessments)} sublabel="persisted entries" />
              <KpiCard label="Today" value={String(assessmentsToday)} sublabel="assessments today" />
              <KpiCard label="Avg Risk Score" value={String(avgRisk)} sublabel={avgRisk >= 50 ? 'HIGH cohort' : avgRisk >= 25 ? 'MODERATE' : 'LOW'} />
              <KpiCard label="Growth Rate" value={`${growthRate}/day`} sublabel="flywheel acceleration" />
            </div>
          </motion.section>

          {/* Flywheel Curve + Tier Pie */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Flywheel" title="Assessment Accumulation Curve" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="lg:col-span-2 rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Cumulative Assessments</div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyAgg}>
                    <defs>
                      <linearGradient id="flywheelGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} fill="url(#flywheelGrad)" name="Cumulative" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Tier Distribution</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1 text-[10px] text-neutral-500">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* API Usage */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Usage" title="API Request Volume" />
            <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5 mt-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={usageData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="requests" fill="#818cf8" radius={[4, 4, 0, 0]} name="Requests" />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-center text-[10px] text-neutral-400 mt-2">
                Avg response time: {Math.round(usageData.reduce((s, u) => s + u.avgMs, 0) / usageData.length)}ms
              </div>
            </div>
          </motion.section>

          {/* Latest Assessments Table */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Recent" title="Latest 20 Assessments" />
            <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md overflow-hidden mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200/40 dark:border-white/5">
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Patient ID</th>
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Score</th>
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Tier</th>
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Light</th>
                      <th className="text-left px-4 py-2.5 font-medium text-neutral-400 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest20.map((a) => (
                      <tr key={a.id} className="border-b border-neutral-100/60 dark:border-white/[0.03] hover:bg-neutral-50/50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-2 font-mono text-neutral-600 dark:text-neutral-300">{a.anonymizedPatientId}</td>
                        <td className="px-4 py-2 tabular-nums font-semibold text-neutral-800 dark:text-neutral-100">{a.compositeRiskScore}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${TIER_COLORS[a.riskTier]}18`, color: TIER_COLORS[a.riskTier] }}>
                            {a.riskTier}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`w-2.5 h-2.5 rounded-full inline-block ${a.trafficLightColor === 'RED' ? 'bg-red-500' : a.trafficLightColor === 'YELLOW' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        </td>
                        <td className="px-4 py-2 text-neutral-400">{new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
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
            Cortex by Holi Labs &mdash; Data Flywheel &mdash; {totalAssessments} persisted assessments
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
      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">{label}</span>
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
