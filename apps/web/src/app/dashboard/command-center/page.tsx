'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Mock trend data (7 days) — replaced by real data when available ──────────

function buildTrendData(counts: EscalationCounts) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    day,
    open: Math.max(0, counts.open + Math.round(Math.sin(i) * 2)),
    breached: Math.max(0, counts.breached + Math.round(Math.cos(i) * 1)),
    resolved: Math.max(0, counts.resolved - 2 + i),
  }));
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const [escalations,     setEscalations]     = useState<EscalationRecord[]>([]);
  const [counts,          setCounts]          = useState<EscalationCounts>({ open: 0, breached: 0, resolved: 0 });
  const [loading,         setLoading]         = useState(true);
  const [resolvingId,     setResolvingId]     = useState<string | null>(null);
  const [resolutionText,  setResolutionText]  = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);

  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/escalations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEscalations(json.data ?? []);
      setCounts(json.counts ?? { open: 0, breached: 0, resolved: 0 });
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }, []);

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

  const trendData = buildTrendData(counts);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            Command Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Escalation queue · Trend analytics · SLA monitoring
          </p>
        </div>
        <button
          onClick={fetchEscalations}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Open</span>
          </div>
          <p className="text-4xl font-bold text-amber-700">{counts.open}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting action</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Breached SLAs</span>
          </div>
          <p className="text-4xl font-bold text-red-700">{counts.breached}</p>
          <p className="text-xs text-gray-400 mt-1">Past deadline</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resolved</span>
          </div>
          <p className="text-4xl font-bold text-green-700">{counts.resolved}</p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-none">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Escalation Trend — Last 7 Days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="colorBreached" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="open"     stroke="#f59e0b" fill="url(#colorOpen)"     strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="breached"  stroke="#ef4444" fill="url(#colorBreached)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="resolved"  stroke="#22c55e" fill="url(#colorResolved)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 justify-end">
          {[{ color: '#f59e0b', label: 'Open' }, { color: '#ef4444', label: 'Breached' }, { color: '#22c55e', label: 'Resolved' }].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Recent escalations table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-none overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent Escalations</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : escalations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No escalations</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {escalations.slice(0, 10).map((esc) => (
              <div key={esc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <StatusBadge status={esc.status} />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {esc.scheduledReminder.templateName}
                    </span>
                    {esc.channel && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {esc.channel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolve Escalation</h3>
            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Resolution notes (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none resize-none"
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
                {resolvingId ? 'Resolving…' : 'Confirm Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
