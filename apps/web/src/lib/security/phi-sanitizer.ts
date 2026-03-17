/**
 * PHI Sanitizer — Two-stage redaction system.
 *
 * Stage 1: Regex-based patterns (CPF, CNS, RG, email, phone) via redactPHI()
 * Stage 2: Portuguese NER patterns (Brazilian names, addresses, CEP, city-state)
 *
 * Returns sanitization metadata including redaction counts per stage.
 */

import { redactPHI } from './redact-phi';

/**
 * Portuguese naming patterns — common Brazilian full names with connectors.
 * Examples: Maria da Silva, João de Oliveira, Ana dos Santos, Carlos e Pedro
 */
const PT_NAME_PATTERNS = [
  /([A-ZÁÉÍÓÚÃÕÀâêôçÇ][a-záéíóúãõàâêôç]+(?:\s+(?:da|de|do|dos|das|e|é)\s+[A-ZÁÉÍÓÚÃÕÀâêôçÇ][a-záéíóúãõàâêôç]+)+)/g,
];

/**
 * Address patterns — Brazilian street types, CEP, city-state combinations.
 * Examples: "Rua das Flores 123", "Av. Paulista 1000", "CEP 01311-100", "São Paulo - SP"
 */
const PT_LOCATION_PATTERNS = [
  // Street addresses: Rua/Avenida/Alameda + optional number
  /(?:Rua|Avenida|Av\.?|Alameda|Travessa|Largo|Praça|Trav\.)\s+(?:[A-Za-záéíóúãõàâêôçÇ\s]+?)(?:\s+\d+[A-Za-z]?)?(?=\s|$|,)/gi,
  // CEP: 00000-000 format
  /\d{5}-\d{3}/g,
  // City - State: "São Paulo - SP" or "Rio de Janeiro - RJ"
  /([A-ZÁÉÍÓÚÃÕÀâêôçÇ][a-záéíóúãõàâêôç]+(?:\s+(?:de|da)\s+[A-ZÁÉÍÓÚÃÕÀâêôçÇ][a-záéíóúãõàâêôç]*)?)\s*-\s*[A-Z]{2}/g,
];

export interface SanitizationResult {
  sanitized: string;
  redactedFieldCount: number;
  stages: {
    regex: { count: number; patterns: string[] };
    ner: { count: number; patterns: string[] };
  };
}

export interface SanitizationStats {
  [key: string]: { count: number; examples: string[] };
}

/**
 * Execute two-stage sanitization: Stage 1 regex, Stage 2 Portuguese NER.
 */
export function sanitizePHITwoStage(input: string): SanitizationResult {
  if (typeof input !== 'string') {
    return {
      sanitized: String(input),
      redactedFieldCount: 0,
      stages: {
        regex: { count: 0, patterns: [] },
        ner: { count: 0, patterns: [] },
      },
    };
  }

  if (input.length === 0) {
    return {
      sanitized: '',
      redactedFieldCount: 0,
      stages: {
        regex: { count: 0, patterns: [] },
        ner: { count: 0, patterns: [] },
      },
    };
  }

  // Stage 1: Apply redactPHI (regex-based)
  let sanitized = redactPHI(input);
  const regexPatterns: string[] = [];
  let regexCount = 0;

  // Count redactions made by Stage 1 (detect presence of redaction tokens)
  const redactionTokens = [
    '[CPF_REDACTED]',
    '[CNS_REDACTED]',
    '[RG_REDACTED]',
    '[EMAIL_REDACTED]',
    '[PHONE_REDACTED]',
  ];
  for (const token of redactionTokens) {
    if (sanitized.includes(token)) {
      regexCount++;
      regexPatterns.push(token.replace(/[[\]]/g, ''));
    }
  }

  // Stage 2: Apply Portuguese NER patterns
  let nerCount = 0;
  const nerPatterns: string[] = [];

  // Apply name patterns
  const nameMatches = sanitized.match(PT_NAME_PATTERNS[0]);
  if (nameMatches) {
    nerCount += nameMatches.length;
    nerPatterns.push('PORTUGUESE_NAME');
    sanitized = sanitized.replace(PT_NAME_PATTERNS[0], '[PORTUGUESE_NAME_REDACTED]');
  }

  // Apply location patterns
  for (const pattern of PT_LOCATION_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      nerCount += matches.length;
      const patternName = pattern === PT_LOCATION_PATTERNS[0]
        ? 'ADDRESS'
        : pattern === PT_LOCATION_PATTERNS[1]
        ? 'CEP'
        : 'CITY_STATE';
      if (!nerPatterns.includes(patternName)) {
        nerPatterns.push(patternName);
      }
      sanitized = sanitized.replace(pattern, `[${patternName}_REDACTED]`);
    }
  }

  return {
    sanitized,
    redactedFieldCount: regexCount + nerCount,
    stages: {
      regex: { count: regexCount, patterns: regexPatterns },
      ner: { count: nerCount, patterns: nerPatterns },
    },
  };
}

/**
 * Recursively sanitize all string values in an object tree.
 */
export function sanitizeObjectTwoStage(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizePHITwoStage(obj).sanitized;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectTwoStage(item));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeObjectTwoStage(value);
    }
    return result;
  }

  return obj;
}
