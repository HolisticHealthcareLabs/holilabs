
'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface TraceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: any;
}

export default function TraceDetailModal({ isOpen, onClose, log }: TraceDetailModalProps) {
    if (!isOpen || !log) return null;

    const transcript = log.session?.scribeSession?.transcript || 'No transcript available (Shadow Mode or pure simulation).';
    const note = log.session?.scribeSession?.clinicalNote || log.rawModelOutput || 'No note available.';
    const events = log.events || [];
    const primaryEvent = events[0];

    function tryParseReasoning(raw: string | null) {
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return parsed.reasoning_trace || parsed.message || raw;
        } catch {
            return raw;
        }
    }

    return (
        // Fixed inset overlay (Tailwind Modal)
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">Audit Trace: {log.id.slice(0, 8)}</h2>
                            {primaryEvent?.severity === 'HARD_BLOCK' && (
                                <Badge variant="error">CRITICAL BLOCK</Badge>
                            )}
                            {log.provider && (
                                <Badge variant="info" className="font-mono text-xs">{log.provider}</Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Timestamp: {new Date(log.timestamp).toLocaleString()}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-0">
                    <div className="grid grid-cols-2 h-full">
                        {/* Left: Input (Transcript) */}
                        <div className="flex flex-col border-r h-full bg-slate-50/50">
                            <div className="p-3 border-b bg-slate-100 font-semibold text-xs uppercase tracking-wide text-slate-500">Transcript (Input)</div>
                            <div className="flex-1 p-4 text-sm font-mono whitespace-pre-wrap overflow-y-auto text-slate-700">
                                {transcript}
                            </div>
                        </div>

                        {/* Right: Output (Note or Reasoning) */}
                        <div className="flex flex-col h-full bg-white">
                            <div className="p-3 border-b bg-slate-100 font-semibold text-xs uppercase tracking-wide text-slate-500">Output / Reasoning</div>
                            <div className="flex-1 p-4 text-sm whitespace-pre-wrap overflow-y-auto">
                                {primaryEvent ? (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-red-50 border border-red-100 rounded text-red-900 text-sm">
                                            <strong>Intervention:</strong> {primaryEvent.description}
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-xs uppercase text-slate-400 mb-1">Reasoning Trace</h4>
                                            <div className="p-3 bg-slate-50 border rounded font-mono text-xs text-slate-600 leading-relaxed">
                                                {tryParseReasoning(log.rawModelOutput) || "No chain of thought captured."}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground italic">
                                        No events logged. (Clean Session)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
