'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle, Clock, CheckCircle2,
  ChevronDown, Search, RefreshCw,
  FileText, User, Calendar, Star, X,
} from 'lucide-react';

const JoyrideClient = lazy(() => import('react-joyride'));

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueGap {
  id: string;
  patientId: string;
  patientName?: string;
  procedure: {
    tissCode?: string;
    cptCode?: string;
    description: string;
    descriptionPortuguese?: string;
    confidence: number;
    sourceText: string;
    sourceLocation: string;
    estimatedValue: number;
    estimatedValueFormatted: string;
    category: string;
  };
  sourceNoteId: string;
  documentedAt: string;
  status: 'OPEN' | 'REVIEWED' | 'BILLED' | 'DISMISSED';
}

interface AuditorSummary {
  totalGaps: number;
  totalPotentialValue: number;
  totalPotentialValueFormatted: string;
  byStatus: { open: number; reviewed: number; billed: number; dismissed: number };
  byCategory: Record<string, { count: number; value: number; valueFormatted: string }>;
  topProcedures: Array<{ description: string; count: number; totalValue: number; totalValueFormatted: string }>;
  periodStart: string;
  periodEnd: string;
}

type MetricTab = 'revenue' | 'unbilled' | 'pending' | 'recovered';

// ─── Demo data for instant render ─────────────────────────────────────────────

const DEMO_SUMMARY: AuditorSummary = {
  totalGaps: 14,
  totalPotentialValue: 4280,
  totalPotentialValueFormatted: 'R$ 4.280,00',
  byStatus: { open: 6, reviewed: 3, billed: 4, dismissed: 1 },
  byCategory: {
    IMAGING: { count: 4, value: 1600, valueFormatted: 'R$ 1.600,00' },
    LABORATORY: { count: 5, value: 950, valueFormatted: 'R$ 950,00' },
    PROCEDURE: { count: 3, value: 1230, valueFormatted: 'R$ 1.230,00' },
    CONSULTATION: { count: 2, value: 500, valueFormatted: 'R$ 500,00' },
  },
  topProcedures: [
    { description: 'Echocardiogram (Transthoracic)', count: 3, totalValue: 900, totalValueFormatted: 'R$ 900,00' },
    { description: 'Complete Blood Panel (CBC)', count: 4, totalValue: 480, totalValueFormatted: 'R$ 480,00' },
    { description: 'Chest X-Ray (PA + Lateral)', count: 2, totalValue: 340, totalValueFormatted: 'R$ 340,00' },
    { description: 'Renal Function Panel (eGFR + BUN)', count: 3, totalValue: 270, totalValueFormatted: 'R$ 270,00' },
  ],
  periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
  periodEnd: new Date().toISOString(),
};

