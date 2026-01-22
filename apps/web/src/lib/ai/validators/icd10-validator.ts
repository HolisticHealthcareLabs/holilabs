/**
 * ICD-10 Code Validator
 *
 * Validates ICD-10-CM diagnosis codes for format and existence.
 * Uses local validation rules plus optional API lookup.
 */

import logger from '@/lib/logger';

/**
 * ICD-10 code validation result
 */
export interface ICD10ValidationResult {
  code: string;
  isValid: boolean;
  isFormatValid: boolean;
  exists?: boolean;
  description?: string;
  category?: string;
  chapter?: string;
  warning?: string;
  suggestions?: string[];
}

/**
 * ICD-10 category prefixes and their meanings
 */
const ICD10_CHAPTERS: Record<string, string> = {
  A: 'Certain infectious and parasitic diseases',
  B: 'Certain infectious and parasitic diseases',
  C: 'Neoplasms',
  D: 'Neoplasms / Blood disorders',
  E: 'Endocrine, nutritional and metabolic diseases',
  F: 'Mental, behavioral and neurodevelopmental disorders',
  G: 'Diseases of the nervous system',
  H: 'Diseases of the eye/ear',
  I: 'Diseases of the circulatory system',
  J: 'Diseases of the respiratory system',
  K: 'Diseases of the digestive system',
  L: 'Diseases of the skin and subcutaneous tissue',
  M: 'Diseases of the musculoskeletal system',
  N: 'Diseases of the genitourinary system',
  O: 'Pregnancy, childbirth and the puerperium',
  P: 'Certain conditions originating in the perinatal period',
  Q: 'Congenital malformations and chromosomal abnormalities',
  R: 'Symptoms, signs and abnormal findings',
  S: 'Injury, poisoning - specific body regions',
  T: 'Injury, poisoning - multiple body regions',
  V: 'External causes of morbidity - transport accidents',
  W: 'External causes of morbidity - other accidents',
  X: 'External causes of morbidity - intentional/exposure',
  Y: 'External causes of morbidity - supplementary',
  Z: 'Factors influencing health status and contact',
};

/**
 * Common ICD-10 codes for validation examples
 */
const COMMON_ICD10_CODES: Record<string, string> = {
  'E11.9': 'Type 2 diabetes mellitus without complications',
  'I10': 'Essential (primary) hypertension',
  'J06.9': 'Acute upper respiratory infection, unspecified',
  'M54.5': 'Low back pain',
  'F32.9': 'Major depressive disorder, single episode, unspecified',
  'J45.909': 'Unspecified asthma, uncomplicated',
  'K21.0': 'Gastro-esophageal reflux disease with esophagitis',
  'E78.5': 'Hyperlipidemia, unspecified',
  'G43.909': 'Migraine, unspecified, not intractable, without status migrainosus',
  'J02.9': 'Acute pharyngitis, unspecified',
  'N39.0': 'Urinary tract infection, site not specified',
  'R05.9': 'Cough, unspecified',
  'Z23': 'Encounter for immunization',
  'Z00.00': 'Encounter for general adult medical examination without abnormal findings',
};

/**
 * ICD-10 code format regex
 * Format: Letter + 2 digits + optional decimal + up to 4 more characters
 */
const ICD10_FORMAT_REGEX = /^[A-Z]\d{2}(\.\d{1,4})?$/;

/**
 * Validate ICD-10 code format
 */
export function validateICD10Format(code: string): boolean {
  if (!code) return false;
  const normalized = code.toUpperCase().trim();
  return ICD10_FORMAT_REGEX.test(normalized);
}

/**
 * Get ICD-10 chapter from code
 */
export function getICD10Chapter(code: string): string | null {
  if (!code) return null;
  const firstChar = code.toUpperCase().charAt(0);
  return ICD10_CHAPTERS[firstChar] || null;
}

/**
 * Validate an ICD-10 code
 */
