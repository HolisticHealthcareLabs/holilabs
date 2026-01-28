/**
 * SNOMED CT Service - Clinical Terminology
 * 
 * SNOMED CT (Systematized Nomenclature of Medicine - Clinical Terms) is the
 * most comprehensive clinical terminology standard, used globally for:
 * - Clinical documentation
 * - EHR interoperability
 * - Clinical decision support
 * 
 * @see https://www.snomed.org/
 * @see https://browser.ihtsdotools.org/
 */

import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

interface SNOMEDConcept {
    conceptId: string;
    term: string;
    fsn: string; // Fully Specified Name
    semanticTag: 'disorder' | 'finding' | 'procedure' | 'substance' | 'observable' | 'body structure' | 'other';
    active: boolean;
}

interface SNOMEDRelationship {
    type: 'IS_A' | 'FINDING_SITE' | 'CAUSATIVE_AGENT' | 'HAS_INGREDIENT';
    target: SNOMEDConcept;
}

interface SNOMEDSearchResult {
    matches: SNOMEDConcept[];
    totalCount: number;
}

// =============================================================================
// CORE SNOMED CT CONCEPTS (High-frequency codes for clinical use)
// =============================================================================

const SNOMED_CONCEPTS: Record<string, SNOMEDConcept> = {
    // Disorders
    '195967001': { conceptId: '195967001', term: 'Asthma', fsn: 'Asthma (disorder)', semanticTag: 'disorder', active: true },
    '44054006': { conceptId: '44054006', term: 'Diabetes mellitus type 2', fsn: 'Diabetes mellitus type 2 (disorder)', semanticTag: 'disorder', active: true },
    '46635009': { conceptId: '46635009', term: 'Diabetes mellitus type 1', fsn: 'Diabetes mellitus type 1 (disorder)', semanticTag: 'disorder', active: true },
    '38341003': { conceptId: '38341003', term: 'Hypertensive disorder', fsn: 'Hypertensive disorder, systemic arterial (disorder)', semanticTag: 'disorder', active: true },
    '22298006': { conceptId: '22298006', term: 'Myocardial infarction', fsn: 'Myocardial infarction (disorder)', semanticTag: 'disorder', active: true },
    '84114007': { conceptId: '84114007', term: 'Heart failure', fsn: 'Heart failure (disorder)', semanticTag: 'disorder', active: true },
    '13645005': { conceptId: '13645005', term: 'Chronic obstructive lung disease', fsn: 'Chronic obstructive lung disease (disorder)', semanticTag: 'disorder', active: true },
    '233604007': { conceptId: '233604007', term: 'Pneumonia', fsn: 'Pneumonia (disorder)', semanticTag: 'disorder', active: true },
    '35489007': { conceptId: '35489007', term: 'Depressive disorder', fsn: 'Depressive disorder (disorder)', semanticTag: 'disorder', active: true },
    '197480006': { conceptId: '197480006', term: 'Anxiety disorder', fsn: 'Anxiety disorder (disorder)', semanticTag: 'disorder', active: true },
    '91302008': { conceptId: '91302008', term: 'Sepsis', fsn: 'Sepsis (disorder)', semanticTag: 'disorder', active: true },
    '840539006': { conceptId: '840539006', term: 'COVID-19', fsn: 'Disease caused by SARS-CoV-2 (disorder)', semanticTag: 'disorder', active: true },

    // Findings
    '271649006': { conceptId: '271649006', term: 'Elevated blood pressure', fsn: 'Elevated blood pressure reading (finding)', semanticTag: 'finding', active: true },
    '267036007': { conceptId: '267036007', term: 'Shortness of breath', fsn: 'Dyspnea (finding)', semanticTag: 'finding', active: true },
    '25064002': { conceptId: '25064002', term: 'Headache', fsn: 'Headache (finding)', semanticTag: 'finding', active: true },
    '386661006': { conceptId: '386661006', term: 'Fever', fsn: 'Fever (finding)', semanticTag: 'finding', active: true },
    '49727002': { conceptId: '49727002', term: 'Cough', fsn: 'Cough (finding)', semanticTag: 'finding', active: true },
    '29857009': { conceptId: '29857009', term: 'Chest pain', fsn: 'Chest pain (finding)', semanticTag: 'finding', active: true },

    // Procedures
    '363680008': { conceptId: '363680008', term: 'X-ray', fsn: 'Radiographic imaging procedure (procedure)', semanticTag: 'procedure', active: true },
    '77477000': { conceptId: '77477000', term: 'CT scan', fsn: 'Computerized axial tomography (procedure)', semanticTag: 'procedure', active: true },
    '113091000': { conceptId: '113091000', term: 'MRI', fsn: 'Magnetic resonance imaging (procedure)', semanticTag: 'procedure', active: true },
    '104001': { conceptId: '104001', term: 'Electrocardiogram', fsn: 'Electrocardiographic procedure (procedure)', semanticTag: 'procedure', active: true },

    // Substances/Medications
    '372756006': { conceptId: '372756006', term: 'Warfarin', fsn: 'Warfarin (substance)', semanticTag: 'substance', active: true },
    '387517004': { conceptId: '387517004', term: 'Paracetamol', fsn: 'Paracetamol (substance)', semanticTag: 'substance', active: true },
    '387458008': { conceptId: '387458008', term: 'Aspirin', fsn: 'Aspirin (substance)', semanticTag: 'substance', active: true },
    '372664007': { conceptId: '372664007', term: 'Metformin', fsn: 'Metformin (substance)', semanticTag: 'substance', active: true },
};

