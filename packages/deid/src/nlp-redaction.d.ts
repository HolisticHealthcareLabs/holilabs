/**
 * Enhanced NLP-Based Redaction
 * Context-aware PHI detection using pattern matching and heuristics
 *
 * FEATURES:
 * - Context-aware entity detection (not just regex)
 * - Confidence scoring
 * - Multi-language support (EN, ES, PT)
 * - Medical context understanding
 * - False positive reduction
 *
 * NOTE: For production, consider upgrading to:
 * - Microsoft Presidio (free, open-source)
 * - Google Cloud DLP API ($0.50-2.00 per 1000 docs)
 * - AWS Comprehend Medical
 */
export interface NLPRedactionConfig {
    locale: 'en' | 'es' | 'pt';
    minConfidence: number;
    preserveStructure: boolean;
    redactPartial: boolean;
}
export interface DetectedEntity {
    type: EntityType;
    text: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
    context: string;
    replacement: string;
}
export type EntityType = 'PERSON_NAME' | 'EMAIL' | 'PHONE' | 'SSN' | 'MRN' | 'ADDRESS' | 'DATE' | 'LOCATION' | 'ORGANIZATION' | 'AGE' | 'MEDICAL_RECORD';
export interface NLPRedactionResult {
    redactedText: string;
    entities: DetectedEntity[];
    statistics: {
        totalEntities: number;
        entitiesByType: Record<EntityType, number>;
        averageConfidence: number;
        charactersRedacted: number;
    };
}
/**
 * Redact PHI from text using NLP-based entity detection
 *
 * @param text - Text to redact
 * @param config - Redaction configuration
 * @returns Redaction results with detected entities
 */
export declare function redactWithNLP(text: string, config: NLPRedactionConfig): NLPRedactionResult;
//# sourceMappingURL=nlp-redaction.d.ts.map