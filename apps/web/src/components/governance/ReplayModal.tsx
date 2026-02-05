'use client';

import { useState } from 'react';
import { X, Clock, Shield, AlertTriangle, CheckCircle2, FileText, Activity, Minus, Plus, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { validateGovernanceLog, ValidationStatus } from '@/app/admin/governance/actions';
import { toast } from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

interface GovernanceEvent {
    id: string;
    ruleName: string;
    severity: string;
    actionTaken: string;
    description: string;
}

interface GovernanceLog {
    id: string;
    createdAt: string;
    provider: string;
    safetyScore: number;
    latencyMs: number;
    session?: {
        user?: { email: string };
        patient?: { firstName: string; lastName: string };
        transcript?: string;
        clinicalNote?: string;
    };
    events: GovernanceEvent[];
    validationStatus?: ValidationStatus;
    validationNotes?: string | null;
    validatedBy?: string | null;
}

interface ReplayModalProps {
    log: GovernanceLog | null;
    isOpen: boolean;
    onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReplayModal({ log, isOpen, onClose }: ReplayModalProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['verdict']));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localStatus, setLocalStatus] = useState<ValidationStatus | null>(null);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectNotes, setRejectNotes] = useState('');

    // Reset local state when modal opens/closes or log changes
    if (log?.id && localStatus === null && log.validationStatus) {
        setLocalStatus(log.validationStatus);
    }

    const handleValidate = async (status: ValidationStatus, notes?: string) => {
        if (!log) return;
        setIsSubmitting(true);
        try {
            const result = await validateGovernanceLog(log.id, status, notes);
            if (result.success) {
                setLocalStatus(status);
                toast.success(status === 'VERIFIED' ? 'Audit verified' : 'Audit flagged as incorrect');
                if (status === 'REJECTED') setShowRejectForm(false);
            } else {
                toast.error('Failed to update validation status');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !log) return null;

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'HARD_BLOCK': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'SOFT_NUDGE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'HARD_BLOCK': return <AlertTriangle className="w-4 h-4 text-red-400" />;
            case 'SOFT_NUDGE': return <Shield className="w-4 h-4 text-amber-400" />;
            default: return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
        }
    };

    const hasEvents = log.events && log.events.length > 0;
    const overallSeverity = hasEvents ? log.events[0].severity : 'PASS';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overallSeverity === 'HARD_BLOCK' ? 'bg-red-500/20' :
                            overallSeverity === 'SOFT_NUDGE' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                            }`}>
                            {getSeverityIcon(overallSeverity)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Audit Replay</h2>
                            <p className="text-xs text-gray-400 font-mono">{log.id.slice(0, 8)}...</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-4">
                    {/* Meta Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs text-gray-400 mb-1">Timestamp</p>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <p className="text-sm text-white font-mono">
                                    {new Date(log.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs text-gray-400 mb-1">Model</p>
                            <p className="text-sm text-white font-mono">{log.provider}</p>
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs text-gray-400 mb-1">Safety Score</p>
                            <p className={`text-lg font-bold ${log.safetyScore >= 80 ? 'text-emerald-400' :
                                log.safetyScore >= 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                {log.safetyScore}%
                            </p>
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs text-gray-400 mb-1">Latency</p>
                            <p className="text-sm text-white font-mono">{log.latencyMs}ms</p>
                        </div>
                    </div>

                    {/* Verdict Section (Collapsible) */}
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <button
                            onClick={() => toggleSection('verdict')}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-semibold text-white">Governance Verdict</span>
                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-gray-300">
                                    {log.events.length} event(s)
                                </span>
                            </div>
                            {expandedSections.has('verdict') ? (
                                <Minus className="w-4 h-4 text-gray-400" />
                            ) : (
                                <Plus className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                        {expandedSections.has('verdict') && (
                            <div className="p-4 space-y-3">
                                {hasEvents ? (
                                    log.events.map((event) => (
                                        <div
                                            key={event.id}
                                            className={`p-4 rounded-xl border ${getSeverityColor(event.severity)}`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {getSeverityIcon(event.severity)}
                                                    <span className="font-semibold">{event.ruleName}</span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10">
                                                    {event.actionTaken}
                                                </span>
                                            </div>
                                            <p className="text-sm opacity-80">{event.description}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="font-medium">All checks passed. No interventions required.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Transcript Section (if available) */}
                    {log.session?.transcript && (
                        <div className="rounded-xl border border-white/10 overflow-hidden">
                            <button
                                onClick={() => toggleSection('transcript')}
                                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-semibold text-white">Session Transcript</span>
                                </div>
                                {expandedSections.has('transcript') ? (
                                    <Minus className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <Plus className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                            {expandedSections.has('transcript') && (
                                <div className="p-4">
                                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                                        {log.session.transcript}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Clinical Note Section (if available) */}
                    {log.session?.clinicalNote && (
                        <div className="rounded-xl border border-white/10 overflow-hidden">
                            <button
                                onClick={() => toggleSection('note')}
                                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-semibold text-white">Clinical Note</span>
                                </div>
                                {expandedSections.has('note') ? (
                                    <Minus className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <Plus className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                            {expandedSections.has('note') && (
                                <div className="p-4">
                                    <div className="text-sm text-gray-300 whitespace-pre-wrap bg-black/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                                        {log.session.clinicalNote}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {/* Footer / Validation Section */}
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {localStatus === 'VERIFIED' ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                                <Check className="w-4 h-4" />
                                <span className="text-sm font-medium">Verified by Human Expert</span>
                            </div>
                        ) : localStatus === 'REJECTED' ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400">
                                <X className="w-4 h-4" />
                                <span className="text-sm font-medium">Marked as Incorrect</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400 mr-2">Was this decision correct?</span>
                                <button
                                    onClick={() => handleValidate('VERIFIED')}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 transition-all disabled:opacity-50"
                                >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    <span className="text-sm font-medium">Yes, Verify</span>
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 transition-all disabled:opacity-50"
                                >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    <span className="text-sm font-medium">No, Flag Issue</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all"
                    >
                        Close
                    </button>
                </div>

                {/* Reject Form Overlay */}
                {showRejectForm && (
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-slate-900 border-t border-white/10 animate-in slide-in-from-bottom-10">
                        <h3 className="text-white font-semibold mb-2">Flag as Incorrect</h3>
                        <p className="text-sm text-gray-400 mb-4">Why was this governance decision incorrect?</p>
                        <textarea
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder="e.g. False positive on PII, missed context..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm mb-4 focus:outline-none focus:border-white/30"
                            rows={3}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectForm(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleValidate('REJECTED', rejectNotes)}
                                disabled={isSubmitting || !rejectNotes.trim()}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Submit Feedback
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReplayModal;
