'use client';

import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { filterRecordsForOrganization } from '../../../../../../packages/shared-kernel/src/types/auth';

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

const MOCK_ESCALATIONS: EscalationRecord[] = [
  {
    organizationId: 'org-demo-clinic',
    id: 'esc-001', status: 'BREACHED', reason: 'Troponin results pending > 4h',
    channel: 'In-App', attempt: 2,
    slaDeadline: new Date(Date.now() - 2 * 3600000).toISOString(),
    resolvedAt: null, resolution: null,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Critical Lab Follow-up', channel: 'SMS + In-App' },
    patient: { id: 'P003', firstName: 'James', lastName: "O'Brien" },
    resolvedByUser: null,
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'esc-002', status: 'OPEN', reason: 'INR out of therapeutic range',
    channel: 'SMS', attempt: 1,
    slaDeadline: new Date(Date.now() + 1.5 * 3600000).toISOString(),
    resolvedAt: null, resolution: null,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Anticoagulation Alert', channel: 'SMS' },
    patient: { id: 'P003', firstName: 'James', lastName: "O'Brien" },
    resolvedByUser: null,
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'esc-003', status: 'OPEN', reason: 'eGFR trending below 40',
    channel: 'In-App', attempt: 1,
    slaDeadline: new Date(Date.now() + 6 * 3600000).toISOString(),
    resolvedAt: null, resolution: null,
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Renal Function Decline', channel: 'In-App' },
    patient: { id: 'P008', firstName: 'Carlos', lastName: 'Eduardo Mendes' },
    resolvedByUser: null,
  },
  {
    organizationId: 'org-partner-hospital',
    id: 'esc-004', status: 'OPEN', reason: 'Missed follow-up: post-stent dual antiplatelet review',
    channel: 'WhatsApp', attempt: 1,
    slaDeadline: new Date(Date.now() + 12 * 3600000).toISOString(),
    resolvedAt: null, resolution: null,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Post-Procedure Follow-up', channel: 'WhatsApp' },
    patient: { id: 'P006', firstName: 'Fernando', lastName: 'Augusto Vieira' },
    resolvedByUser: null,
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'esc-005', status: 'RESOLVED', reason: 'BP above 160/95 for 3 consecutive readings',
    channel: 'Phone', attempt: 2,
    slaDeadline: new Date(Date.now() - 48 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    resolution: 'Patient seen in urgent visit. Lisinopril increased to 20 mg. Follow-up in 72h.',
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Hypertensive Urgency', channel: 'Phone + In-App' },
    patient: { id: 'P001', firstName: 'Robert', lastName: 'Chen' },
    resolvedByUser: { id: 'U001', firstName: 'Ricardo', lastName: 'Silva' },
  },
  {
    organizationId: 'org-partner-hospital',
    id: 'esc-006', status: 'RESOLVED', reason: 'HbA1c > 8.0% - requires medication adjustment',
    channel: 'SMS', attempt: 1,
    slaDeadline: new Date(Date.now() - 96 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    resolution: 'Metformin dose increased. Patient enrolled in diabetes education program.',
    createdAt: new Date(Date.now() - 120 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Glycemic Control Alert', channel: 'SMS' },
    patient: { id: 'P002', firstName: 'Maria', lastName: 'Santos' },
    resolvedByUser: { id: 'U001', firstName: 'Ricardo', lastName: 'Silva' },
  },
];

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

const STATUS_CONFIG: Record<EscalationStatus, { label: string; color: string; bg: string; border: string }> = {
  OPEN:     { label: 'Open',     color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200' },
  BREACHED: { label: 'Breached', color: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-200'   },
  RESOLVED: { label: 'Resolved', color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200' },
};

function StatusBadge({ status }: { status: EscalationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {cfg.label}
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
  const { data: session } = useSession();
  const [escalations,     setEscalations]     = useState<EscalationRecord[]>(MOCK_ESCALATIONS);
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
        (record): record is EscalationRecord =>
          typeof record === 'object' &&
          record !== null &&
          typeof (record as { organizationId?: unknown }).organizationId === 'string'
      );
      if (tenantSafeData.length > 0) {
        const scopedData = filterRecordsForOrganization(tenantSafeData, activeOrganizationId);
        setEscalations(scopedData);
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
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            Command Center
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Escalation queue · Trend analytics · SLA monitoring
          </p>
        </div>
        <button
          onClick={fetchEscalations}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Open</span>
          </div>
          <p className="text-4xl font-bold text-amber-700">{effectiveCounts.open}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Awaiting action</p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Breached SLAs</span>
          </div>
          <p className="text-4xl font-bold text-red-700">{effectiveCounts.breached}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Past deadline</p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Resolved</span>
          </div>
          <p className="text-4xl font-bold text-green-700">{effectiveCounts.resolved}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All time</p>
        </div>
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
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Escalations</h2>
        </div>

        {loading && scopedEscalations.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : scopedEscalations.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No escalations</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {scopedEscalations.slice(0, 10).map((esc) => (
              <div key={esc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                  <button
                    onClick={() => openResolveModal(esc.id)}
                    disabled={resolvingId === esc.id}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resolve Escalation</h3>
            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Resolution notes (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowResolveModal(false); setSelectedId(null); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolvingId !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg"
              >
                {resolvingId ? 'Resolving…' : 'Confirm Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
