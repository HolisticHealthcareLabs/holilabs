/**
 * Probabilistic Validator
 *
 * Uses local LLM (Ollama/Llama 3.1 8B) to assess clinical risk
 * for cases where deterministic rules are insufficient.
 *
 * Clinical Logic Layer:
 * - ICD-10 codes are validated deterministically via SNOMED ontology BEFORE calling the LLM.
 *   Unknown codes are flagged as UNKNOWN_ICD10 without consuming LLM tokens.
 * - The LLM prompt includes structured ICD-10 codes, SOAP note snippet, and billing code
 *   to enable cross-referencing (billing support validation, not just text completion).
 *
 * @module sidecar/llm/probabilistic-validator
 */

import { OllamaClient } from './ollama-client';
import { DeterministicValidator } from '../ontology/DeterministicValidator';
import { sanitizePatientInput } from '../security/sanitize-patient-input';
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
    /** Structured ICD-10 codes extracted from the SOAP note Assessment section */
    icd10Codes?: string[];
    /** Raw text from the SOAP note Assessment/Plan section */
    soapNoteSnippet?: string;
    /** CPT or procedure code being billed */
    billingCode?: string;
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

const CLINICAL_ASSESSMENT_PROMPT = `You are a clinical decision support system. Your role is to assess potential risks in medication orders and billing codes.

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
**ICD-10 Diagnosis Codes**: {{icd10_codes}}
**SOAP Note Assessment**: {{soap_snippet}}
**Billing/Procedure Code**: {{billing_code}}

Assess based on standard clinical guidelines:
1. Is this dose within normal range for this patient profile?
2. Are there potential drug-drug interactions with current medications?
3. Are there contraindications based on allergies or diagnosis?
4. Do the ICD-10 codes support the billing procedure code? Flag BILLING_MISMATCH if not.
5. Does the SOAP Note Assessment section contain documentation that supports these diagnoses?

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
    private deterministicValidator: DeterministicValidator;
    private enabled: boolean = true;

    constructor(ollamaClient?: OllamaClient) {
        this.ollamaClient = ollamaClient || new OllamaClient();
        this.deterministicValidator = new DeterministicValidator();
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
     * Assess clinical context using LLM.
     *
     * Pre-LLM deterministic gate:
     * - Each ICD-10 code in context.icd10Codes is validated via SNOMED ontology.
     * - Unknown codes immediately return a UNKNOWN_ICD10 high-risk result without LLM call.
     */
    async assess(context: ClinicalContext): Promise<ProbabilisticResult | null> {
        if (!this.enabled) {
            return null; // Graceful degradation
        }

        // ── Pre-LLM deterministic gate: validate ICD-10 codes via SNOMED ──────
        if (context.icd10Codes && context.icd10Codes.length > 0) {
            for (const code of context.icd10Codes) {
                const validation = this.deterministicValidator.validateDiagnosis(code);
                if (!validation.isValid) {
                    console.info('[ProbabilisticValidator] Unknown ICD-10 code flagged without LLM:', code);
                    // Return a deterministic result — no LLM tokens consumed
                    return {
                        riskLevel: 'high',
                        confidence: 95,
                        reasoning: `ICD-10 code "${code}" was not found in the SNOMED ontology and cannot be validated. Verify the code before billing.`,
                        citations: ['SNOMED CT ontology lookup'],
                        latencyMs: 0,
                        source: 'llm',
                    };
                }
            }
        }

        // ── Build prompt with all structured fields and call LLM ──────────────
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

    public close() {
        this.deterministicValidator.close();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private buildPrompt(context: ClinicalContext): string {
        const icd10CodesStr = context.icd10Codes && context.icd10Codes.length > 0
            ? context.icd10Codes.join(', ')
            : 'Not provided';

        const soapResult = sanitizePatientInput(context.soapNoteSnippet || '');
        const billingResult = sanitizePatientInput(context.billingCode || '');
        const diagnosisResult = sanitizePatientInput(context.diagnosis || '');

        if (soapResult.injectionDetected || billingResult.injectionDetected || diagnosisResult.injectionDetected) {
            console.warn('[ProbabilisticValidator] Prompt injection detected in patient input', {
                soapPatterns: soapResult.detectedPatterns,
                billingPatterns: billingResult.detectedPatterns,
                diagnosisPatterns: diagnosisResult.detectedPatterns,
            });
        }

        return CLINICAL_ASSESSMENT_PROMPT
            .replace('{{medication_name}}', context.medication?.name || 'Unknown')
            .replace('{{dose}}', context.medication?.dose || 'Not specified')
            .replace('{{frequency}}', context.medication?.frequency || 'Not specified')
            .replace('{{route}}', context.medication?.route || 'Not specified')
            .replace('{{patient_age}}', context.patientAge?.toString() || 'Unknown')
            .replace('{{patient_weight}}', context.patientWeight?.toString() || 'Unknown')
            .replace('{{allergies}}', context.allergies?.join(', ') || 'None reported')
            .replace('{{current_meds}}', context.currentMedications?.join(', ') || 'None reported')
            .replace('{{diagnosis}}', diagnosisResult.sanitized || 'Not specified')
            .replace('{{icd10_codes}}', icd10CodesStr)
            .replace('{{soap_snippet}}', soapResult.sanitized || 'Not provided')
            .replace('{{billing_code}}', billingResult.sanitized || 'Not specified');
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
