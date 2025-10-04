import { Policy, RedactionResult } from './types';

/**
 * HIPAA Safe Harbor 18 identifiers regex patterns
 * Multilingual support for ES/PT/EN
 */
const IDENTIFIER_PATTERNS: Record<string, RegExp[]> = {
  NAME: [
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // English names
    /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g, // Spanish names
    /\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+ [A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+\b/g, // Portuguese names
  ],
  EMAIL: [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
  PHONE: [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // US format
    /\b\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, // Brazil format
    /\b\+?52\s?\d{2,3}\s?\d{3,4}\s?\d{4}\b/g, // Mexico format
    /\b\+?54\s?\d{2,4}\s?\d{6,8}\b/g, // Argentina format
  ],
  SSN: [
    /\b\d{3}-\d{2}-\d{4}\b/g, // US SSN
    /\b\d{11}\b/g, // CPF Brazil (11 digits)
    /\b[A-Z]{4}\d{6}[A-Z\d]{7}\b/g, // CURP Mexico
    /\b\d{7,8}\b/g, // DNI Argentina
  ],
  MRN: [/\bMRN[:\s]?\d{6,10}\b/gi, /\bPatient ID[:\s]?\d{6,10}\b/gi],
  URL_IP: [
    /\bhttps?:\/\/[^\s]+\b/g,
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  ],
  ADDRESS: [
    /\b\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Calle|Avenida|Rua)\b/gi,
  ],
  DATE: [
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
  ],
  ACCOUNT: [/\b(?:Account|Acct|Cuenta|Conta)[\s#:]*\d{6,}\b/gi],
  VEHICLE: [/\b[A-Z]{3}[-\s]?\d{3,4}\b/g], // License plates
  BIOMETRICS: [/\bfingerprint\b/gi, /\bhuella\b/gi, /\bdigital\b/gi],
};

/**
 * Redact structured data (FHIR JSON, CSV, etc.)
 */
export function redactStructured(
  data: any,
  policy: Policy
): RedactionResult {
  const counts: Record<string, number> = {};

  function redactValue(value: any, key?: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      let redacted = value;

      for (const identifier of policy.redaction.identifiers) {
        const patterns = IDENTIFIER_PATTERNS[identifier];
        if (patterns) {
          for (const pattern of patterns) {
            const matches = redacted.match(pattern);
            if (matches) {
              counts[identifier] = (counts[identifier] || 0) + matches.length;
              redacted = redacted.replace(pattern, `[${identifier}_REDACTED]`);
            }
          }
        }
      }

      return redacted;
    }

    if (Array.isArray(value)) {
      return value.map((item) => redactValue(item));
    }

    if (typeof value === 'object') {
      const redactedObj: any = {};
      for (const k in value) {
        // Suppress entire fields that are known identifiers
        if (shouldSuppressField(k, policy)) {
          counts[`FIELD_${k.toUpperCase()}`] = (counts[`FIELD_${k.toUpperCase()}`] || 0) + 1;
          redactedObj[k] = '[SUPPRESSED]';
        } else {
          redactedObj[k] = redactValue(value[k], k);
        }
      }
      return redactedObj;
    }

    return value;
  }

  const redacted = redactValue(data);

  return {
    redacted,
    counts,
    policyVersion: policy.version,
  };
}

/**
 * Redact free-text notes (clinical narratives)
 */
export function redactText(
  text: string,
  locale: string,
  policy: Policy
): string {
  let redacted = text;

  for (const identifier of policy.redaction.identifiers) {
    const patterns = IDENTIFIER_PATTERNS[identifier];
    if (patterns) {
      for (const pattern of patterns) {
        redacted = redacted.replace(pattern, `[${identifier}_REDACTED]`);
      }
    }
  }

  // Simple NLP stub: In production, use NER models for locale
  // For MVP, regex fallback is acceptable per Safe Harbor
  if (policy.text_nlp.fallback === 'REDACT') {
    // Conservative: redact any capitalized sequences that look like names
    if (policy.text_nlp.min_confidence > 0.9) {
      redacted = redacted.replace(
        /\b[A-ZÁÉÍÓÚÑÀÂÃÊÔÕÇ][a-záéíóúñàâãéêíóôõúç]{2,}\s+[A-ZÁÉÍÓÚÑÀÂÃÊÔÕÇ][a-záéíóúñàâãéêíóôõúç]{2,}\b/g,
        '[NAME_REDACTED]'
      );
    }
  }

  return redacted;
}

/**
 * Check if a field should be entirely suppressed
 */
function shouldSuppressField(fieldName: string, policy: Policy): boolean {
  const suppressFields = [
    'ssn', 'cpf', 'curp', 'dni',
    'email', 'phone', 'fax',
    'address', 'street', 'city', 'zip', 'postal',
    'mrn', 'patientId', 'account',
    'name', 'firstName', 'lastName', 'fullName',
    'dob', 'birthDate',
    'license', 'vehicle',
    'biometric',
  ];

  const normalizedField = fieldName.toLowerCase().replace(/[_-]/g, '');
  return suppressFields.some((sf) => normalizedField.includes(sf));
}
