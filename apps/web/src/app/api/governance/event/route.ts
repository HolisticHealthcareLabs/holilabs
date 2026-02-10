
import { NextRequest, NextResponse } from 'next/server';
import { governance } from '@/lib/governance/governance.service';
import {
    emitGovernanceLogEvent,
    emitGovernanceOverrideEvent,
    emitGovernanceBlockedEvent,
} from '@/lib/socket-server';
import { v4 as uuidv4 } from 'uuid';
import { OVERRIDE_REASON_CODES, isOverrideReasonCode } from '@/lib/governance/shared-types';

function getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function getSeverity(value: unknown, fallback: 'INFO' | 'SOFT_NUDGE' | 'HARD_BLOCK'): 'INFO' | 'SOFT_NUDGE' | 'HARD_BLOCK' {
    return value === 'INFO' || value === 'SOFT_NUDGE' || value === 'HARD_BLOCK' ? value : fallback;
}

function getBlockingSeverity(value: unknown, fallback: 'SOFT_NUDGE' | 'HARD_BLOCK'): 'SOFT_NUDGE' | 'HARD_BLOCK' {
    return value === 'SOFT_NUDGE' || value === 'HARD_BLOCK' ? value : fallback;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as Record<string, unknown>;
        const { type, ...payload } = body;
        const governanceContext = {
            protocolVersion: getString(payload.protocolVersion),
            country: getString(payload.country),
            siteId: getString(payload.siteId),
        };

        // Phase 0: Setup / Telemetry Check
        console.log(`[Governance] API Event Received:`, type, payload);

        if (type === 'OVERRIDE') {
            const normalizedReason =
                typeof payload.reason === 'string' ? payload.reason.trim() : '';
            if (!isOverrideReasonCode(normalizedReason)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Override requires a valid reason code',
                        allowedReasons: OVERRIDE_REASON_CODES,
                    },
                    { status: 400 }
                );
            }

            // Phase 1: Liability Check
            await governance.logOverride({
                sessionId: getString(payload.sessionId) || 'demo-session',
                ruleId: getString(payload.ruleId),
                reason: normalizedReason,
                userId: getString(payload.userId),
            });

            // Real-time Socket.IO broadcast for governance override
            // Safety-critical: Immediate push to monitoring dashboards
            const overrideEventPayload = {
                sessionId: getString(payload.sessionId) || 'demo-session',
                ruleId: getString(payload.ruleId),
                reason: normalizedReason,
                userId: getString(payload.userId),
                userName: getString(payload.userName),
                clinicId: getString(payload.clinicId),
                ...governanceContext,
            };
            emitGovernanceOverrideEvent(overrideEventPayload);

            // Also emit a log event for the override action
            const overrideLogPayload = {
                id: uuidv4(),
                sessionId: getString(payload.sessionId) || 'demo-session',
                eventType: 'OVERRIDE' as const,
                ruleId: getString(payload.ruleId),
                ruleName: getString(payload.ruleId) ? `Rule ${payload.ruleId}` : undefined,
                severity: 'INFO' as const,
                description: `Clinician Override: ${normalizedReason}`,
                provider: 'clinician-override',
                clinicId: getString(payload.clinicId),
                userId: getString(payload.userId),
                userName: getString(payload.userName),
                ...governanceContext,
            };
            emitGovernanceLogEvent(overrideLogPayload);

            return NextResponse.json({ success: true, message: 'Override Logged' });
        }

        if (type === 'BLOCKED') {
            // Real-time Socket.IO broadcast for governance block
            // Safety-critical: Immediate push when content is blocked
            const blockedEventPayload = {
                sessionId: getString(payload.sessionId) || 'demo-session',
                ruleId: getString(payload.ruleId),
                ruleName: getString(payload.ruleName),
                severity: getBlockingSeverity(payload.severity, 'HARD_BLOCK'),
                description: getString(payload.description),
                clinicId: getString(payload.clinicId),
                userId: getString(payload.userId),
                ...governanceContext,
            };
            emitGovernanceBlockedEvent(blockedEventPayload);

            // Emit log event for the block
            const blockedLogPayload = {
                id: uuidv4(),
                sessionId: getString(payload.sessionId) || 'demo-session',
                eventType: 'BLOCKED' as const,
                ruleId: getString(payload.ruleId),
                ruleName: getString(payload.ruleName),
                severity: getSeverity(payload.severity, 'HARD_BLOCK'),
                description: getString(payload.description),
                provider: getString(payload.provider) || 'rule-engine-v1',
                clinicId: getString(payload.clinicId),
                userId: getString(payload.userId),
                userName: getString(payload.userName),
                ...governanceContext,
            };
            emitGovernanceLogEvent(blockedLogPayload);

            return NextResponse.json({ success: true, message: 'Block event broadcast' });
        }

        if (type === 'FLAGGED') {
            // Real-time Socket.IO broadcast for governance flag (warning)
            const flaggedLogPayload = {
                id: uuidv4(),
                sessionId: getString(payload.sessionId) || 'demo-session',
                eventType: 'FLAGGED' as const,
                ruleId: getString(payload.ruleId),
                ruleName: getString(payload.ruleName),
                severity: getSeverity(payload.severity, 'SOFT_NUDGE'),
                description: getString(payload.description),
                provider: getString(payload.provider) || 'rule-engine-v1',
                clinicId: getString(payload.clinicId),
                userId: getString(payload.userId),
                userName: getString(payload.userName),
                ...governanceContext,
            };
            emitGovernanceLogEvent(flaggedLogPayload);

            return NextResponse.json({ success: true, message: 'Flag event broadcast' });
        }

        if (type === 'IMPRESSION') {
            // Phase 1 & 2: Telemetry Check
            // In a real app, this would send to PostHog/Mixpanel
            return NextResponse.json({ success: true, tracked: true });
        }

        if (type === 'LATENCY') {
            // Phase 2: Latency Check
            return NextResponse.json({ success: true, latency_metric_recorded: true });
        }

        return NextResponse.json({ success: false, error: 'Unknown event type' }, { status: 400 });
    } catch (error) {
        console.error('[Governance] API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
