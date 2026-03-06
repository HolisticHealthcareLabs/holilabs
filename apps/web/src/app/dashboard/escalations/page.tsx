'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

type EscalationStatus = 'OPEN' | 'BREACHED' | 'RESOLVED';

interface EscalationRecord {
  id: string;
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

const STATUS_CONFIG: Record<EscalationStatus, { label: string; color: string; bg: string; border: string }> = {
  OPEN: { label: 'Open', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  BREACHED: { label: 'Breached', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  RESOLVED: { label: 'Resolved', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
};

function StatusBadge({ status }: { status: EscalationStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.color} border ${config.border}`}>
      {config.label}
    </span>
  );
}

function formatDeadline(deadline: string, status: EscalationStatus) {
  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (status === 'RESOLVED') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (diffMs < 0) {
    const overdue = Math.abs(diffMs);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m overdue`;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m remaining`;
}

export default function EscalationsPage() {
  const { data: session } = useSession();
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [counts, setCounts] = useState<EscalationCounts>({ open: 0, breached: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EscalationStatus | 'ALL'>('ALL');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchEscalations = useCallback(async () => {
    try {
      const statusParam = activeTab !== 'ALL' ? `?status=${activeTab}` : '';
      const res = await fetch(`/api/escalations${statusParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEscalations(json.data);
      setCounts(json.counts);
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const handleResolve = async () => {
    if (!selectedId) return;
    setResolvingId(selectedId);
    try {
      const res = await fetch(`/api/escalations/${selectedId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: resolutionText || undefined }),
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

  const tabs: Array<{ key: EscalationStatus | 'ALL'; label: string; count: number }> = [
    { key: 'ALL', label: 'All', count: counts.open + counts.breached + counts.resolved },
    { key: 'OPEN', label: 'Open', count: counts.open },
    { key: 'BREACHED', label: 'Breached', count: counts.breached },
    { key: 'RESOLVED', label: 'Resolved', count: counts.resolved },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Loading escalations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            Escalation Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Follow-up reminders requiring attention
          </p>
        </div>
        <button
          onClick={fetchEscalations}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-2xl font-bold text-amber-700">{counts.open}</span>
          </div>
          <p className="text-xs text-amber-600 font-medium">Open</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-2xl font-bold text-red-700">{counts.breached}</span>
          </div>
          <p className="text-xs text-red-600 font-medium">SLA Breached</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-2xl font-bold text-green-700">{counts.resolved}</span>
          </div>
          <p className="text-xs text-green-600 font-medium">Resolved</p>
        </div>
      </div>

      {/* Tab Filters */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setLoading(true); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Escalation List */}
      {escalations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No escalations</p>
          <p className="text-sm mt-1">
            {activeTab === 'ALL'
              ? 'No follow-up reminders have been escalated.'
              : `No ${activeTab.toLowerCase()} escalations.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {escalations.map((esc) => (
            <div
              key={esc.id}
              className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-sm ${esc.status === 'BREACHED' ? 'border-red-200' : 'border-gray-200'
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={esc.status} />
                    <span className="text-sm font-medium text-gray-900">
                      {esc.scheduledReminder.templateName}
                    </span>
                    {esc.channel && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {esc.channel}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{esc.reason}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {esc.patient && (
                      <span>
                        Patient: {esc.patient.firstName} {esc.patient.lastName}
                      </span>
                    )}
                    <span>Attempt #{esc.attempt}</span>
                    <span
                      className={
                        esc.status === 'BREACHED'
                          ? 'text-red-500 font-medium'
                          : esc.status === 'OPEN'
                            ? 'text-amber-500'
                            : ''
                      }
                    >
                      SLA: {formatDeadline(esc.slaDeadline, esc.status)}
                    </span>
                    {esc.resolvedByUser && (
                      <span className="text-green-600">
                        Resolved by {esc.resolvedByUser.firstName} {esc.resolvedByUser.lastName}
                      </span>
                    )}
                  </div>

                  {esc.resolution && (
                    <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      {esc.resolution}
                    </p>
                  )}
                </div>

                {esc.status !== 'RESOLVED' && (
                  <button
                    onClick={() => openResolveModal(esc.id)}
                    disabled={resolvingId === esc.id}
                    className="shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolve Escalation</h3>
            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Resolution notes (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowResolveModal(false); setSelectedId(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolvingId !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg"
              >
                {resolvingId ? 'Resolving...' : 'Confirm Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