export async function validateICD10Code(
  code: string,
  options: { checkExists?: boolean } = {}
): Promise<ICD10ValidationResult> {
  const normalized = code.toUpperCase().trim();

  // Check format
  const isFormatValid = validateICD10Format(normalized);

  if (!isFormatValid) {
    logger.debug({
      event: 'icd10_format_invalid',
      code: normalized,
    });

    return {
      code: normalized,
      isValid: false,
      isFormatValid: false,
      warning: 'Invalid ICD-10 code format. Expected format: A00.0000',
      suggestions: suggestSimilarCodes(normalized),
    };
  }

  // Get chapter
  const chapter = getICD10Chapter(normalized);

  // Check in common codes (local validation)
  if (COMMON_ICD10_CODES[normalized]) {
    return {
      code: normalized,
      isValid: true,
      isFormatValid: true,
      exists: true,
      description: COMMON_ICD10_CODES[normalized],
      chapter: chapter || undefined,
    };
  }

  // If we need to check existence, call external API
  if (options.checkExists) {
    try {
      const existsResult = await checkICD10Exists(normalized);
      if (existsResult) {
        return {
          code: normalized,
          isValid: true,
          isFormatValid: true,
          exists: true,
          description: existsResult.description,
          category: existsResult.category,
          chapter: chapter || undefined,
        };
      }
    } catch {
      // API check failed, fall through to format-only validation
    }
  }

  // Return format-valid result
  return {
    code: normalized,
    isValid: true, // Format is valid, so we accept it
    isFormatValid: true,
    exists: undefined, // Unknown - didn't verify
    chapter: chapter || undefined,
    warning: 'Code format is valid but existence not verified. Please confirm the code.',
  };
}

/**
 * Check if ICD-10 code exists via external API
 *
 * Note: This is a placeholder. In production, use NLM's ICD API or similar.
 * @see https://clinicaltables.nlm.nih.gov/
 */
async function checkICD10Exists(
  code: string
): Promise<{ description: string; category: string } | null> {
  try {
    // Use NLM Clinical Tables API
    const response = await fetch(
      `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code&terms=${encodeURIComponent(code)}&maxList=1`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Response format: [total, codes, null, [descriptions]]
    if (data[0] > 0 && data[3]?.[0]) {
      return {
        description: data[3][0],
        category: data[1]?.[0] || code,
      };
    }

    return null;
  } catch (error) {
    logger.debug({
      event: 'icd10_api_check_failed',
      code,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Suggest similar ICD-10 codes based on input
 */
function suggestSimilarCodes(input: string): string[] {
  const suggestions: string[] = [];
  const normalized = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // If it looks like a code without decimal
  if (/^[A-Z]\d{3,}$/.test(normalized)) {
    const base = normalized.slice(0, 3);
    const rest = normalized.slice(3);
    suggestions.push(`${base}.${rest}`);
  }

  // Find common codes that start with the same characters
  for (const [code, description] of Object.entries(COMMON_ICD10_CODES)) {
    if (code.startsWith(normalized.slice(0, 2))) {
      suggestions.push(`${code}: ${description}`);
      if (suggestions.length >= 3) break;
    }
  }

  return suggestions;
}

/**
 * Batch validate multiple ICD-10 codes
 */
export async function validateICD10Codes(
  codes: string[],
  options: { checkExists?: boolean } = {}
): Promise<ICD10ValidationResult[]> {
  return Promise.all(codes.map((code) => validateICD10Code(code, options)));
}

/**
 * Format ICD-10 code to standard format (uppercase, with decimal)
 */
export function formatICD10Code(code: string): string {
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleaned.length <= 3) {
    return cleaned;
  }

  return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
}

/**
 * Extract potential ICD-10 codes from text
 */
export function extractICD10Codes(text: string): string[] {
  // Match patterns that look like ICD-10 codes
  const regex = /\b[A-Z]\d{2}(?:\.\d{1,4})?\b/gi;
  const matches = text.match(regex) || [];

  // Normalize and deduplicate
  const normalized = [...new Set(matches.map((m) => m.toUpperCase()))];

  return normalized.filter(validateICD10Format);
}
