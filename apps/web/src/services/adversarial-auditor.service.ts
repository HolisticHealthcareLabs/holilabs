
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { AuditorVerdict, IntegrityRiskLevel, DetectionCategory } from '@/domain/auditor.types';
import { AUDITOR_SYSTEM_PROMPT } from '@/prompts/auditor.prompt';
import { OpenAIAuditorAdapter, LLMProvider } from '@/services/llm/openai-auditor.adapter';
import { anonymizer, AnonymizationResult } from '@/services/anonymizer.service';

// ============================================================================
// CONFIGURATION
// ============================================================================

const USE_REAL_LLM = process.env.USE_REAL_LLM === 'true';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const AuditorVerdictSchema = z.object({
    safety_score: z.number().min(0).max(100),
    risk_level: z.nativeEnum(IntegrityRiskLevel),
    categories_detected: z.array(z.nativeEnum(DetectionCategory)),
    reasoning_trace: z.string(),
    clinical_intervention: z.string(),
    execution_metadata: z.object({
        model_id: z.string(),
        latency_ms: z.number(),
        input_tokens: z.number(),
        output_tokens: z.number(),
    }).optional(), // Optional in schema as we enrich it in service
});

// ============================================================================
// LLM PROVIDER INTERFACE (Re-exported for compatibility)
// ============================================================================

export type { LLMProvider } from '@/services/llm/openai-auditor.adapter';

// ============================================================================
// MOCK LLM ADAPTER (Simulator for Demo Mode)
// ============================================================================

class MockLLMAdapter implements LLMProvider {
    async complete(systemPrompt: string, userPrompt: string): Promise<string> {
        // Simulate network latency (200-500ms)
        await new Promise(resolve => setTimeout(resolve, 300));

        // Simple deterministic heuristic for the "Dosage Hallucination" test case
        if (userPrompt.includes('5mg') && userPrompt.includes('50mg')) {
            return JSON.stringify({
                safety_score: 10,
                risk_level: "CRITICAL",
                categories_detected: ["DOSAGE_ERROR"],
                reasoning_trace: "Detected dosage mismatch: Transcript says 5mg, Note says 50mg.",
                clinical_intervention: "CRITICAL WARNING: Dosage mismatch detected."
            });
        }

        // Default "Clean" response
        return JSON.stringify({
            safety_score: 100,
            risk_level: "LOW",
            categories_detected: [],
            reasoning_trace: "No discrepancies found.",
            clinical_intervention: ""
        });
    }
}

// ============================================================================
// ADVERSARIAL AUDITOR SERVICE
// ============================================================================

export class AdversarialAuditorService {
    private static instance: AdversarialAuditorService;
    private llm: LLMProvider;
    private useRealLLM: boolean;

    private constructor() {
        this.useRealLLM = USE_REAL_LLM && !!process.env.OPENAI_API_KEY;

        if (this.useRealLLM) {
            logger.info({ event: 'auditor_init', adapter: 'OpenAIAuditorAdapter' });
            this.llm = new OpenAIAuditorAdapter();
        } else {
            logger.info({ event: 'auditor_init', adapter: 'MockLLMAdapter', reason: 'USE_REAL_LLM not enabled' });
            this.llm = new MockLLMAdapter();
        }
    }

    static getInstance(): AdversarialAuditorService {
        if (!AdversarialAuditorService.instance) {
            AdversarialAuditorService.instance = new AdversarialAuditorService();
        }
        return AdversarialAuditorService.instance;
    }

