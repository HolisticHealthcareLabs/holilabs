'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Activity,
  AlertTriangle,
  Shield,
  Heart,
  Clock,
  RefreshCw,
  ChevronRight,
  FileText,
  Eye,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { useGovernanceRealtime } from '@/hooks/useGovernanceRealtime';
import { FirstRunWelcome } from '@/components/dashboard/FirstRunWelcome';
import { KPICard } from '@/components/console/KPICard';
import { CopilotDraftPanel } from '@/components/console/CopilotDraftPanel';
import { KPI_DICTIONARY, type KPIDictionaryKey } from '@/lib/kpi/kpi-dictionary';
import type { KPIResult } from '@/lib/kpi/kpi-queries';

const FIRST_RUN_DISMISSED_KEY = 'holilabs:firstRunDismissed';

// ============================================================================
// TYPES
// ============================================================================

interface CommandCenterData {
  cdsAlerts: {
    recentEvaluations: number;
    recentAlerts: Array<{
      id: string;
      action: string;
      resource: string;
      timestamp: string;
      user: string;
    }>;
  };
  reviewQueue: {
    pending: number;
    inReview: number;
    highPriority: number;
    recentItems: Array<{
      id: string;
      contentType: string;
      priority: number;
      confidence: number;
      flagReason: string;
      status: string;
      patientName?: string;
      createdAt: string;
    }>;
  };
  preventionGaps: {
    overdue: number;
    dueThisWeek: number;
    activePlans: number;
    byType: Record<string, number>;
  };
  governanceFeed: {
    last24h: number;
    overrides: number;
    blocks: number;
  };
  groundTruth?: {
    acceptRate: number;
    totalDecisions: number;
    overrides: number;
    accepts: number;
    feedbackVolume: number;
    feedbackByType: Record<string, number>;
    topOverrideReasons: Array<{ reason: string; count: number }>;
  };
}

// ============================================================================
// SEVERITY BADGE
// ============================================================================

