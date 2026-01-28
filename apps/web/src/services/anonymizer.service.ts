/**
 * AnonymizerService - Privacy Firewall for HIPAA Compliance
 * 
 * Tokenizes PII entities before they leave the system boundary.
 * Supports rehydration for dashboard readability.
 * 
 * @module services/anonymizer.service
 */

// ============================================================================
// MEDICAL EPONYM ALLOW LIST (Do NOT redact these as names)
// ============================================================================

const MEDICAL_EPONYMS = new Set([
    // Diseases
    'parkinson', 'alzheimer', 'addison', 'cushing', 'crohn', 'hodgkin',
    'huntington', 'hashimoto', 'graves', 'bell', 'meniere', 'raynaud',
    'tourette', 'asperger', 'marfan', 'ehlers', 'danlos', 'guillain',
    'barre', 'wilson', 'paget', 'wegener', 'behcet', 'sjogren',
    // Anatomy/Procedures
    'fallopian', 'eustachian', 'bartholin', 'langerhans', 'purkinje',
    // Drug names that look like names
    'tylenol', 'motrin', 'advil', 'benadryl', 'claritin', 'zyrtec',
]);

// ============================================================================
// REGEX PATTERNS FOR PII DETECTION
// ============================================================================

const PATTERNS = {
    // Phone numbers: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, xxxxxxxxxx
    PHONE: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,

    // SSN: xxx-xx-xxxx
    SSN: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,

    // Email addresses
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,

    // Dates: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, Month DD, YYYY
    DATE: /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?)\b/gi,

    // Street addresses (simplified): Number + Street name + type
    ADDRESS: /\b\d+\s+(?:[A-Z][a-z]+\s+)+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl)\b\.?/gi,

    // MRN/Account numbers: Common patterns like MRN: 12345, Account: ABC123
    MRN: /\b(?:MRN|Medical Record|Account|Patient ID)[:\s#]*[A-Z0-9-]+/gi,

    // ZIP codes (5 or 9 digit)
    ZIP: /\b\d{5}(?:-\d{4})?\b/g,

    // Names: Capitalized words that look like names (conservative approach)
    // Uses negative lookahead to avoid medical terms
    NAME: /\b(?!(?:Dr|Mr|Mrs|Ms|Miss)\b)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g,
};

// ============================================================================
// TYPES
// ============================================================================

export interface AnonymizationResult {
    redactedText: string;
    rehydrationMap: Map<string, string>;
    stats: {
        totalRedactions: number;
        anonymizationMs: number;
        redactionsByType: Record<string, number>;
    };
}

type EntityType = 'PATIENT_NAME' | 'DATE' | 'PHONE' | 'SSN' | 'EMAIL' | 'ADDRESS' | 'MRN' | 'ZIP';

// ============================================================================
// ANONYMIZER SERVICE
// ============================================================================

export class AnonymizerService {
    private static instance: AnonymizerService;

    private constructor() { }

    static getInstance(): AnonymizerService {
        if (!AnonymizerService.instance) {
            AnonymizerService.instance = new AnonymizerService();
        }
        return AnonymizerService.instance;
    }

    /**
     * Anonymize text by tokenizing PII entities
     * @param text - Raw text potentially containing PII
     * @returns Anonymized text with rehydration map
     */
    anonymize(text: string): AnonymizationResult {
        const startTime = performance.now();
        const rehydrationMap = new Map<string, string>();
        const redactionsByType: Record<string, number> = {};
        let totalRedactions = 0;
        let result = text;

        // Process each entity type
        const entityCounters: Record<EntityType, number> = {
            PATIENT_NAME: 0,
            DATE: 0,
            PHONE: 0,
            SSN: 0,
            EMAIL: 0,
            ADDRESS: 0,
            MRN: 0,
            ZIP: 0,
        };

        // Order matters: Process more specific patterns first

        // 1. MRN/Account numbers
        result = this.replaceWithToken(result, PATTERNS.MRN, 'MRN', entityCounters, rehydrationMap, redactionsByType);

        // 2. SSN (before phone to avoid overlap)
        result = this.replaceWithToken(result, PATTERNS.SSN, 'SSN', entityCounters, rehydrationMap, redactionsByType);

        // 3. Phone numbers
        result = this.replaceWithToken(result, PATTERNS.PHONE, 'PHONE', entityCounters, rehydrationMap, redactionsByType);

        // 4. Email addresses
        result = this.replaceWithToken(result, PATTERNS.EMAIL, 'EMAIL', entityCounters, rehydrationMap, redactionsByType);

        // 5. Dates
        result = this.replaceWithToken(result, PATTERNS.DATE, 'DATE', entityCounters, rehydrationMap, redactionsByType);

        // 6. Addresses
        result = this.replaceWithToken(result, PATTERNS.ADDRESS, 'ADDRESS', entityCounters, rehydrationMap, redactionsByType);

        // 7. ZIP codes (after addresses)
        result = this.replaceWithToken(result, PATTERNS.ZIP, 'ZIP', entityCounters, rehydrationMap, redactionsByType);

        // 8. Names (last, most conservative)
        result = this.replaceNamesWithToken(result, entityCounters, rehydrationMap, redactionsByType);

        // Calculate stats
        for (const count of Object.values(redactionsByType)) {
            totalRedactions += count;
        }

        const anonymizationMs = performance.now() - startTime;

        console.log(`[AnonymizerService] Processed in ${anonymizationMs.toFixed(2)}ms, ${totalRedactions} redactions`);

        return {
            redactedText: result,
            rehydrationMap,
            stats: {
                totalRedactions,
                anonymizationMs,
                redactionsByType,
            },
        };
    }

    /**
     * Rehydrate tokenized text back to original values
     * @param redactedText - Text with tokens
     * @param map - Rehydration map from anonymize()
     * @returns Original text with PII restored
     */
    rehydrate(redactedText: string, map: Map<string, string>): string {
        let result = redactedText;

        for (const [token, original] of map.entries()) {
            result = result.replace(token, original);
        }

        return result;
    }

    /**
     * Replace matches with tokens using the provided pattern
     */
    private replaceWithToken(
        text: string,
        pattern: RegExp,
        entityType: EntityType,
        counters: Record<EntityType, number>,
        map: Map<string, string>,
        stats: Record<string, number>
    ): string {
        // Create a fresh regex to reset lastIndex
        const regex = new RegExp(pattern.source, pattern.flags);

        return text.replace(regex, (match) => {
            counters[entityType]++;
            const token = `[${entityType}_${counters[entityType]}]`;
            map.set(token, match);
            stats[entityType] = (stats[entityType] || 0) + 1;
            return token;
        });
    }

    /**
     * Special handling for names to avoid medical eponyms
     */
    private replaceNamesWithToken(
        text: string,
        counters: Record<EntityType, number>,
        map: Map<string, string>,
        stats: Record<string, number>
    ): string {
        const regex = new RegExp(PATTERNS.NAME.source, PATTERNS.NAME.flags);

        return text.replace(regex, (match) => {
            // Check if any word in the match is a medical eponym
            const words = match.toLowerCase().split(/\s+/);
            const isMedicalTerm = words.some(word => MEDICAL_EPONYMS.has(word));

            if (isMedicalTerm) {
                // Don't redact medical terms
                return match;
            }

            counters.PATIENT_NAME++;
            const token = `[PATIENT_NAME_${counters.PATIENT_NAME}]`;
            map.set(token, match);
            stats.PATIENT_NAME = (stats.PATIENT_NAME || 0) + 1;
            return token;
        });
    }
}

export const anonymizer = AnonymizerService.getInstance();
