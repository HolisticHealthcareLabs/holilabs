/**
 * Medical Terminology Validator
 *
 * Validates medical terms against known terminology databases.
 * Helps ensure AI outputs use standard medical vocabulary.
 */

import logger from '@/lib/logger';

/**
 * Common medical abbreviations and their meanings
 */
const MEDICAL_ABBREVIATIONS: Record<string, string> = {
  // Timing
  'QD': 'once daily',
  'BID': 'twice daily',
  'TID': 'three times daily',
  'QID': 'four times daily',
  'PRN': 'as needed',
  'STAT': 'immediately',
  'QHS': 'at bedtime',
  'AC': 'before meals',
  'PC': 'after meals',
  'Q4H': 'every 4 hours',
  'Q6H': 'every 6 hours',
  'Q8H': 'every 8 hours',
  'Q12H': 'every 12 hours',

  // Routes
  'PO': 'by mouth',
  'IV': 'intravenous',
  'IM': 'intramuscular',
  'SC': 'subcutaneous',
  'SQ': 'subcutaneous',
  'SL': 'sublingual',
  'PR': 'per rectum',
  'TOP': 'topical',
  'INH': 'inhaled',
  'GTT': 'drops',

  // Common medical terms
  'Hx': 'history',
  'Dx': 'diagnosis',
  'Rx': 'prescription',
  'Tx': 'treatment',
  'Sx': 'symptoms',
  'Px': 'prognosis',
  'CC': 'chief complaint',
  'HPI': 'history of present illness',
  'PMH': 'past medical history',
  'FH': 'family history',
  'SH': 'social history',
  'ROS': 'review of systems',
  'PE': 'physical exam',
  'A&P': 'assessment and plan',

  // Vitals
  'BP': 'blood pressure',
  'HR': 'heart rate',
  'RR': 'respiratory rate',
  'T': 'temperature',
  'SpO2': 'oxygen saturation',
  'BMI': 'body mass index',
  'Wt': 'weight',
  'Ht': 'height',

  // Labs
  'CBC': 'complete blood count',
  'BMP': 'basic metabolic panel',
  'CMP': 'comprehensive metabolic panel',
  'LFTs': 'liver function tests',
  'TSH': 'thyroid stimulating hormone',
  'HbA1c': 'hemoglobin A1c',
  'PT': 'prothrombin time',
  'INR': 'international normalized ratio',
  'PTT': 'partial thromboplastin time',
  'BUN': 'blood urea nitrogen',
  'Cr': 'creatinine',
  'GFR': 'glomerular filtration rate',
  'WBC': 'white blood cell count',
  'RBC': 'red blood cell count',
  'Hgb': 'hemoglobin',
  'Hct': 'hematocrit',
  'PLT': 'platelet count',
};

/**
 * Common dangerous abbreviations that should be avoided
 * (per ISMP and Joint Commission recommendations)
 */
const DANGEROUS_ABBREVIATIONS: Record<string, string> = {
  'U': 'Use "units" instead - can be mistaken for 0, 4, or cc',
  'IU': 'Use "international units" instead - can be mistaken for IV or 10',
  'QD': 'Use "daily" instead - can be mistaken for QID',
  'QOD': 'Use "every other day" instead - can be mistaken for QD or QID',
  'SC': 'Use "subcut" or "subcutaneous" instead - can be mistaken for SL',
  'HS': 'Use "at bedtime" or "half-strength" explicitly',
  'cc': 'Use "mL" instead - can be mistaken for U',
  'MS': 'Use "morphine sulfate" or "magnesium sulfate" explicitly',
  'MSO4': 'Use "morphine sulfate" instead',
  'MgSO4': 'Use "magnesium sulfate" instead',
  'D/C': 'Use "discharge" or "discontinue" explicitly',
  'μg': 'Use "mcg" instead - can be mistaken for mg',
};

export interface TermValidationResult {
  term: string;
  isValid: boolean;
  standardForm?: string;
  warning?: string;
  suggestions?: string[];
}

/**
 * Validate a medical abbreviation
 */
export function validateAbbreviation(abbreviation: string): TermValidationResult {
  const upper = abbreviation.toUpperCase();

  // Check if it's a dangerous abbreviation
  if (DANGEROUS_ABBREVIATIONS[upper]) {
    return {
      term: abbreviation,
      isValid: false,
      warning: DANGEROUS_ABBREVIATIONS[upper],
      suggestions: [MEDICAL_ABBREVIATIONS[upper] || `Write out "${abbreviation}" in full`],
    };
  }

  // Check if it's a known abbreviation
  if (MEDICAL_ABBREVIATIONS[upper]) {
    return {
      term: abbreviation,
      isValid: true,
      standardForm: MEDICAL_ABBREVIATIONS[upper],
    };
  }

  return {
    term: abbreviation,
    isValid: false,
    warning: 'Unknown abbreviation',
    suggestions: ['Consider writing out the term in full'],
  };
}

/**
 * Expand medical abbreviations in text
 */
export function expandAbbreviations(text: string): string {
  let expanded = text;

  for (const [abbrev, meaning] of Object.entries(MEDICAL_ABBREVIATIONS)) {
    // Match abbreviation with word boundaries
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    expanded = expanded.replace(regex, `${abbrev} (${meaning})`);
  }

  return expanded;
}

/**
 * Check text for dangerous abbreviations
 */
export function checkDangerousAbbreviations(
  text: string
): { found: boolean; abbreviations: TermValidationResult[] } {
  const results: TermValidationResult[] = [];
  const words = text.split(/\s+/);

  for (const word of words) {
    const cleaned = word.replace(/[.,;:!?()]/g, '').toUpperCase();
    if (DANGEROUS_ABBREVIATIONS[cleaned]) {
      results.push({
        term: word,
        isValid: false,
        warning: DANGEROUS_ABBREVIATIONS[cleaned],
        suggestions: [MEDICAL_ABBREVIATIONS[cleaned] || `Write out "${word}" in full`],
      });
    }
  }

  if (results.length > 0) {
    logger.warn({
      event: 'dangerous_abbreviations_found',
      count: results.length,
      abbreviations: results.map((r) => r.term),
    });
  }

  return {
    found: results.length > 0,
    abbreviations: results,
  };
}

/**
 * Validate a medical term exists in standard terminology
 *
 * Note: This is a simplified implementation. In production, you would
 * integrate with UMLS, SNOMED-CT, or another terminology service.
 */
export async function validateMedicalTerm(term: string): Promise<TermValidationResult> {
  // For now, we do basic validation
  // In production, call UMLS API or use a local terminology database

  const normalizedTerm = term.toLowerCase().trim();

  // Check common anatomical terms (simplified)
  const anatomicalTerms = [
    'heart', 'lung', 'liver', 'kidney', 'brain', 'stomach', 'intestine',
    'colon', 'pancreas', 'spleen', 'gallbladder', 'bladder', 'thyroid',
    'adrenal', 'pituitary', 'hypothalamus', 'cerebrum', 'cerebellum',
  ];

  if (anatomicalTerms.includes(normalizedTerm)) {
    return {
      term,
      isValid: true,
      standardForm: normalizedTerm,
    };
  }

  // Return unknown - in production, this would call an external service
  return {
    term,
    isValid: true, // Default to valid to avoid blocking
    warning: 'Term validation not available - consider verifying manually',
  };
}

/**
 * Validate a list of medical terms
 */
export async function validateMedicalTerms(
  terms: string[]
): Promise<TermValidationResult[]> {
  return Promise.all(terms.map(validateMedicalTerm));
}
