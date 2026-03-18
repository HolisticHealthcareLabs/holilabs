'use client';

import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  X,
  Info,
} from 'lucide-react';
import { filterRecordsForOrganization } from '../../../../../../packages/shared-kernel/src/types/auth';
import { DEMO_ESCALATIONS } from '@/lib/demo/dashboard-mocks';
import Tooltip from '@/components/common/Tooltip';

const LazyTrendChart = lazy(() => import('./_TrendChart'));

// ─── Types ────────────────────────────────────────────────────────────────────

type EscalationStatus = 'OPEN' | 'BREACHED' | 'RESOLVED';

interface EscalationRecord {
  id: string;
  organizationId: string;
  status: EscalationStatus;
  reason: string;
  channel: string | null;
  attempt: number;
  slaDeadline: string;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  scheduledReminder: { templateName: string; channel: string };
  patient: { id: string; firstName: string; lastName: string } | null;
  resolvedByUser: { id: string; firstName: string; lastName: string } | null;
}

interface EscalationCounts {
  open: number;
  breached: number;
  resolved: number;
}

// ─── Mock trend data (7 days) ─────────────────────────────────────────────────

function buildTrendData(counts: EscalationCounts) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    day,
    open: Math.max(0, counts.open + Math.round(Math.sin(i) * 2)),
    breached: Math.max(0, counts.breached + Math.round(Math.cos(i) * 1)),
    resolved: Math.max(0, counts.resolved - 2 + i),
  }));
}

const MOCK_ESCALATIONS: EscalationRecord[] = DEMO_ESCALATIONS;

const MOCK_COUNTS: EscalationCounts = {
  open: MOCK_ESCALATIONS.filter((e) => e.status === 'OPEN').length,
  breached: MOCK_ESCALATIONS.filter((e) => e.status === 'BREACHED').length,
  resolved: MOCK_ESCALATIONS.filter((e) => e.status === 'RESOLVED').length,
};