// SNOMED CT to ICD-10 Mapping (subset)
const SNOMED_TO_ICD10: Record<string, string[]> = {
    '195967001': ['J45.9', 'J45'],           // Asthma
    '44054006': ['E11', 'E11.9'],            // Type 2 DM
    '46635009': ['E10', 'E10.9'],            // Type 1 DM
    '38341003': ['I10', 'I11', 'I12', 'I13'], // Hypertension
    '22298006': ['I21', 'I21.9'],            // MI
    '84114007': ['I50', 'I50.9'],            // Heart failure
    '13645005': ['J44', 'J44.9'],            // COPD
    '233604007': ['J18', 'J18.9'],           // Pneumonia
    '35489007': ['F32', 'F33'],              // Depression
    '197480006': ['F41', 'F41.9'],           // Anxiety
    '91302008': ['A41', 'A41.9'],            // Sepsis
    '840539006': ['U07.1'],                  // COVID-19
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Search SNOMED CT concepts by term
 */
export function searchConcepts(
    term: string,
    options?: { semanticTag?: SNOMEDConcept['semanticTag']; limit?: number }
): SNOMEDSearchResult {
    const { semanticTag, limit = 20 } = options || {};
    const lowerTerm = term.toLowerCase();

    let matches = Object.values(SNOMED_CONCEPTS).filter(concept => {
        const matchesTerm =
            concept.term.toLowerCase().includes(lowerTerm) ||
            concept.fsn.toLowerCase().includes(lowerTerm);

        if (semanticTag) {
            return matchesTerm && concept.semanticTag === semanticTag;
        }
        return matchesTerm;
    });

    return {
        matches: matches.slice(0, limit),
        totalCount: matches.length,
    };
}

/**
 * Get SNOMED concept by ID
 */
export function getConcept(conceptId: string): SNOMEDConcept | null {
    return SNOMED_CONCEPTS[conceptId] || null;
}

/**
 * Map SNOMED CT to ICD-10 codes
 */
export function mapToICD10(snomedId: string): string[] {
    return SNOMED_TO_ICD10[snomedId] || [];
}

/**
 * Map ICD-10 to SNOMED CT concepts
 */
export function mapFromICD10(icd10Code: string): SNOMEDConcept[] {
    const baseCode = icd10Code.replace('.', '').substring(0, 3);
    const results: SNOMEDConcept[] = [];

    for (const [snomedId, icd10Codes] of Object.entries(SNOMED_TO_ICD10)) {
        const matches = icd10Codes.some(code =>
            code.startsWith(baseCode) || code === icd10Code
        );
        if (matches && SNOMED_CONCEPTS[snomedId]) {
            results.push(SNOMED_CONCEPTS[snomedId]);
        }
    }

    return results;
}

/**
 * Validate SNOMED CT code
 */
export function validateCode(conceptId: string): boolean {
    return conceptId in SNOMED_CONCEPTS;
}

/**
 * Get all concepts by semantic tag (disorders, findings, procedures)
 */
export function getConceptsBySemanticTag(semanticTag: SNOMEDConcept['semanticTag']): SNOMEDConcept[] {
    return Object.values(SNOMED_CONCEPTS).filter(c => c.semanticTag === semanticTag);
}

/**
 * Get concept hierarchy (IS-A relationships)
 * Note: In production, this would query Snowstorm API
 */
export function getAncestors(conceptId: string): SNOMEDConcept[] {
    // Simplified hierarchy for demonstration
    const hierarchies: Record<string, string[]> = {
        '195967001': ['19829001', '50043002', '64572001'],  // Asthma -> Respiratory disorder -> Disease
        '44054006': ['73211009', '64572001'],               // Type 2 DM -> Diabetes -> Disease
        '22298006': ['56265001', '64572001'],               // MI -> Heart disease -> Disease
    };

    const ancestorIds = hierarchies[conceptId] || [];
    return ancestorIds
        .map(id => SNOMED_CONCEPTS[id])
        .filter(Boolean);
}

/**
 * Generate FHIR-compatible CodeableConcept
 */
export function toFHIRCodeableConcept(conceptId: string): object | null {
    const concept = SNOMED_CONCEPTS[conceptId];
    if (!concept) return null;

    return {
        coding: [{
            system: 'http://snomed.info/sct',
            code: concept.conceptId,
            display: concept.term,
        }],
        text: concept.term,
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const snomedService = {
    search: searchConcepts,
    getConcept,
    mapToICD10,
    mapFromICD10,
    validate: validateCode,
    getBySemanticTag: getConceptsBySemanticTag,
    getAncestors,
    toFHIRCodeableConcept,
    SNOMED_CONCEPTS,
};
