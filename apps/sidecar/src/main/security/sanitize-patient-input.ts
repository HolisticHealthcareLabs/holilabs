/**
 * Prompt injection sanitization for patient-sourced text.
 *
 * Applied before any patient data enters LLM prompt templates
 * to prevent prompt injection via SOAP notes, billing codes,
 * or other free-text clinical fields.
 *
 * @module sidecar/security/sanitize-patient-input
 */

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

const INJECTION_PATTERNS: RegExp[] = [
  // English patterns
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /you\s+are\s+now/i,
  /new\s+instructions?:/i,
  /system\s*:\s*/i,
  /\bact\s+as\b/i,
  /\bpretend\s+(to\s+be|you\s+are)\b/i,
  /\brole\s*:\s*/i,
  /\bdo\s+not\s+follow\b/i,
  /\boverride\b/i,
  // Portuguese patterns
  /ignore\s+(todas?\s+)?instru[çc][õo]es\s+anteriores/i,
  /novas?\s+instru[çc][õo]es?:/i,
  /voc[eê]\s+agora\s+[eé]/i,
  /finja\s+(ser|que)/i,
  /a[çc][ãa]o\s*:\s*/i,
  /desconsidere/i,
  /sobrescreva/i,
  // Delimiter injection
  /```/g,
  /\{\{.*?\}\}/g,
  /<\|.*?\|>/g,
];

export interface SanitizationResult {
  sanitized: string;
  injectionDetected: boolean;
  detectedPatterns: string[];
}

export function sanitizePatientInput(input: string): SanitizationResult {
  if (!input) {
    return { sanitized: '', injectionDetected: false, detectedPatterns: [] };
  }

  const detectedPatterns: string[] = [];

  // Detect injection patterns on raw input before tag stripping
  // (some patterns like <|...|> would be consumed by stripTags)
  for (const pattern of INJECTION_PATTERNS) {
    if (new RegExp(pattern.source, pattern.flags).test(input)) {
      detectedPatterns.push(pattern.source);
    }
  }

  // Strip HTML/XML tags
  let sanitized = stripTags(input);

  // Replace detected injection patterns in the sanitized text
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(new RegExp(pattern.source, pattern.flags), '[FILTERED]');
  }

  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  return {
    sanitized,
    injectionDetected: detectedPatterns.length > 0,
    detectedPatterns,
  };
}