    private assertNonEmpty(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Missing required ${field}`);
        }
        return value.trim();
    }

    private normalizeExecutionMetadata(verdict: AuditorVerdict) {
        return {
            model_id: this.assertNonEmpty(verdict.execution_metadata?.model_id, 'execution_metadata.model_id'),
            latency_ms: Number.isFinite(verdict.execution_metadata?.latency_ms)
                ? verdict.execution_metadata.latency_ms
                : 0,
            input_tokens: Number.isFinite(verdict.execution_metadata?.input_tokens)
                ? verdict.execution_metadata.input_tokens
                : 0,
            output_tokens: Number.isFinite(verdict.execution_metadata?.output_tokens)
                ? verdict.execution_metadata.output_tokens
                : 0,
        };
    }

    async auditSession(
        sessionId: string,
        transcript: string,
        proposedNote: string
    ): Promise<AuditorVerdict> {
        const startTime = Date.now();
        const modelId = this.useRealLLM ? 'gpt-4o-mini' : 'mock-gpt-4-sim';

        // PRIVACY FIREWALL: Anonymize before sending to LLM
        let anonTranscript: AnonymizationResult | null = null;
        let anonNote: AnonymizationResult | null = null;

        if (this.useRealLLM) {
            anonTranscript = anonymizer.anonymize(transcript);
            anonNote = anonymizer.anonymize(proposedNote);
            logger.info({
                event: 'pii_anonymized',
                sessionId,
                transcriptRedactions: anonTranscript.stats.totalRedactions,
                noteRedactions: anonNote.stats.totalRedactions,
                anonymizationMs: anonTranscript.stats.anonymizationMs + anonNote.stats.anonymizationMs,
            });
        }

        try {
            // Use anonymized text if available, otherwise use raw (mock mode)
            const safeTranscript = anonTranscript?.redactedText ?? transcript;
            const safeNote = anonNote?.redactedText ?? proposedNote;

            const userPrompt = `TRANSCRIPT: "${safeTranscript}"\nNOTE: "${safeNote}"\nOUTPUT:`;
            const rawResponse = await this.llm.complete(AUDITOR_SYSTEM_PROMPT, userPrompt);

            const latencyMs = Date.now() - startTime;

            let parsed;
            try {
                parsed = JSON.parse(rawResponse);
            } catch (e) {
                throw new Error(`Failed to parse LLM JSON: ${rawResponse}`);
            }

            // Validate with Zod
            const validated = AuditorVerdictSchema.parse(parsed);

            // Use execution_metadata from response if present (OpenAI adapter enriches this)
            const verdict: AuditorVerdict = {
                ...validated,
                execution_metadata: validated.execution_metadata ?? {
                    model_id: modelId,
                    latency_ms: latencyMs,
                    input_tokens: transcript.length / 4, // Rough est
                    output_tokens: rawResponse.length / 4, // Rough est
                }
            };

            // REHYDRATE: Restore original values for reasoning trace in dashboard
            if (anonTranscript && verdict.reasoning_trace) {
                verdict.reasoning_trace = anonymizer.rehydrate(
                    verdict.reasoning_trace,
                    anonTranscript.rehydrationMap
                );
            }

            try {
                const persisted = await this.persistVerdict(sessionId, verdict);
                if (!persisted) {
                    logger.warn({
                        event: 'auditor_persistence_skipped',
                        sessionId,
                        reason: 'interaction_session_not_found',
                    });
                }
            } catch (persistError) {
                logger.error({
                    event: 'auditor_persistence_degraded',
                    sessionId,
                    timestamp: new Date().toISOString(),
                    error: persistError instanceof Error ? persistError.message : String(persistError),
                });
            }

            return verdict;

        } catch (error) {
            logger.error({ event: 'auditor_failed', sessionId, error: (error as Error).message });

            // Fail-Safe Return
            return {
                execution_metadata: {
                    model_id: modelId,
                    latency_ms: Date.now() - startTime,
                    input_tokens: 0,
                    output_tokens: 0
                },
                safety_score: 50,
                risk_level: IntegrityRiskLevel.MODERATE,
                categories_detected: [],
                reasoning_trace: "Audit failed. Manual review required.",
                clinical_intervention: "Automated audit failed. Please review note against transcript."
            };
        }
    }

    private async getOrCreateInteractionSession(sessionId: string) {
        const normalizedSessionId = this.assertNonEmpty(sessionId, 'sessionId');

        let interaction = await prisma.interactionSession.findFirst({
            where: { scribeSessionId: normalizedSessionId }
        });

        if (interaction) {
            return interaction;
        }

        const scribe = await prisma.scribeSession.findUnique({
            where: { id: normalizedSessionId },
            select: { clinicianId: true, patientId: true }
        });

        if (!scribe?.clinicianId) {
            logger.warn({
                event: 'auditor_missing_interaction_context',
                sessionId: normalizedSessionId,
                reason: 'scribe_session_not_found',
                timestamp: new Date().toISOString(),
            });
            return null;
        }

        interaction = await prisma.interactionSession.create({
            data: {
                scribeSessionId: normalizedSessionId,
                userId: scribe.clinicianId,
                patientId: scribe.patientId,
                startedAt: new Date(),
            }
        });

        return interaction;
    }

    private async persistVerdict(sessionId: string, verdict: AuditorVerdict): Promise<boolean> {
        const normalizedSessionId = this.assertNonEmpty(sessionId, 'sessionId');
        const metadata = this.normalizeExecutionMetadata(verdict);

        try {
            const interaction = await this.getOrCreateInteractionSession(normalizedSessionId);
            if (!interaction) {
                return false;
            }

            // Create Log
            const log = await prisma.governanceLog.create({
                data: {
                    sessionId: interaction.id,
                    inputPrompt: "Adversarial Audit", // Simplified for log
                    rawModelOutput: JSON.stringify(verdict),
                    provider: metadata.model_id,
                    safetyScore: verdict.safety_score,
                    latencyMs: metadata.latency_ms,
                    tokenCount: metadata.input_tokens + metadata.output_tokens,
                }
            });

            // Create Event if Critical
            if (verdict.risk_level === IntegrityRiskLevel.CRITICAL) {
                await prisma.governanceEvent.create({
                    data: {
                        logId: log.id,
                        ruleName: "Adversarial Audit",
                        severity: "HARD_BLOCK", // Mapping CRITICAL -> HARD_BLOCK
                        actionTaken: "FLAGGED", // Auditor flags, Traffic Cop blocks
                        description: verdict.clinical_intervention
                    }
                });
            }

            return true;
        } catch (e) {
            logger.error({
                event: 'auditor_persist_failed',
                sessionId: normalizedSessionId,
                timestamp: new Date().toISOString(),
                error: (e as Error).message,
            });
            throw e;
        }
    }
}

export const adversarialAuditor = AdversarialAuditorService.getInstance();
