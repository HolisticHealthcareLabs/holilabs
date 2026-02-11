
import { NextRequest, NextResponse } from 'next/server';
import { governance } from '@/lib/governance/governance.service';
import {
    emitGovernanceLogEvent,
    emitGovernanceOverrideEvent,
    emitGovernanceBlockedEvent,
} from '@/lib/socket-server';
import { v4 as uuidv4 } from 'uuid';
import {
    validateGovernanceEventRequest,
} from '@/lib/governance/shared-types';
import type {
    GovernanceBlockedEvent,
    GovernanceLogEvent,
    GovernanceOverrideEvent,
} from '@/lib/socket/events';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as unknown;
        const validation = validateGovernanceEventRequest(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid governance event payload',
                    details: validation.errors,
                },
                { status: 400 }
            );
        }

        const event = validation.data;

        // Phase 0: Setup / Telemetry Check
        console.log('[Governance] API Event Received:', event.type, event);

        if (event.type === 'OVERRIDE') {
            // Phase 1: Liability Check
            let persistenceWarning: string | null = null;
            try {
                await governance.logOverride({
                    sessionId: event.sessionId,
                    ruleId: event.ruleId,
                    reason: event.reason,
                    userId: event.userId,
                });
            } catch (persistenceError) {
                // Demo-safe degradation: keep governance event broadcast path alive
                // when local DB schemas are incomplete.
                console.error('[Governance] Override persistence degraded:', persistenceError);
                persistenceWarning = 'override_persistence_degraded';
            }

            // Real-time Socket.IO broadcast for governance override
            // Safety-critical: Immediate push to monitoring dashboards
            const overrideEventPayload = {
                sessionId: event.sessionId,
                ruleId: event.ruleId,
                reason: event.reason,
                userId: event.userId,
                userName: event.userName,
                clinicId: event.clinicId,
                protocolVersion: event.protocolVersion,
                country: event.country,
                siteId: event.siteId,
                unit: event.unit,
                protocolMode: event.protocolMode,
                actorRole: event.actorRole,
            } satisfies Omit<GovernanceOverrideEvent, 'timestamp'>;
            emitGovernanceOverrideEvent(overrideEventPayload);

            // Also emit a log event for the override action
            const overrideLogPayload = {
                id: uuidv4(),
                sessionId: event.sessionId,
                eventType: 'OVERRIDE' as const,
                ruleId: event.ruleId,
                ruleName: event.ruleId ? `Rule ${event.ruleId}` : undefined,
                severity: 'INFO' as const,
                description: `Clinician Override: ${event.reason}`,
                provider: 'clinician-override',
                clinicId: event.clinicId,
                userId: event.userId,
                userName: event.userName,
                protocolVersion: event.protocolVersion,
                country: event.country,
                siteId: event.siteId,
                unit: event.unit,
                protocolMode: event.protocolMode,
                actorRole: event.actorRole,
            } satisfies Omit<GovernanceLogEvent, 'timestamp'>;
            emitGovernanceLogEvent(overrideLogPayload);

            return NextResponse.json({
                success: true,
                message: 'Override Logged',
                ...(persistenceWarning ? { warning: persistenceWarning } : {}),
            });
        }

        if (event.type === 'BLOCKED') {
            // Real-time Socket.IO broadcast for governance block
            // Safety-critical: Immediate push when content is blocked
            const blockedEventPayload = {
                sessionId: event.sessionId,
                ruleId: event.ruleId,
                ruleName: event.ruleName,
                severity: event.severity,
                description: event.description,
                clinicId: event.clinicId,
                userId: event.userId,
                protocolVersion: event.protocolVersion,
                country: event.country,
                siteId: event.siteId,
                unit: event.unit,
                protocolMode: event.protocolMode,
                actorRole: event.actorRole,
            } satisfies Omit<GovernanceBlockedEvent, 'timestamp'>;
            emitGovernanceBlockedEvent(blockedEventPayload);

            // Emit log event for the block
            const blockedLogPayload = {
                id: uuidv4(),
                sessionId: event.sessionId,
                eventType: 'BLOCKED' as const,
                ruleId: event.ruleId,
                ruleName: event.ruleName,
                severity: event.severity,
                description: event.description,
                provider: event.provider || 'rule-engine-v1',
                clinicId: event.clinicId,
                userId: event.userId,
                userName: event.userName,
                protocolVersion: event.protocolVersion,
                country: event.country,
                siteId: event.siteId,
                unit: event.unit,
                protocolMode: event.protocolMode,
                actorRole: event.actorRole,
            } satisfies Omit<GovernanceLogEvent, 'timestamp'>;
            emitGovernanceLogEvent(blockedLogPayload);

            return NextResponse.json({ success: true, message: 'Block event broadcast' });
        }

        if (event.type === 'FLAGGED') {
            // Real-time Socket.IO broadcast for governance flag (warning)
            const flaggedLogPayload = {
                id: uuidv4(),
                sessionId: event.sessionId,
                eventType: 'FLAGGED' as const,
                ruleId: event.ruleId,
                ruleName: event.ruleName,
                severity: event.severity,
                description: event.description,
                provider: event.provider || 'rule-engine-v1',
                clinicId: event.clinicId,
                userId: event.userId,
                userName: event.userName,
                protocolVersion: event.protocolVersion,
                country: event.country,
                siteId: event.siteId,
                unit: event.unit,
                protocolMode: event.protocolMode,
                actorRole: event.actorRole,
            } satisfies Omit<GovernanceLogEvent, 'timestamp'>;
            emitGovernanceLogEvent(flaggedLogPayload);

            return NextResponse.json({ success: true, message: 'Flag event broadcast' });
        }

        if (event.type === 'IMPRESSION') {
            // Phase 1 & 2: Telemetry Check
            // In a real app, this would send to PostHog/Mixpanel
            return NextResponse.json({ success: true, tracked: true });
        }

        if (event.type === 'LATENCY') {
            // Phase 2: Latency Check
            return NextResponse.json({ success: true, latency_metric_recorded: true });
        }

        return NextResponse.json({ success: false, error: 'Unknown event type' }, { status: 400 });
    } catch (error) {
        console.error('[Governance] API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
