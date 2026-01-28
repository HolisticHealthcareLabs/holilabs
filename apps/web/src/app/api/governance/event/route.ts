
import { NextRequest, NextResponse } from 'next/server';
import { governance } from '@/lib/governance/governance.service';
import {
    emitGovernanceLogEvent,
    emitGovernanceOverrideEvent,
    emitGovernanceBlockedEvent,
} from '@/lib/socket-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, ...payload } = body;

        // Phase 0: Setup / Telemetry Check
        console.log(`[Governance] API Event Received:`, type, payload);

        if (type === 'OVERRIDE') {
            // Phase 1: Liability Check
            await governance.logOverride({
                sessionId: payload.sessionId || 'demo-session',
                ruleId: payload.ruleId,
                reason: payload.reason,
                userId: payload.userId,
            });

            // Real-time Socket.IO broadcast for governance override
            // Safety-critical: Immediate push to monitoring dashboards
            emitGovernanceOverrideEvent({
                sessionId: payload.sessionId || 'demo-session',
                ruleId: payload.ruleId,
                reason: payload.reason,
                userId: payload.userId,
                userName: payload.userName,
                clinicId: payload.clinicId,
            });

            // Also emit a log event for the override action
            emitGovernanceLogEvent({
                id: uuidv4(),
                sessionId: payload.sessionId || 'demo-session',
                eventType: 'OVERRIDE',
                ruleId: payload.ruleId,
                ruleName: payload.ruleId ? `Rule ${payload.ruleId}` : undefined,
                severity: 'INFO',
                description: `Clinician Override: ${payload.reason}`,
                provider: 'clinician-override',
                clinicId: payload.clinicId,
                userId: payload.userId,
                userName: payload.userName,
            });

            return NextResponse.json({ success: true, message: 'Override Logged' });
        }

        if (type === 'BLOCKED') {
            // Real-time Socket.IO broadcast for governance block
            // Safety-critical: Immediate push when content is blocked
            emitGovernanceBlockedEvent({
                sessionId: payload.sessionId || 'demo-session',
                ruleId: payload.ruleId,
                ruleName: payload.ruleName,
                severity: payload.severity || 'HARD_BLOCK',
                description: payload.description,
                clinicId: payload.clinicId,
                userId: payload.userId,
            });

            // Emit log event for the block
            emitGovernanceLogEvent({
                id: uuidv4(),
                sessionId: payload.sessionId || 'demo-session',
                eventType: 'BLOCKED',
                ruleId: payload.ruleId,
                ruleName: payload.ruleName,
                severity: payload.severity || 'HARD_BLOCK',
                description: payload.description,
                provider: payload.provider || 'rule-engine-v1',
                clinicId: payload.clinicId,
                userId: payload.userId,
                userName: payload.userName,
            });

            return NextResponse.json({ success: true, message: 'Block event broadcast' });
        }

        if (type === 'FLAGGED') {
            // Real-time Socket.IO broadcast for governance flag (warning)
            emitGovernanceLogEvent({
                id: uuidv4(),
                sessionId: payload.sessionId || 'demo-session',
                eventType: 'FLAGGED',
                ruleId: payload.ruleId,
                ruleName: payload.ruleName,
                severity: payload.severity || 'SOFT_NUDGE',
                description: payload.description,
                provider: payload.provider || 'rule-engine-v1',
                clinicId: payload.clinicId,
                userId: payload.userId,
                userName: payload.userName,
            });

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