function SeverityBadge({ level }: { level: 'critical' | 'warning' | 'info' }) {
  const styles = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  const labels = { critical: 'RED', warning: 'YELLOW', info: 'GREEN' };

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

// ============================================================================
// PANEL COMPONENTS
// ============================================================================

function CDSAlertsPanel({ data }: { data: CommandCenterData['cdsAlerts'] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">CDS Alerts</h2>
        </div>
        <Link
          href="/dashboard/clinical-support"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{data.recentEvaluations}</div>
          <div className="text-xs text-gray-500">Evaluations (24h)</div>
        </div>
      </div>

      <div className="space-y-2">
        {data.recentAlerts.slice(0, 5).map((alert) => (
          <div key={alert.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2">
              <SeverityBadge level={alert.action === 'CDS_OVERRIDE' ? 'warning' : 'info'} />
              <span className="text-gray-700 truncate max-w-[180px]">{alert.action.replace('CDS_', '')}</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {data.recentAlerts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No recent CDS alerts</p>
        )}
      </div>
    </div>
  );
}

function ReviewQueuePanel({ data }: { data: CommandCenterData['reviewQueue'] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-900">Review Queue</h2>
        </div>
        <Link
          href="/dashboard/ai"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Review <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center bg-amber-50 rounded-lg py-2">
          <div className="text-xl font-bold text-amber-700">{data.pending}</div>
          <div className="text-xs text-amber-600">Pending</div>
        </div>
        <div className="text-center bg-blue-50 rounded-lg py-2">
          <div className="text-xl font-bold text-blue-700">{data.inReview}</div>
          <div className="text-xs text-blue-600">In Review</div>
        </div>
        <div className="text-center bg-red-50 rounded-lg py-2">
          <div className="text-xl font-bold text-red-700">{data.highPriority}</div>
          <div className="text-xs text-red-600">High Priority</div>
        </div>
      </div>

      <div className="space-y-2">
        {data.recentItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
            <div>
              <span className="font-medium text-gray-700">{item.patientName || 'Unknown'}</span>
              <span className="text-gray-400 ml-2 text-xs">
                {Math.round(item.confidence)}% conf
              </span>
            </div>
            <span className="text-xs text-gray-400">{item.flagReason}</span>
          </div>
        ))}
        {data.recentItems.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Queue is empty</p>
        )}
      </div>
    </div>
  );
}

function PreventionGapsPanel({ data }: { data: CommandCenterData['preventionGaps'] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-semibold text-gray-900">Prevention Gaps</h2>
        </div>
        <Link
          href="/dashboard/prevention"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View Hub <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center bg-red-50 rounded-lg py-2">
          <div className="text-xl font-bold text-red-700">{data.overdue}</div>
          <div className="text-xs text-red-600">Overdue</div>
        </div>
        <div className="text-center bg-amber-50 rounded-lg py-2">
          <div className="text-xl font-bold text-amber-700">{data.dueThisWeek}</div>
          <div className="text-xs text-amber-600">Due This Week</div>
        </div>
        <div className="text-center bg-green-50 rounded-lg py-2">
          <div className="text-xl font-bold text-green-700">{data.activePlans}</div>
          <div className="text-xs text-green-600">Active Plans</div>
        </div>
      </div>

      {Object.keys(data.byType).length > 0 && (
        <div className="space-y-1.5">
          {Object.entries(data.byType).map(([type, count]) => (
            <div key={type} className="flex justify-between text-sm">
              <span className="text-gray-600">{type.replace('_', ' ')}</span>
              <span className="font-medium text-gray-800">{count}</span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(data.byType).length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No active prevention plans</p>
      )}
    </div>
  );
}

function GovernanceFeedPanel({
  data,
  realtimeConnected,
}: {
  data: CommandCenterData['governanceFeed'];
  realtimeConnected: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Governance Feed</h2>
          {realtimeConnected && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <Link
          href="/dashboard/governance"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Full Log <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center bg-gray-50 rounded-lg py-2">
          <div className="text-xl font-bold text-gray-700">{data.last24h}</div>
          <div className="text-xs text-gray-500">Events (24h)</div>
        </div>
        <div className="text-center bg-amber-50 rounded-lg py-2">
          <div className="flex items-center justify-center gap-1">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span className="text-xl font-bold text-amber-700">{data.overrides}</span>
          </div>
          <div className="text-xs text-amber-600">Overrides</div>
        </div>
        <div className="text-center bg-red-50 rounded-lg py-2">
          <div className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <span className="text-xl font-bold text-red-700">{data.blocks}</span>
          </div>
          <div className="text-xs text-red-600">Blocks</div>
        </div>
      </div>

      <div className="text-sm text-gray-500 text-center">
        {data.last24h === 0
          ? 'No governance activity in last 24 hours'
          : `${data.overrides + data.blocks} interventions of ${data.last24h} evaluations`}
      </div>
    </div>
  );
}

function GroundTruthPanel({ data }: { data: NonNullable<CommandCenterData['groundTruth']> }) {
  const acceptColor = data.acceptRate >= 80 ? 'text-green-700' : data.acceptRate >= 50 ? 'text-amber-700' : 'text-red-700';
  const acceptBg = data.acceptRate >= 80 ? 'bg-green-50' : data.acceptRate >= 50 ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">Clinical Ground Truth</h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            Flywheel
          </span>
        </div>
        <span className="text-xs text-gray-400">Last 7 days</span>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className={`text-center ${acceptBg} rounded-lg py-3`}>
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className={`w-4 h-4 ${acceptColor}`} />
            <span className={`text-2xl font-bold ${acceptColor}`}>{data.acceptRate}%</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Accept Rate</div>
        </div>
        <div className="text-center bg-blue-50 rounded-lg py-3">
          <div className="text-2xl font-bold text-blue-700">{data.totalDecisions}</div>
          <div className="text-xs text-blue-600">Decisions</div>
        </div>
        <div className="text-center bg-amber-50 rounded-lg py-3">
          <div className="text-2xl font-bold text-amber-700">{data.overrides}</div>
          <div className="text-xs text-amber-600">Overrides</div>
        </div>
        <div className="text-center bg-purple-50 rounded-lg py-3">
          <div className="text-2xl font-bold text-purple-700">{data.feedbackVolume}</div>
          <div className="text-xs text-purple-600">Feedback</div>
        </div>
      </div>

      {/* Feedback Breakdown + Override Reasons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Feedback by Type */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Feedback Volume</h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-600">
                <ThumbsUp className="w-3.5 h-3.5 text-green-500" />
                Thumbs Up
              </span>
              <span className="font-medium text-gray-800">{data.feedbackByType.THUMBS_UP || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-600">
                <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                Thumbs Down
              </span>
              <span className="font-medium text-gray-800">{data.feedbackByType.THUMBS_DOWN || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Corrections</span>
              <span className="font-medium text-gray-800">{data.feedbackByType.CORRECTION || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Comments</span>
              <span className="font-medium text-gray-800">{data.feedbackByType.COMMENT || 0}</span>
            </div>
          </div>
        </div>

        {/* Top Override Reasons */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Override Reasons</h3>
          {data.topOverrideReasons.length > 0 ? (
            <div className="space-y-1.5">
              {data.topOverrideReasons.map((r, i) => (
                <div key={r.reason} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate max-w-[160px]">
                    {(r.reason || '').replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium text-gray-800">{r.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No overrides recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ClinicalCommandCenterPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [kpiData, setKpiData] = useState<Record<string, KPIResult> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [firstRunDismissed, setFirstRunDismissed] = useState(true); // default true to avoid flash

  useEffect(() => {
    try {
      setFirstRunDismissed(localStorage.getItem(FIRST_RUN_DISMISSED_KEY) === 'true');
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Real-time governance updates
  const { connected: realtimeConnected } = useGovernanceRealtime({
    autoConnect: true,
    onNewLog: () => {
      // Refresh data when new governance events arrive
      fetchData();
    },
    onOverride: () => fetchData(),
    onBlocked: () => fetchData(),
  });

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, kpiRes] = await Promise.all([
        fetch('/api/clinical-command/summary'),
        fetch('/api/kpi'),
      ]);
      if (!summaryRes.ok) throw new Error(`HTTP ${summaryRes.status}`);
      const json = await summaryRes.json();
      setData(json.data);
      if (kpiRes.ok) {
        setKpiData(await kpiRes.json());
      }
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Fallback polling every 30s if Socket.IO disconnects
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-500">Loading Clinical Command Center...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Failed to load data</p>
          <p className="text-gray-400 text-sm mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // First-run detection: all panels empty and user hasn't dismissed
  const isFirstRun =
    !firstRunDismissed &&
    data.cdsAlerts.recentEvaluations === 0 &&
    data.reviewQueue.pending === 0 &&
    data.preventionGaps.overdue === 0 &&
    data.governanceFeed.last24h === 0;

  if (isFirstRun) {
    const userName = session?.user?.name?.split(' ')[0] || 'there';
    return (
      <FirstRunWelcome
        userName={userName}
        onDismiss={() => {
          setFirstRunDismissed(true);
          try {
            localStorage.setItem(FIRST_RUN_DISMISSED_KEY, 'true');
          } catch {
            // localStorage unavailable
          }
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Clinical Command Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time clinical intelligence across CDSS, Prevention, and Governance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {realtimeConnected && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {lastRefresh && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      {kpiData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(Object.keys(KPI_DICTIONARY) as KPIDictionaryKey[]).map((key) => {
            const kpi = kpiData[key];
            if (!kpi) return null;
            return (
              <KPICard
                key={key}
                label={kpi.label}
                value={kpi.value}
                unit={kpi.unit}
                definition={KPI_DICTIONARY[key]}
              />
            );
          })}
        </div>
      )}

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <CDSAlertsPanel data={data.cdsAlerts} />
        <ReviewQueuePanel data={data.reviewQueue} />
        <PreventionGapsPanel data={data.preventionGaps} />
        <GovernanceFeedPanel data={data.governanceFeed} realtimeConnected={realtimeConnected} />
      </div>

      {/* Ground Truth Flywheel Panel (full-width) */}
      {data.groundTruth && (
        <div className="mt-5">
          <GroundTruthPanel data={data.groundTruth} />
        </div>
      )}

      {/* AI Copilot → Draft Prescription Panel */}
      <div className="mt-5">
        <CopilotDraftPanel />
      </div>
    </div>
  );
}
