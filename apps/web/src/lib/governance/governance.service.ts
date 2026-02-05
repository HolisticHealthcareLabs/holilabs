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
import { evaluateUnifiedTrafficLight } from './unified-engine';
import { UNIFIED_RULES_DB } from './rules-db-seed';
import { EvaluationContext, RuleCache, GovernanceVerdict } from './shared-types';
import { RxNormNormalizer } from '../normalization/rxnorm-normalizer';

// Type assertion to work around Prisma client not having generated types
const db = prisma as any;

const GOVERNANCE_MODE = process.env.GOVERNANCE_MODE || 'BLOCKING';

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
     * Fast Lane Check: Runs deterministic rules using the UNIFIED ENGINE.
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

        // 1. Context Normalization (Powered by RxNorm)
        const textLower = inputPrompt.toLowerCase();

        // [HARDENING] Use RxNorm Normalizer instead of fragile string map
        const normalizedDrug = RxNormNormalizer.normalize(textLower);

        // If found, use the primary class, otherwise default to "Unknown"
        // The Unified Engine will match this string against rule conditions.
        // e.g. "Toprol" -> "Beta-blocker"
        const proposedClass = normalizedDrug ? normalizedDrug.classes[0] : 'Unknown';

        // Normalize Patient Conditions
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

        // 1.5 Extract "Current Medications" from history/context if available
        // For MVP demo, we don't have full medication list in context arg, 
        // so we simulate it or rely on prompts containing "on warfarin" (future NER)
        // For strict rules like Warfarin+NSAID, we assume the patient context *might* have it.
        // Or we pass it in if checking against a "med profile".
        // FIX: For this specific function signature, we'll map `patientConditions` to `patient_conditions`
        // and add a placeholder for current_meds if we can parse them.
        const currentMedications: string[] = [];
        // Hack for demo: if prompt lists "on warfarin", add it.
        if (textLower.includes('on warfarin') || textLower.includes('taking warfarin')) currentMedications.push('Warfarin');
        if (textLower.includes('on nitroglycerin')) currentMedications.push('Nitroglycerin');


        // 2. Prepare Context for Unified Engine
        const evaluationContext: EvaluationContext = {
            action: 'prescription', // default for this flow
            payload: {
                proposed_medication_class: proposedClass,
                patient_conditions: patientConditions,
                current_medications: currentMedications, // Unified engine expects this field for interactions
                // Pass raw text for advanced regex rules if needed
                raw_text: inputPrompt
            },
            // [CRITICAL] UNIFIED SOURCE: Fetch rules from the "Golden Record" (Seed)
            rules: UNIFIED_RULES_DB
        };

        // 3. Execute Unified Engine
        // This runs the EXACT same logic as the Edge (traffic-light/engine.ts)
        const result = await evaluateUnifiedTrafficLight(evaluationContext);

        // 4. Transform Result to GovernanceVerdict
        if (result.color === 'RED') {
            const primarySignal = result.signals.find(s => s.color === 'RED') || result.signals[0];
            const description = `${primarySignal.message} ${primarySignal.suggestedCorrection ? `(${primarySignal.suggestedCorrection})` : ''}`;

            const isShadow = GOVERNANCE_MODE === 'SHADOW';
            const verdictAction = isShadow ? 'PASSED' : 'BLOCKED';
            const logAction = isShadow ? 'SHADOW_BLOCK' : 'BLOCKED';
            const severity = 'HARD_BLOCK'; // Map RED to HARD_BLOCK

            // PERF: Log asynchronously (Fail-Open logic)
            this.logEventAsync({
                sessionId,
                transactionId,
                inputPrompt,
                action: logAction,
                ruleId: primarySignal.ruleId,
                description: description,
                severity: severity,
                provider: options.sourceModel || 'unified-engine-v1',
            });

            logger.warn({
                event: 'governance_unified_engine_blocked',
                ruleId: primarySignal.ruleId,
                mode: GOVERNANCE_MODE,
                latencyMs: Date.now() - startTime,
            });

            return {
                action: verdictAction,
                ruleId: primarySignal.ruleId,
                reason: description,
                severity: severity,
                transactionId,
            };
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
                    // logger.warn({ event: 'governance_orphan_log', sessionId: params.sessionId });
                    // SILENT FAIL for demo if session not found (avoid clutter)
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
                    provider: params.provider || 'unified-engine-v1', // [EDIT 1] Chain of Custody
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

    /**
     * Sync Protocol: Get the current "Golden Record" version hash.
     * The Dashboard uses this to check if Edge nodes are compliant.
     */
    getRulesetVersion(): string {
        // Lazy load keys to avoid circular deps if any
        const { RulesManifest } = require('./rules-manifest');
        return RulesManifest.getActiveManifest();
    }
}

export const governance = GovernanceService.getInstance();
