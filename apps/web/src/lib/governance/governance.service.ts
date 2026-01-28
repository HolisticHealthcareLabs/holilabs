/**
 * Clinical Governance Service (The "Traffic Cop")
 *
 * Latency Budget: < 800ms for Fast Lane checks.
 *
 * Responsibilities:
 * 1. Fast Lane: Synchronous/Near-sync Rule Engine Checks (Deterministic)
 * 2. Slow Lane: Async LLM Consensus (Probabilistic)
 * 3. Black Box Logging: Immutable audit trail
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import jsonLogic from 'json-logic-js';
import { FAST_LANE_RULES } from './governance.rules';

// Type assertion to work around Prisma client not having generated types for new models
// until `prisma db push` or `prisma migrate` can be run against the database.
// The models exist in schema.prisma but the database is behind a firewall.
const db = prisma as any;

export type GovernanceVerdict = {
    action: 'PASSED' | 'BLOCKED' | 'FLAGGED';
    ruleId?: string;
    reason?: string;
    severity: 'INFO' | 'SOFT_NUDGE' | 'HARD_BLOCK';
    transactionId: string;
};

const GOVERNANCE_MODE = process.env.GOVERNANCE_MODE || 'BLOCKING'; // 'BLOCKING' | 'SHADOW'

// mvp medication mapper (in production: named entity recognition)
const MED_CLASS_MAP: Record<string, string> = {
    'propranolol': 'Non-selective Beta-blocker',
    'metoprolol': 'Beta-blocker',
    'carvedilol': 'Non-selective Beta-blocker',
    'timolol': 'Non-selective Beta-blocker',
    'amoxicillin': 'Penicillin',
    'augmentin': 'Penicillin',
    'penicillin': 'Penicillin',
    'ampicillin': 'Penicillin'
};

const CONDITION_MAP: Record<string, string> = {
    'asthma': 'Asthma',
    'reactive airway': 'Asthma',
    'penicillin allergy': 'Penicillin Allergy',
    'allergy to penicillin': 'Penicillin Allergy'
};

export class GovernanceService {
    private static instance: GovernanceService;

    private constructor() { }

    static getInstance(): GovernanceService {
        if (!GovernanceService.instance) {
            GovernanceService.instance = new GovernanceService();
        }
        return GovernanceService.instance;
    }

    /**
     * Fast Lane Check: Runs deterministic rules against content.
     * Must execute in < 200ms.
     */
    async checkFastLane(
        inputPrompt: string,
        context: { patientId?: string; conditions?: string[] },
        sessionId: string,
        options: { sourceModel?: string } = {}
    ): Promise<GovernanceVerdict> {
        const startTime = Date.now();
        const transactionId = `${sessionId}-${startTime}`;

        // 1. Context Normalization (MVP)
        // Convert raw text strings into structured data for json-logic
        const textLower = inputPrompt.toLowerCase();

        // Find proposed medication class
        let proposedClass = 'Unknown';
        for (const [key, cls] of Object.entries(MED_CLASS_MAP)) {
            if (textLower.includes(key)) {
                proposedClass = cls;
                break;
            }
        }

        // Normalize Patient Conditions
        // In real app, these come normalized from EHR (SNOMED-CT codes)
        // Here we map raw strings to canonical names for the rules engine
        const patientConditions: string[] = [];
        if (context.conditions) {
            for (const c of context.conditions) {
                const cLower = c.toLowerCase();
                for (const [key, canonical] of Object.entries(CONDITION_MAP)) {
                    if (cLower.includes(key)) {
                        patientConditions.push(canonical);
                    }
                }
                // pass through raw just in case
                patientConditions.push(c);
            }
        }

        const ruleData = {
            patient_conditions: patientConditions,
            proposed_medication_class: proposedClass
        };

        // 2. Run Rules Engine
        for (const rule of FAST_LANE_RULES) {
            const isBlocked = jsonLogic.apply(rule.logic, ruleData);

            if (isBlocked) {
                // [EDIT 2] Shadow Mode Logic
                const isShadow = GOVERNANCE_MODE === 'SHADOW';
                const verdictAction = isShadow ? 'PASSED' : 'BLOCKED';
                const logAction = isShadow ? 'SHADOW_BLOCK' : 'BLOCKED'; // Corresponds to GovernanceAction enum
                const severity = rule.severity;

                const description = `${rule.intervention.message} (${rule.intervention.recommendation})`;

                // PERF: Log asynchronously (Fail-Open logic)
                this.logEventAsync({
                    sessionId,
                    transactionId,
                    inputPrompt,
                    action: logAction,
                    ruleId: rule.ruleId,
                    description: description,
                    severity: severity,
                    provider: options.sourceModel || 'rule-engine-v1',
                });

                logger.warn({
                    event: 'governance_fast_lane_blocked',
                    ruleId: rule.ruleId,
                    mode: GOVERNANCE_MODE,
                    latencyMs: Date.now() - startTime,
                });

                return {
                    action: verdictAction,
                    ruleId: rule.ruleId,
                    reason: description,
                    severity: severity,
                    transactionId,
                };
            }
        }

        // Pass safe
        return {
            action: 'PASSED',
            severity: 'INFO',
            transactionId,
        };
    }

    /**
     * Async Logging (Fire and Forget)
     * Implements "Black Box" Recorder [BACK-03]
     */
    private async logEventAsync(params: {
        sessionId: string; // Scribe Session ID
        transactionId: string;
        inputPrompt: string;
        action: 'BLOCKED' | 'FLAGGED' | 'PASSED' | 'SHADOW_BLOCK';
        ruleId?: string;
        description?: string;
        severity: 'INFO' | 'SOFT_NUDGE' | 'HARD_BLOCK';
        provider?: string;
    }) {
        try {
            // "Fail-Open" Logic: Errors here must NOT crash the request.
            // We use the Scribe Session ID to link context.

            // 1. Find or Create InteractionSession
            // Optimization: In a high-volume real app, we'd cache this session ID mapping in Redis.
            let interaction = await db.interactionSession.findFirst({
                where: { scribeSessionId: params.sessionId },
            });

            if (!interaction) {
                // ScribeSession should exist, fetch it to get user/patient links
                const scribe = await prisma.scribeSession.findUnique({
                    where: { id: params.sessionId },
                    select: { clinicianId: true, patientId: true }
                });

                if (scribe) {
                    interaction = await db.interactionSession.create({
                        data: {
                            scribeSessionId: params.sessionId,
                            userId: scribe.clinicianId,
                            patientId: scribe.patientId,
                            startedAt: new Date(),
                        }
                    });
                } else {
                    // Fallback for orphaned logs (shouldnt happen in normal flow)
                    logger.warn({ event: 'governance_orphan_log', sessionId: params.sessionId });
                    return;
                }
            }

            // 2. Create the Log Entry (Flight Recorder)
            const log = await db.governanceLog.create({
                data: {
                    sessionId: interaction.id,
                    inputPrompt: params.inputPrompt,
                    // rawModelOutput: null, // We don't have output yet in pre-check
                    timestamp: new Date(),
                    provider: params.provider || 'rule-engine-v1', // [EDIT 1] Chain of Custody
                }
            });

            // 3. Create the Event (The Verdict)
            await db.governanceEvent.create({
                data: {
                    logId: log.id,
                    ruleId: params.ruleId,
                    ruleName: params.ruleId ? `Rule ${params.ruleId}` : 'Fast Lane Check',
                    severity: params.severity,
                    actionTaken: params.action,
                    description: params.description,
                }
            });

        } catch (e) {
            // FAIL-OPEN: Swallow error but log locally so we know the Black Box is broken
            logger.error({
                event: 'governance_logging_failed',
                error: (e as Error).message,
                sessionId: params.sessionId
            });
        }
    }
    async logOverride(params: {
        sessionId: string;
        ruleId?: string;
        reason: string;
        userId?: string;
    }) {
        // Log the override action
        // In a real app, this would link to the previous Block event.
        // For MVP, we log a new event with action_taken='OVERRIDDEN'

        await this.logEventAsync({
            sessionId: params.sessionId,
            transactionId: `override-${Date.now()}`,
            inputPrompt: '[CLIENT_OVERRIDE_EVENT]',
            action: 'PASSED', // It passes now
            ruleId: params.ruleId,
            description: `Clinician Override: ${params.reason}`,
            severity: 'INFO',
            provider: 'clinician-override'
        });

        // Also explicitly log to console for demo verification
        console.log('[GovernanceService] Override Logged:', params);
    }
}

export const governance = GovernanceService.getInstance();