function countEscalations(records: EscalationRecord[]): EscalationCounts {
  return {
    open: records.filter((record) => record.status === 'OPEN').length,
    breached: records.filter((record) => record.status === 'BREACHED').length,
    resolved: records.filter((record) => record.status === 'RESOLVED').length,
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EscalationStatus, { color: string; bg: string; border: string }> = {
  OPEN:     { color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200' },
  BREACHED: { color: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-200'   },
  RESOLVED: { color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200' },
};

function StatusBadge({ status }: { status: EscalationStatus }) {
  const t = useTranslations('dashboard.commandCenter');
  const cfg = STATUS_CONFIG[status];
  const labels: Record<EscalationStatus, string> = {
    OPEN: t('statusBadgeOpen'),
    BREACHED: t('statusBadgeBreached'),
    RESOLVED: t('statusBadgeResolved'),
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {labels[status]}
    </span>
  );
}

function formatDeadline(deadline: string, status: EscalationStatus) {
  const date = new Date(deadline);
  const now  = new Date();
  const diff = date.getTime() - now.getTime();

  if (status === 'RESOLVED') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 0) {
    const h = Math.floor(Math.abs(diff) / 3600000);
    const m = Math.floor((Math.abs(diff) % 3600000) / 60000);
    return `${h}h ${m}m overdue`;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m remaining`;
}

// ─── SVG Spinner ──────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-7 h-7 animate-spin text-amber-400" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeOpacity={0.25} strokeWidth={2.5} />
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth={2.5}
              strokeDasharray={69.1} strokeDashoffset={51.8} strokeLinecap="round" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const t = useTranslations('dashboard.commandCenter');
  const { data: session } = useSession();
  const [escalations,     setEscalations]     = useState<EscalationRecord[]>(MOCK_ESCALATIONS);
  const [statusFilter,    setStatusFilter]    = useState<'ALL' | EscalationStatus>('ALL');
  const [drawerEsc,       setDrawerEsc]       = useState<EscalationRecord | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [resolvingId,     setResolvingId]     = useState<string | null>(null);
  const [resolutionText,  setResolutionText]  = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const activeOrganizationId = session?.user.organizationId ?? 'org-demo-clinic';
  const scopedMockEscalations = useMemo(
    () => filterRecordsForOrganization(MOCK_ESCALATIONS, activeOrganizationId),
    [activeOrganizationId]
  );
  const scopedEscalations = useMemo(
    () => filterRecordsForOrganization(escalations, activeOrganizationId),
    [escalations, activeOrganizationId]
  );
  const visibleEscalations = useMemo(
    () => statusFilter === 'ALL' ? scopedEscalations : scopedEscalations.filter((record) => record.status === statusFilter),
    [scopedEscalations, statusFilter]
  );
  const effectiveCounts = useMemo(
    () => countEscalations(scopedEscalations),
    [scopedEscalations]
  );

  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escalations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];
      const tenantSafeData = data.filter(
        (record: any): record is EscalationRecord =>
          typeof record === 'object' &&
          record !== null &&
          typeof (record as { organizationId?: unknown }).organizationId === 'string'
      );
      if (tenantSafeData.length > 0) {
        const scopedData = filterRecordsForOrganization(tenantSafeData, activeOrganizationId);
        setEscalations(scopedData as EscalationRecord[]);
      } else {
        setEscalations(scopedMockEscalations);
      }
    } catch {
      setEscalations(scopedMockEscalations);
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, scopedMockEscalations]);

  useEffect(() => { fetchEscalations(); }, [fetchEscalations]);

  const handleResolve = async () => {
    if (!selectedId) return;
    setResolvingId(selectedId);
    try {
      const res = await fetch(`/api/escalations/${selectedId}/resolve`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resolution: resolutionText || undefined }),
      });
      if (res.ok) {
        setShowResolveModal(false);
        setResolutionText('');
        setSelectedId(null);
        fetchEscalations();
      }
    } finally {
      setResolvingId(null);
    }
  };

  const openResolveModal = (id: string) => {
    setSelectedId(id);
    setResolutionText('');
    setShowResolveModal(true);
  };

  const trendData = buildTrendData(effectiveCounts);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-violet-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <button
          onClick={fetchEscalations}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {/* Stat cards — click to filter, click again to deselect */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setStatusFilter((prev) => prev === 'OPEN' ? 'ALL' : 'OPEN')}
          className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-none text-left transition-all ${statusFilter === 'OPEN' ? 'ring-2 ring-amber-500/40' : 'hover:shadow-sm'}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('statusOpen')}</span>
            <Tooltip content={t('tooltipOpen')} position="top">
              <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help" />
            </Tooltip>
          </div>
          <p className="text-4xl font-bold text-amber-700 dark:text-amber-400">{effectiveCounts.open}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('awaitingAction')}</p>
        </button>

        <button
          onClick={() => setStatusFilter((prev) => prev === 'BREACHED' ? 'ALL' : 'BREACHED')}
          className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-none text-left transition-all ${statusFilter === 'BREACHED' ? 'ring-2 ring-red-500/40' : 'hover:shadow-sm'}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('breachedSlas')}</span>
            <Tooltip content={t('tooltipBreached')} position="top">
              <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help" />
            </Tooltip>
          </div>
          <p className="text-4xl font-bold text-red-700 dark:text-red-400">{effectiveCounts.breached}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('pastDeadline')}</p>
        </button>

        <button
          onClick={() => setStatusFilter((prev) => prev === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
          className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-none text-left transition-all ${statusFilter === 'RESOLVED' ? 'ring-2 ring-green-500/40' : 'hover:shadow-sm'}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('statusResolved')}</span>
            <Tooltip content={t('tooltipResolved')} position="top">
              <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help" />
            </Tooltip>
          </div>
          <p className="text-4xl font-bold text-green-700 dark:text-green-400">{effectiveCounts.resolved}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('allTime')}</p>
        </button>
      </div>

      {/* Trend chart (lazy-loaded to avoid shipping recharts on first paint) */}
      <Suspense fallback={
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-none">
          <div className="h-[200px] flex items-center justify-center">
            <Spinner />
          </div>
        </div>
      }>
        <LazyTrendChart data={trendData} />
      </Suspense>

      {/* Recent escalations table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-none overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('recentEscalations')}</h2>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`text-xs font-medium rounded-full px-3 py-1 transition-colors ${statusFilter === 'ALL' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            {statusFilter === 'ALL' ? t('showingAll') : t('clearFilter')}
          </button>
        </div>

        {loading && visibleEscalations.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : visibleEscalations.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t('noEscalations')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {visibleEscalations.slice(0, 10).map((esc) => (
              <button
                key={esc.id}
                type="button"
                onClick={() => setDrawerEsc(esc)}
                className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${drawerEsc?.id === esc.id ? 'bg-violet-50/50 dark:bg-violet-500/5' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <StatusBadge status={esc.status} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {esc.scheduledReminder.templateName}
                    </span>
                    {esc.channel && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {esc.channel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                    {esc.patient && (
                      <span>{esc.patient.firstName} {esc.patient.lastName}</span>
                    )}
                    <span
                      className={
                        esc.status === 'BREACHED' ? 'text-red-500 font-medium' :
                        esc.status === 'OPEN'     ? 'text-amber-500' : ''
                      }
                    >
                      SLA: {formatDeadline(esc.slaDeadline, esc.status)}
                    </span>
                  </div>
                </div>
                {esc.status !== 'RESOLVED' && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); openResolveModal(esc.id); }}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    {t('resolve')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resolve modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('resolveEscalation')}</h3>
            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder={t('resolutionNotes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowResolveModal(false); setSelectedId(null); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleResolve}
                disabled={resolvingId !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg"
              >
                {resolvingId ? t('resolving') : t('confirmResolve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation detail drawer */}
      {drawerEsc && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setDrawerEsc(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-violet-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('escalationDetail')}</h3>
              </div>
              <button onClick={() => setDrawerEsc(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Status + template */}
              <div>
                <StatusBadge status={drawerEsc.status} />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                  {drawerEsc.scheduledReminder.templateName}
                </h4>
              </div>

              {/* Reason */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">{t('reason')}</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{drawerEsc.reason}</p>
              </div>

              {/* Key details grid */}
              <div className="grid grid-cols-2 gap-3">
                {drawerEsc.patient && (
                  <DetailField label={t('patient')} value={`${drawerEsc.patient.firstName} ${drawerEsc.patient.lastName}`} />
                )}
                <DetailField label={t('channel')} value={drawerEsc.channel ?? t('notSpecified')} />
                <DetailField label={t('attempt')} value={`#${drawerEsc.attempt}`} />
                <DetailField label={t('created')} value={new Date(drawerEsc.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                <DetailField
                  label={t('slaDeadlineLabel')}
                  value={formatDeadline(drawerEsc.slaDeadline, drawerEsc.status)}
                  accent={drawerEsc.status === 'BREACHED' ? 'text-red-600 dark:text-red-400' : drawerEsc.status === 'OPEN' ? 'text-amber-600 dark:text-amber-400' : undefined}
                />
                <DetailField label={t('reminderChannel')} value={drawerEsc.scheduledReminder.channel} />
              </div>

              {/* Resolution section */}
              {drawerEsc.status === 'RESOLVED' && (
                <div className="rounded-xl bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20 p-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">{t('resolution')}</p>
                  {drawerEsc.resolution && (
                    <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">{drawerEsc.resolution}</p>
                  )}
                  {drawerEsc.resolvedByUser && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {t('resolvedBy')} {drawerEsc.resolvedByUser.firstName} {drawerEsc.resolvedByUser.lastName}
                    </p>
                  )}
                  {drawerEsc.resolvedAt && (
                    <p className="text-xs text-green-600/70 dark:text-green-400/70">
                      {new Date(drawerEsc.resolvedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}

              {/* Breached warning */}
              {drawerEsc.status === 'BREACHED' && (
                <div className="rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">{t('slaBreached')}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">
                        {t('slaBreachedDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer footer */}
            {drawerEsc.status !== 'RESOLVED' && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => { setDrawerEsc(null); openResolveModal(drawerEsc.id); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 rounded-xl transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('resolveThisEscalation')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DetailField({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${accent ?? 'text-gray-800 dark:text-gray-200'}`}>{value}</p>
    </div>
  );
}
