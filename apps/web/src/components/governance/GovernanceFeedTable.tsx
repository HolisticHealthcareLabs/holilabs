
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import TraceDetailModal from './TraceDetailModal';

export default function GovernanceFeedTable({ logs }: { logs: any[] }) {
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    // Map severity to supported Badge variants (error, warning, neutral, etc)
    const getBadgeVariant = (severity: string): 'error' | 'warning' | 'neutral' | 'info' => {
        switch (severity) {
            case 'HARD_BLOCK': return 'error';
            case 'SOFT_NUDGE': return 'warning';
            default: return 'neutral';
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'bg-gray-400';
        if (score < 50) return 'bg-red-500';
        if (score < 80) return 'bg-yellow-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="border rounded-md overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Model / Provider</th>
                            <th className="px-4 py-3">Safety Score</th>
                            <th className="px-4 py-3">Trigger / Rule</th>
                            <th className="px-4 py-3">Risk Level</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No logs found. Waiting for sessions...</td>
                            </tr>
                        ) : logs.map((log) => {
                            const event = log.events?.[0]; // Primary event
                            const isCritical = event?.severity === 'HARD_BLOCK';

                            return (
                                <tr
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${isCritical ? 'bg-red-50 hover:bg-red-100/50' : ''}`}
                                >
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-semibold text-xs bg-slate-100 px-2 py-1 rounded border">
                                            {log.provider || 'unknown'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {/* Score Bar */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getScoreColor(log.safetyScore)}`}
                                                    style={{ width: `${log.safetyScore ?? 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium">{log.safetyScore ?? '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 max-w-[200px] truncate text-xs" title={event?.ruleName}>
                                        {event?.ruleName || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {event ? (
                                            <Badge variant={getBadgeVariant(event.severity)}>
                                                {event.severity}
                                            </Badge>
                                        ) : (
                                            <Badge variant="neutral" className="text-slate-500">CLEAN</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {event?.actionTaken && (
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                {event.actionTaken}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <TraceDetailModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
            />
        </div>
    );
}
