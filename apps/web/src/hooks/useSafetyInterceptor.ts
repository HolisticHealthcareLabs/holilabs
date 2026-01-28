
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GovernanceVerdict } from '@/components/governance/RiskCard';

interface SafetyInterceptor {
    activeBlock: GovernanceVerdict | null;
    triggerRedBlock: () => void;
    triggerYellowNudge: () => void;
    dismissBlock: () => void;
    handleOverride: (reason: string) => Promise<void>;
    pendingNudges: GovernanceVerdict[];
}

export function useSafetyInterceptor(toast: any): SafetyInterceptor {
    const [activeBlock, setActiveBlock] = useState<GovernanceVerdict | null>(null);
    const [pendingNudges, setPendingNudges] = useState<GovernanceVerdict[]>([]);

    // Track impressions (Telemetry Check)
    useEffect(() => {
        if (activeBlock) {
            // Phase 1: Telemetry Check (Impression)
            fetch('/api/governance/event', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'IMPRESSION',
                    component: 'RISK_CARD_MODAL',
                    ruleId: activeBlock.ruleId
                })
            }).catch(e => console.error('Telemetry Failed', e));
        }
    }, [activeBlock]);

    // Simulation Helpers
    const triggerRedBlock = useCallback(() => {
        setActiveBlock({
            action: 'BLOCKED',
            severity: 'HARD_BLOCK', // Red Light
            ruleId: 'BSTH-001',
            reason: 'Beta-blockers (Propranolol) are contraindicated in patients with Asthma. Risk of Bronchospasm.',
            source: { authority: 'GINA Guidelines', year: 2024 },
            transactionId: `sim-block-${Date.now()}`
        });
    }, []);

    const triggerYellowNudge = useCallback(() => {
        console.log('[SlowLane] Latency: >800ms'); // Phase 2 Check

        // Phase 3 Check: Race Condition / Priority Queue
        // We need to check if a block is active. 
        // Since state updates may be async, we check the state variable in the closure. 
        // Note: In a real "Interceptor", this would be a specialized class or ref-based check.
        // For React state, `activeBlock` here is the render-cycle value. 
        // If called *immediately* after triggerRedBlock in the same tick, React batching handles it,
        // but if we want strictly "Red active suppresses Yellow", we rely on activeBlock being set.

        // However, the "Stress Test" says click A then B <100ms. 
        // If Red is active, Yellow should be suppressed.
        // Let's use a functional update or Ref to be sure, but relying on `activeBlock` here works if re-render happened.
        // If they click fast, `activeBlock` might be null if re-render hasn't committed.
        // Ideally we use a Ref for 'isBlocked'.

        // For this demo hook, we'll check `activeBlock` directly.
        // If Red Modal is open, we do NOT toast.

        setActiveBlock(currentBlock => {
            if (currentBlock?.severity === 'HARD_BLOCK') {
                console.log('[PriorityQueue] High Priority Signal detected. Suppressing Low Priority.');
                return currentBlock; // Don't change block, don't show toast
            }

            // If no block, show toast
            const nudge: GovernanceVerdict = {
                action: 'FLAGGED',
                severity: 'SOFT_NUDGE',
                ruleId: 'DOSAGE_AUDIT',
                reason: 'Possible dosage mismatch detected (5mg vs 50mg). Please verify.',
                transactionId: `sim-nudge-${Date.now()}`
            };

            // Fire Telemetry
            fetch('/api/governance/event', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'IMPRESSION',
                    component: 'RISK_TOAST',
                    ruleId: nudge.ruleId
                })
            }).catch(() => { });

            toast({
                variant: 'warning',
                title: 'Safety Warning',
                description: nudge.reason,
                duration: 8000,
            });

            // We don't set activeBlock for nudge, just return current (null)
            return currentBlock;
        });

    }, [toast]);

    const dismissBlock = useCallback(() => {
        setActiveBlock(null);
    }, []);

    const handleOverride = useCallback(async (reason: string) => {
        console.log('Logging Override:', {
            ruleId: activeBlock?.ruleId,
            reason,
            timestamp: new Date().toISOString()
        });

        // Phase 1: Liability Check (Network Call)
        await fetch('/api/governance/event', {
            method: 'POST',
            body: JSON.stringify({
                type: 'OVERRIDE',
                ruleId: activeBlock?.ruleId,
                reason: reason,
                sessionId: 'demo-session' // simplified
            })
        });

        setActiveBlock(null);
        toast({
            title: 'Override Logged',
            description: 'The safety block has been overridden. This event has been audited.',
            duration: 3000,
        });
    }, [activeBlock, toast]);

    return {
        activeBlock,
        triggerRedBlock,
        triggerYellowNudge,
        dismissBlock,
        handleOverride,
        pendingNudges
    };
}
