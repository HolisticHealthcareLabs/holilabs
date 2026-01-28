
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { AlertTriangle, Shield, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import OverrideForm from './OverrideForm';

export interface GovernanceVerdict {
    action: 'PASSED' | 'BLOCKED' | 'FLAGGED';
    ruleId?: string;
    reason?: string;
    severity: 'INFO' | 'SOFT_NUDGE' | 'HARD_BLOCK';
    transactionId: string;
    source?: { authority: string; year: number; url?: string };
}

interface RiskCardProps {
    verdict: GovernanceVerdict | null;
    isOpen: boolean;
    onDismiss: () => void;
    onOverride: (reason: string) => void;
}

export default function RiskCard({ verdict, isOpen, onDismiss, onOverride }: RiskCardProps) {
    const [showOverride, setShowOverride] = useState(false);

    if (!verdict) return null;
    const isBlocking = verdict.severity === 'HARD_BLOCK';

    if (!isBlocking) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
            <DialogContent className="sm:max-w-[600px] border-l-8 border-l-red-600 p-0 overflow-hidden gap-0">

                {/* Header */}
                <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                        <Shield className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="text-xl text-red-900">
                            Clinical Contraindication Detected
                        </DialogTitle>
                        <DialogDescription className="text-red-700 font-medium">
                            Action Blocked: Patient Safety Risk
                        </DialogDescription>
                    </div>
                </div>

                {/* content */}
                <div className="p-6 space-y-6">

                    {/* The Evidence */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Reasoning</h3>
                        <p className="text-base text-slate-700 leading-relaxed">
                            {verdict.reason}
                        </p>

                        {/* Source Citation */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border inline-flex">
                            <FileText className="w-3 h-3" />
                            <span>Based on: {verdict.source?.authority || 'Clinical Guidelines'} ({verdict.source?.year || 'Current'})</span>
                        </div>
                    </div>

                    {/* Actions */}
                    {!showOverride ? (
                        <div className="flex flex-col gap-3 pt-4">
                            <Button
                                size="lg"
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md group"
                                onClick={onDismiss}
                            >
                                Refine Order / Edit Note
                                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>

                            <button
                                onClick={() => setShowOverride(true)}
                                className="text-xs text-slate-500 hover:text-red-600 hover:underline text-center mt-2"
                            >
                                Override this block (Requires Justification)
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-4 rounded-lg border animate-in slide-in-from-bottom-4 fade-in">
                            <OverrideForm
                                onOverride={onOverride}
                                onCancel={() => setShowOverride(false)}
                            />
                        </div>
                    )}
                </div>

            </DialogContent>
        </Dialog>
    );
}