const DEMO_GAPS: RevenueGap[] = [
  { id: 'gap-1', patientId: 'P001', patientName: 'James O\'Brien', procedure: { tissCode: '40301010', description: 'Echocardiogram (TTE)', confidence: 0.94, sourceText: 'Ordering urgent ECG, Troponin I series, BNP, CMP, and chest X-ray stat', sourceLocation: 'SOAP Note — Encounter 03/05', estimatedValue: 320, estimatedValueFormatted: 'R$ 320,00', category: 'IMAGING' }, sourceNoteId: 'note-001', documentedAt: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'OPEN' },
  { id: 'gap-2', patientId: 'P001', patientName: 'James O\'Brien', procedure: { tissCode: '40302016', description: 'BNP (Brain Natriuretic Peptide)', confidence: 0.91, sourceText: 'BNP ordered to confirm ADHF', sourceLocation: 'SOAP Note — Encounter 03/05', estimatedValue: 85, estimatedValueFormatted: 'R$ 85,00', category: 'LABORATORY' }, sourceNoteId: 'note-001', documentedAt: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'OPEN' },
  { id: 'gap-3', patientId: 'P002', patientName: 'Maria Santos', procedure: { tissCode: '40301024', description: 'Chest X-Ray PA + Lateral', confidence: 0.88, sourceText: 'Chest X-ray showing bilateral pleural effusion', sourceLocation: 'SOAP Note — Encounter 03/04', estimatedValue: 170, estimatedValueFormatted: 'R$ 170,00', category: 'IMAGING' }, sourceNoteId: 'note-002', documentedAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'REVIEWED' },
  { id: 'gap-4', patientId: 'P003', patientName: 'Sofia Reyes', procedure: { tissCode: '40301152', description: 'Lipid Panel (Total + HDL/LDL)', confidence: 0.96, sourceText: 'Annual lipid panel results reviewed', sourceLocation: 'SOAP Note — Encounter 03/06', estimatedValue: 95, estimatedValueFormatted: 'R$ 95,00', category: 'LABORATORY' }, sourceNoteId: 'note-003', documentedAt: new Date(Date.now() - 1 * 86400000).toISOString(), status: 'BILLED' },
  { id: 'gap-5', patientId: 'P004', patientName: 'Robert Chen', procedure: { tissCode: '40302024', description: 'INR / Prothrombin Time', confidence: 0.97, sourceText: 'Warfarin INR check performed', sourceLocation: 'SOAP Note — Encounter 03/06', estimatedValue: 65, estimatedValueFormatted: 'R$ 65,00', category: 'LABORATORY' }, sourceNoteId: 'note-004', documentedAt: new Date(Date.now() - 1 * 86400000).toISOString(), status: 'BILLED' },
  { id: 'gap-6', patientId: 'P002', patientName: 'Maria Santos', procedure: { description: 'Nephrology Follow-Up Consultation', confidence: 0.82, sourceText: 'CKD Stage 3 follow-up with nephrology referral', sourceLocation: 'SOAP Note — Encounter 03/04', estimatedValue: 250, estimatedValueFormatted: 'R$ 250,00', category: 'CONSULTATION' }, sourceNoteId: 'note-002', documentedAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'OPEN' },
];

// ─── Spotlight Tour ───────────────────────────────────────────────────────────

