'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { RefreshCw, Shield, AlertTriangle, Activity, Clock, CheckCircle2, XCircle, ChevronRight, TrendingUp, Eye } from 'lucide-react';
import { ReplayModal } from '@/components/governance/ReplayModal';
import { useGovernanceRealtime } from '@/hooks/useGovernanceRealtime';
import type { GovernanceLogEvent } from '@/lib/socket/events';

// ============================================================================
// TYPES
// ============================================================================

interface GovernanceLog {
    id: string;
    createdAt: string;
    provider: string;
    safetyScore: number;
    latencyMs: number;
    session?: {
        user?: { email: string };
        patient?: { firstName: string; lastName: string };
    };
    events: Array<{
        id: string;
        ruleName: string;
        severity: string;
        actionTaken: string;
        description: string;
    }>;
}

interface SafetyStats {
    sessionsAudited: number;
    interventionsTriggered: number;
    avgSafetyScore: number;
}

// ============================================================================
// REAL-TIME CONFIG (replaced 5s polling)
// ============================================================================

// Fallback polling interval if Socket.IO disconnects (30s instead of 5s)
const FALLBACK_REFRESH_INTERVAL = 30000;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GovernanceDashboard() {
    const t = useTranslations('dashboard.governance');
    const [logs, setLogs] = useState<GovernanceLog[]>([]);
    const [stats, setStats] = useState<SafetyStats>({
        sessionsAudited: 0,
        interventionsTriggered: 0,
        avgSafetyScore: 0
    });
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [mounted, setMounted] = useState(false);
    const [selectedLog, setSelectedLog] = useState<GovernanceLog | null>(null);
    const [isReplayOpen, setIsReplayOpen] = useState(false);

    // Real-time Socket.IO hook - replaces 5s polling with instant push
    const handleNewLog = useCallback((event: GovernanceLogEvent) => {
        // Convert socket event to GovernanceLog format and prepend
        const newLog: GovernanceLog = {
            id: event.id,
            createdAt: event.timestamp.toString(),
            provider: event.provider || 'unknown',
            safetyScore: event.severity === 'HARD_BLOCK' ? 20 : event.severity === 'SOFT_NUDGE' ? 60 : 100,
            latencyMs: 0, // Not available in real-time event
            events: event.ruleId ? [{
                id: `${event.id}-event`,
                ruleName: event.ruleName || event.ruleId || 'Unknown Rule',
                severity: event.severity,
                actionTaken: event.eventType,
                description: event.description || '',
            }] : [],
        };

        setLogs(prev => [newLog, ...prev].slice(0, 50));
        setLastRefreshed(new Date());

        // Update stats incrementally
        setStats(prev => ({
            ...prev,
            sessionsAudited: prev.sessionsAudited + 1,
            interventionsTriggered: event.eventType === 'BLOCKED' || event.eventType === 'FLAGGED'
                ? prev.interventionsTriggered + 1
                : prev.interventionsTriggered,
        }));
    }, []);

    const { connected: socketConnected, recentEvents } = useGovernanceRealtime({
        autoConnect: true,
        onNewLog: handleNewLog,
        onOverride: (_event) => {
            setLastRefreshed(new Date());
        },
        onBlocked: (_event) => {
        },
    });

    // Set mounted state and start real-time clock
    useEffect(() => {
        setMounted(true);
        setLastRefreshed(new Date());
        setCurrentTime(new Date());

        // Real-time clock - updates every second
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(clockInterval);
    }, []);

    const fetchData = async () => {
        try {
            const [logsRes, statsRes] = await Promise.all([
                fetch('/api/governance/logs').then(r => r.json()),
                fetch('/api/governance/stats').then(r => r.json()),
            ]);

            if (logsRes.data) setLogs(logsRes.data);
            if (statsRes.data) setStats(statsRes.data);
        } catch (error) {
            console.error('[Governance]', { event: 'fetch_data_error', error: error instanceof Error ? error.message : String(error) });
        } finally {
            setLoading(false);
            setLastRefreshed(new Date());
        }
    };

    // Initial fetch + fallback polling only when disconnected
    useEffect(() => {
        if (!mounted) return;

        // Always do initial fetch
        fetchData();

        // Only poll as fallback if Socket.IO is disconnected
        // This reduces polling from 5s to 30s when connected
        let interval: NodeJS.Timeout | null = null;

        if (!socketConnected) {
            interval = setInterval(fetchData, FALLBACK_REFRESH_INTERVAL);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [mounted, socketConnected]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'HARD_BLOCK': return 'text-red-500 bg-red-500/10 border-red-500/30';
            case 'SOFT_NUDGE': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
            default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">{t('missionControl')}</h1>
                                <p className="text-sm text-gray-400">{t('subtitle')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Real-time connection status */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                                socketConnected
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : 'bg-amber-500/10 border-amber-500/30'
                            }`}>
                                {socketConnected ? (
                                    <>
                                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-xs text-emerald-300 font-medium">{t('realtime')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-xs text-amber-300 font-medium">{t('polling')}</span>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                                <span className="text-xs text-gray-300 font-mono">
                                    {currentTime?.toLocaleTimeString() ?? '--:--:--'}
                                </span>
                            </div>

                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                <span className="text-sm font-medium">{t('refresh')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Sessions Audited */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-blue-300">{t('sessionsAudited')}</span>
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-blue-400" />
                                </div>
                            </div>
                            <p className="text-4xl font-bold text-white">{stats.sessionsAudited}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('last24Hours')}</p>
                        </div>
                    </div>

                    {/* Interventions Triggered */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 p-6 hover:border-red-500/40 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-red-300">{t('interventions')}</span>
                                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                            </div>
                            <p className="text-4xl font-bold text-white">{stats.interventionsTriggered}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('blocksFlagsTriggered')}</p>
                        </div>
                    </div>

                    {/* Average Safety Score */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6 hover:border-emerald-500/40 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-emerald-300">{t('safetyScore')}</span>
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                </div>
                            </div>
                            <p className="text-4xl font-bold text-white">{stats.avgSafetyScore}%</p>
                            <p className="text-xs text-gray-400 mt-1">{t('avgAcrossSessions')}</p>
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-purple-300">{t('systemStatus')}</span>
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-purple-400" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                                <p className="text-lg font-bold text-white">{t('operational')}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{t('allSystemsHealthy')}</p>
                        </div>
                    </div>
                </div>

                {/* Live Feed */}
                <div className="rounded-2xl bg-black/30 border border-white/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            <h2 className="text-lg font-semibold text-white">{t('liveRiskFeed')}</h2>
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-gray-300">
                                {t('last50')}
                            </span>
                        </div>
                        <Link
                            href="/admin/governance"
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            <span>{t('fullDashboard')}</span>
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('timestamp')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('model')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('safetyScore')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('trigger')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('riskLevel')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('latency')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                                                    <Shield className="w-8 h-8 text-gray-500" />
                                                </div>
                                                <p className="text-gray-400">{t('noLogs')}</p>
                                                <p className="text-xs text-gray-500">{t('logsAppearHere')}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm text-gray-300 font-mono">
                                                        {new Date(log.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-300 font-mono">
                                                    {log.provider}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${log.safetyScore >= 80 ? 'bg-emerald-500' :
                                                                log.safetyScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${log.safetyScore}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-bold ${getRiskColor(log.safetyScore)}`}>
                                                        {log.safetyScore}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {log.events.length > 0 ? (
                                                    <span className="text-sm text-white">
                                                        {log.events[0].ruleName}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-500">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {log.events.length > 0 ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.events[0].severity)}`}>
                                                        {log.events[0].severity === 'HARD_BLOCK' ? (
                                                            <>
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                {t('hardBlock')}
                                                            </>
                                                        ) : log.events[0].severity === 'SOFT_NUDGE' ? (
                                                            <>
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                {t('softNudge')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                {t('pass')}
                                                            </>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        {t('pass')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-400 font-mono">
                                                    {log.latencyMs}ms
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        setSelectedLog(log);
                                                        setIsReplayOpen(true);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-xs font-medium transition-all"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    {t('view')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span>{t('pass')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span>{t('softNudge')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>{t('hardBlock')}</span>
                    </div>
                </div>
            </div>

            {/* Replay Modal */}
            <ReplayModal
                log={selectedLog}
                isOpen={isReplayOpen}
                onClose={() => {
                    setIsReplayOpen(false);
                    setSelectedLog(null);
                }}
            />
        </div>
    );
}
