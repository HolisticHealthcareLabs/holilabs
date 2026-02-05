/**
 * Probabilistic Validator
 * 
 * Uses local LLM (Ollama/Llama 3.1 8B) to assess clinical risk
 * for cases where deterministic rules are insufficient.
 * 
 * @module sidecar/llm/probabilistic-validator
 */

import { OllamaClient } from './ollama-client';
import type { TrafficLightSignal } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClinicalContext {
    medication?: {
        name: string;
        dose?: string;
        frequency?: string;
        route?: string;
    };
    patientAge?: number;
    patientWeight?: number;
    allergies?: string[];
    currentMedications?: string[];
    diagnosis?: string;
    procedure?: string;
}

export interface ProbabilisticResult {
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
    reasoning: string;
    citations: string[];
    latencyMs: number;
    source: 'llm';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const CLINICAL_ASSESSMENT_PROMPT = `You are a clinical decision support system. Your role is to assess potential risks in medication orders.

IMPORTANT: You are NOT making clinical decisions. You are flagging potential concerns for human review.

Analyze the following order:

**Medication**: {{medication_name}}
**Dose**: {{dose}}
**Frequency**: {{frequency}}
**Route**: {{route}}
**Patient Age**: {{patient_age}}
**Patient Weight**: {{patient_weight}} kg
**Known Allergies**: {{allergies}}
**Current Medications**: {{current_meds}}
**Diagnosis/Reason**: {{diagnosis}}

Assess based on standard clinical guidelines:
1. Is this dose within normal range for this patient profile?
2. Are there potential drug-drug interactions with current medications?
3. Are there contraindications based on allergies or diagnosis?

Respond ONLY with valid JSON in this exact format:
{"risk_level":"low","confidence":85,"reasoning":"Brief explanation","citations":["source1"]}

Where:
- risk_level: "low", "medium", or "high"
- confidence: 0-100 (how certain you are)
- reasoning: One sentence explanation
- citations: Array of reference sources (can be empty)`;

// ═══════════════════════════════════════════════════════════════════════════════
// PROBABILISTIC VALIDATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ProbabilisticValidator {
    private ollamaClient: OllamaClient;
    private enabled: boolean = true;

    constructor(ollamaClient?: OllamaClient) {
        this.ollamaClient = ollamaClient || new OllamaClient();
    }

    /**
     * Initialize and check if LLM is available
     */
    async initialize(): Promise<boolean> {
        const health = await this.ollamaClient.healthCheck();
        this.enabled = health.available;

        if (!health.available) {
            console.warn('[ProbabilisticValidator] LLM not available:', health.error);
            console.warn('[ProbabilisticValidator] Probabilistic validation disabled. Relying on deterministic rules only.');
        } else {
            console.info('[ProbabilisticValidator] LLM available. Probabilistic validation enabled.');
        }

        return this.enabled;
    }

    /**
     * Assess clinical context using LLM
     */
    async assess(context: ClinicalContext): Promise<ProbabilisticResult | null> {
        if (!this.enabled) {
            return null; // Graceful degradation
        }

        // Build prompt from context
        const prompt = this.buildPrompt(context);

        try {
            const { response, durationMs } = await this.ollamaClient.generate(prompt, {
                temperature: 0.1, // Low temperature for consistency
                maxTokens: 256,
                jsonMode: true,
            });

            // Parse JSON response
            const parsed = this.parseResponse(response);

            if (!parsed) {
                console.warn('[ProbabilisticValidator] Failed to parse LLM response:', response);
                return null;
            }

            return {
                ...parsed,
                latencyMs: durationMs,
                source: 'llm',
            };
        } catch (error) {
            console.error('[ProbabilisticValidator] Assessment failed:', error);
            return null;
        }
    }

    /**
     * Convert probabilistic result to TrafficLightSignal
     */
    toTrafficLightSignal(result: ProbabilisticResult): TrafficLightSignal {
        const colorMap = {
            low: 'GREEN' as const,
            medium: 'YELLOW' as const,
            high: 'RED' as const,
        };

        return {
            ruleId: 'LLM-PROB-001',
            ruleName: 'Probabilistic Assessment',
            color: colorMap[result.riskLevel],
            message: `${result.reasoning} (Confidence: ${result.confidence}%)`,
            messagePortuguese: `${result.reasoning} (Confiança: ${result.confidence}%)`,
            category: 'PROBABILISTIC',
            evidence: result.citations,
        };
    }

    /**
     * Get current status
     */
    getStatus(): { enabled: boolean; ollamaStatus: ReturnType<OllamaClient['getStatus']> } {
        return {
            enabled: this.enabled,
            ollamaStatus: this.ollamaClient.getStatus(),
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private buildPrompt(context: ClinicalContext): string {
        return CLINICAL_ASSESSMENT_PROMPT
            .replace('{{medication_name}}', context.medication?.name || 'Unknown')
            .replace('{{dose}}', context.medication?.dose || 'Not specified')
            .replace('{{frequency}}', context.medication?.frequency || 'Not specified')
            .replace('{{route}}', context.medication?.route || 'Not specified')
            .replace('{{patient_age}}', context.patientAge?.toString() || 'Unknown')
            .replace('{{patient_weight}}', context.patientWeight?.toString() || 'Unknown')
            .replace('{{allergies}}', context.allergies?.join(', ') || 'None reported')
            .replace('{{current_meds}}', context.currentMedications?.join(', ') || 'None reported')
            .replace('{{diagnosis}}', context.diagnosis || 'Not specified');
    }

    private parseResponse(response: string): Omit<ProbabilisticResult, 'latencyMs' | 'source'> | null {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return null;

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (!parsed.risk_level || typeof parsed.confidence !== 'number') {
                return null;
            }

            return {
                riskLevel: parsed.risk_level as 'low' | 'medium' | 'high',
                confidence: Math.min(100, Math.max(0, parsed.confidence)),
                reasoning: parsed.reasoning || 'No explanation provided',
                citations: Array.isArray(parsed.citations) ? parsed.citations : [],
            };
        } catch {
            return null;
        }
    }
}