const TOUR_STEPS = [
  { target: '#metric-revenue', title: 'Uncover the Unseen', content: 'Every unbilled procedure is a missed opportunity. We continuously scan your clinical notes to catch revenue that slipped through the cracks.', disableBeacon: true, placement: 'bottom' as const },
  { target: '#metric-unbilled', title: 'Caught in the Net', content: 'Review exact procedures documented in your SOAP notes but absent from your billing ledger. Each one represents real, recoverable value.', placement: 'bottom' as const },
  { target: '#metric-pending', title: 'Precision Control', content: 'Approve or dismiss flagged gaps with a single click before they hit your claims cycle. You decide what gets billed.', placement: 'bottom' as const },
  { target: '#detail-table', title: 'The Complete Picture', content: 'Dive deep into the patient timeline to see exactly where the disconnect happened — from the clinical note to the missing claim.', placement: 'top' as const },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  IMAGING: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400',
  LABORATORY: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
  PROCEDURE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400',
  CONSULTATION: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  THERAPY: 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-400',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  REVIEWED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  BILLED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  DISMISSED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

function filterGapsByTab(gaps: RevenueGap[], tab: MetricTab): RevenueGap[] {
  switch (tab) {
    case 'revenue':   return gaps;
    case 'unbilled':  return gaps.filter(g => g.status === 'OPEN' || g.status === 'REVIEWED');
    case 'pending':   return gaps.filter(g => g.status === 'OPEN');
    case 'recovered': return gaps.filter(g => g.status === 'BILLED');
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditorDashboard() {
  const t = useTranslations('portal.auditor');
  const [summary, setSummary] = useState<AuditorSummary>(DEMO_SUMMARY);
  const [gaps, setGaps] = useState<RevenueGap[]>(DEMO_GAPS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookbackHours, setLookbackHours] = useState(24);
  const [activeTab, setActiveTab] = useState<MetricTab>('revenue');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Auto-launch spotlight on first visit
  useEffect(() => {
    if (!isMounted) return;
    const seen = localStorage.getItem('auditor-tour-seen');
    if (!seen) {
      const timer = setTimeout(() => setIsTourRunning(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isMounted]);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/auditor?lookbackHours=${lookbackHours}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSummary(data.data);
      }
    } catch {
      // Keep demo data on failure
    } finally {
      setLoading(false);
    }
  }, [lookbackHours]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const filteredGaps = filterGapsByTab(gaps, activeTab).filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.patientName?.toLowerCase().includes(q) ||
      g.procedure.description.toLowerCase().includes(q) ||
      g.procedure.tissCode?.toLowerCase().includes(q) ||
      g.procedure.category.toLowerCase().includes(q)
    );
  });

  const metrics: { id: MetricTab; domId: string; label: string; value: string | number; icon: typeof AlertTriangle; accent: string; activeBorder: string }[] = [
    { id: 'revenue',   domId: 'metric-revenue',   label: t('recoverableRevenue'),       value: summary.totalPotentialValueFormatted, icon: Star,           accent: 'text-emerald-600 dark:text-emerald-400', activeBorder: 'border-emerald-500' },
    { id: 'unbilled',  domId: 'metric-unbilled',  label: t('unbilledProceduresMetric'), value: summary.totalGaps,                    icon: AlertTriangle,  accent: 'text-amber-600 dark:text-amber-400',     activeBorder: 'border-amber-500' },
    { id: 'pending',   domId: 'metric-pending',   label: t('pendingReviewMetric'),      value: summary.byStatus.open,                icon: Clock,          accent: 'text-red-600 dark:text-red-400',         activeBorder: 'border-red-500' },
    { id: 'recovered', domId: 'metric-recovered', label: t('billedRecoveredMetric'),    value: summary.byStatus.billed,              icon: CheckCircle2,   accent: 'text-blue-600 dark:text-blue-400',       activeBorder: 'border-blue-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Spotlight Tour */}
      {isMounted && (
        <Suspense fallback={null}>
          <JoyrideClient
            run={isTourRunning}
            steps={TOUR_STEPS}
            continuous
            showSkipButton
            spotlightClicks={false}
            disableOverlayClose
            callback={({ status }: { status: string }) => {
              if (status === 'finished' || status === 'skipped') {
                setIsTourRunning(false);
                localStorage.setItem('auditor-tour-seen', '1');
              }
            }}
            styles={{ options: { primaryColor: '#10b981', backgroundColor: '#0f172a', textColor: '#e2e8f0', arrowColor: '#0f172a', zIndex: 10000 } }}
          />
        </Suspense>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="header-entrance">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={lookbackHours}
              onChange={(e) => setLookbackHours(parseInt(e.target.value, 10))}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={24}>{t('last24h')}</option>
              <option value={48}>{t('last48h')}</option>
              <option value={168}>{t('last7days')}</option>
              <option value={720}>{t('last30days')}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
          <button
            onClick={() => { setIsTourRunning(true); localStorage.removeItem('auditor-tour-seen'); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
          >
            <Star className="w-3.5 h-3.5" />
            {t('tour')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* Metric Cards — clickable tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => {
          const active = activeTab === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              id={m.domId}
              onClick={() => setActiveTab(m.id)}
              className={`
                relative text-left p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer
                bg-white dark:bg-gray-900
                card-entrance card-entrance-${i + 1}
                ${active
                  ? `${m.activeBorder} shadow-md scale-[1.02]`
                  : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm hover:scale-[1.02]'
                }
              `}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  active ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Icon className={`w-4 h-4 ${active ? 'text-white dark:text-gray-900' : m.accent}`} />
                </div>

                {active && (
                  <div className="pt-1">
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse opacity-70" style={{ color: 'inherit' }} />
                  </div>
                )}
              </div>

              <div className="min-h-[2.75rem] mb-3 flex items-start">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 leading-[1.3] max-w-[12ch]">
                  {m.label}
                </p>
              </div>

              <p className={`text-[clamp(1.9rem,2.8vw,2.35rem)] font-bold tabular-nums leading-none ${m.accent}`}>
                {m.value}
              </p>
            </button>
          );
        })}
      </div>

      {/* Detail Table */}
      <div id="detail-table" className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {activeTab === 'revenue' && t('allRevenueGaps')}
              {activeTab === 'unbilled' && t('unbilledProcedures')}
              {activeTab === 'pending' && t('pendingReview')}
              {activeTab === 'recovered' && t('billedRecovered')}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {filteredGaps.length} item{filteredGaps.length !== 1 ? 's' : ''}
              {summary && ` | ${new Date(summary.periodStart).toLocaleDateString()} - ${new Date(summary.periodEnd).toLocaleDateString()}`}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>

        {/* Table rows */}
        {filteredGaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('noGapsFound')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="col-span-3">{t('patient')}</div>
              <div className="col-span-4">{t('procedure')}</div>
              <div className="col-span-2">{t('source')}</div>
              <div className="col-span-1">{t('confidence')}</div>
              <div className="col-span-1 text-right">{t('value')}</div>
              <div className="col-span-1 text-right">{t('status')}</div>
            </div>

            {filteredGaps.map((gap) => (
              <div key={gap.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                {/* Patient */}
                <div className="sm:col-span-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{gap.patientName || gap.patientId}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(gap.documentedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Procedure */}
                <div className="sm:col-span-4 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${CATEGORY_STYLES[gap.procedure.category] || CATEGORY_STYLES.OTHER}`}>
                      {gap.procedure.category}
                    </span>
                    {gap.procedure.tissCode && (
                      <span className="text-[10px] text-gray-400 font-mono">{gap.procedure.tissCode}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{gap.procedure.description}</p>
                </div>

                {/* Source */}
                <div className="sm:col-span-2 min-w-0 hidden sm:block">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 italic truncate">&ldquo;{gap.procedure.sourceText}&rdquo;</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{gap.procedure.sourceLocation}</p>
                </div>

                {/* Confidence */}
                <div className="sm:col-span-1 hidden sm:flex items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${gap.procedure.confidence >= 0.9 ? 'bg-emerald-500' : gap.procedure.confidence >= 0.8 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${gap.procedure.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 tabular-nums">{(gap.procedure.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Value */}
                <div className="sm:col-span-1 flex items-center sm:justify-end">
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center gap-0.5">
                    {gap.procedure.estimatedValueFormatted}
                    <span className="text-[10px] uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                      View
                    </span>
                  </span>
                </div>

                {/* Status */}
                <div className="sm:col-span-1 flex items-center sm:justify-end">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[gap.status] || STATUS_STYLES.OPEN}`}>
                    {gap.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom row: Categories + Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Procedures */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('topUnbilledProcedures')}</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {summary.topProcedures.map((proc, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 dark:text-gray-500 shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{proc.description}</p>
                    <p className="text-[10px] text-gray-400">{proc.count} occurrence{proc.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0 ml-3">
                  {proc.totalValueFormatted}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('periodSummary')}</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-gray-500">{t('period')}</span>
              <span className="text-gray-700 dark:text-gray-300 text-xs tabular-nums">
                {new Date(summary.periodStart).toLocaleDateString()} - {new Date(summary.periodEnd).toLocaleDateString()}
              </span>
            </div>
            {Object.entries(summary.byCategory).map(([cat, data]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_STYLES[cat] || CATEGORY_STYLES.OTHER}`}>
                  {cat}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400">{data.count} gaps</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{data.valueFormatted}</span>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between">
              <span className="text-xs font-semibold text-gray-500">{t('total')}</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{summary.totalPotentialValueFormatted}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
