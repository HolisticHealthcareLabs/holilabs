/**
 * AI Output Validator
 *
 * Validates AI response outputs for:
 * - Response format compliance
 * - PHI detection and filtering
 * - Clinical safety checks
 * - Content policy compliance
 */

import { logger } from '@/lib/logger';
import type { ChatResponse } from '../chat';

// ============================================================================
// Types
// ============================================================================

export interface OutputValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  containsPHI: boolean;
  phiTypes: string[];
  sanitizedOutput?: string;
}

export interface OutputValidationConfig {
  checkPHI: boolean;
  checkClinicalSafety: boolean;
  checkFormatCompliance: boolean;
  maxResponseLength: number;
  requiredFields?: string[];
  expectedFormat?: 'text' | 'json' | 'structured';
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: OutputValidationConfig = {
  checkPHI: true,
  checkClinicalSafety: true,
  checkFormatCompliance: true,
  maxResponseLength: 50000,
};

// PHI detection patterns
const PHI_PATTERNS: { type: string; pattern: RegExp }[] = [
  { type: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/ },
  { type: 'Email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ },
  { type: 'Phone', pattern: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { type: 'MRN', pattern: /\b(MRN|mrn|Medical Record Number)[:\s]*[A-Z0-9]{6,12}\b/i },
  { type: 'DateOfBirth', pattern: /\b(DOB|Date of Birth|born)[:\s]*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/i },
  { type: 'Address', pattern: /\b\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way)\b/i },
  { type: 'CreditCard', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/ },
  { type: 'IPAddress', pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
];

// Clinical safety patterns (outputs that should trigger review)
const CLINICAL_SAFETY_PATTERNS: { type: string; pattern: RegExp; severity: 'warning' | 'error' }[] = [
  { type: 'Definitive diagnosis without hedging', pattern: /\b(you\s+have|the\s+diagnosis\s+is)\s+(?!possibly|likely|may\s+be)/i, severity: 'warning' },
  { type: 'Dangerous medication advice', pattern: /\b(stop\s+taking|discontinue)\s+(all\s+)?your\s+(medications?|meds)/i, severity: 'error' },
  { type: 'Suicide/self-harm content', pattern: /\b(suicide|self[-\s]?harm|kill\s+yourself|end\s+your\s+life)\b/i, severity: 'error' },
  { type: 'Specific dosage recommendation', pattern: /\b(take|administer)\s+\d+\s*(mg|ml|mcg|g)\b/i, severity: 'warning' },
  { type: 'Contraindicated advice', pattern: /\b(safe\s+to\s+ignore|don't\s+worry\s+about)\s+(these\s+)?symptoms?\b/i, severity: 'error' },
];

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validate AI response output
 */
export function validateOutput(
  response: ChatResponse,
  config: Partial<OutputValidationConfig> = {}
): OutputValidationResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];
  const phiTypes: string[] = [];

  const content = response.message || '';

  // Check response success
  if (!response.success) {
    errors.push(`Response failed: ${response.error || 'Unknown error'}`);
    return { valid: false, errors, warnings, containsPHI: false, phiTypes };
  }

  // Check response length
  if (content.length > fullConfig.maxResponseLength) {
    warnings.push(`Response length ${content.length} exceeds recommended max of ${fullConfig.maxResponseLength}`);
  }

  // Check for empty response
  if (!content.trim()) {
    errors.push('Empty response received');
  }

  // PHI detection
  if (fullConfig.checkPHI) {
    for (const { type, pattern } of PHI_PATTERNS) {
      if (pattern.test(content)) {
        phiTypes.push(type);
        warnings.push(`Potential PHI detected: ${type}`);
        logger.warn({
          event: 'phi_in_output',
          phiType: type,
        });
      }
    }
  }

  // Clinical safety checks
  if (fullConfig.checkClinicalSafety) {
    for (const { type, pattern, severity } of CLINICAL_SAFETY_PATTERNS) {
      if (pattern.test(content)) {
        if (severity === 'error') {
          errors.push(`Clinical safety issue: ${type}`);
        } else {
          warnings.push(`Clinical safety warning: ${type}`);
        }
        logger.info({
          event: 'clinical_safety_flag',
          type,
          severity,
        });
      }
    }
  }

  // Format compliance
  if (fullConfig.checkFormatCompliance && fullConfig.expectedFormat === 'json') {
    try {
      JSON.parse(content);
    } catch {
      errors.push('Expected JSON format but received non-JSON response');
    }
  }

  // Required fields check (for structured outputs)
  if (fullConfig.requiredFields && fullConfig.expectedFormat === 'json') {
    try {
      const parsed = JSON.parse(content);
      for (const field of fullConfig.requiredFields) {
        if (!(field in parsed)) {
          errors.push(`Required field missing: ${field}`);
        }
      }
    } catch {
      // Already handled above
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    containsPHI: phiTypes.length > 0,
    phiTypes,
  };
}

/**
 * Validate raw text output (not wrapped in ChatResponse)
 */
export function validateTextOutput(
  text: string,
  config: Partial<OutputValidationConfig> = {}
): OutputValidationResult {
  return validateOutput(
    { success: true, message: text },
    config
  );
}

// ============================================================================
// PHI Sanitization
// ============================================================================

/**
 * Redact PHI from output
 * Note: This is a last-resort fallback - prefer not exposing PHI in the first place
 */
export function redactPHI(text: string): string {
  let redacted = text;

  for (const { type, pattern } of PHI_PATTERNS) {
    redacted = redacted.replace(new RegExp(pattern, 'g'), `[REDACTED ${type}]`);
  }

  return redacted;
}

/**
 * Check if output contains PHI
 */
export function containsPHI(text: string): boolean {
  return PHI_PATTERNS.some(({ pattern }) => pattern.test(text));
}

/**
 * Get list of PHI types found in text
 */
export function detectPHITypes(text: string): string[] {
  return PHI_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ type }) => type);
}

// ============================================================================
// Structured Output Validation
// ============================================================================

/**
 * Validate JSON structured output against expected schema
 */
export function validateStructuredOutput<T>(
  response: ChatResponse,
  validator: (parsed: unknown) => parsed is T
): { valid: boolean; data?: T; error?: string } {
  if (!response.success || !response.message) {
    return { valid: false, error: response.error || 'No response' };
  }

  try {
    // Extract JSON from response
    const jsonMatch = response.message.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { valid: false, error: 'No JSON found in response' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (validator(parsed)) {
      return { valid: true, data: parsed };
    } else {
      return { valid: false, error: 'Response does not match expected schema' };
    }
  } catch (error) {
    return { valid: false, error: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

// ============================================================================
// Clinical Output Validation
// ============================================================================

/**
 * Validate clinical AI output with enhanced safety checks
 */
export function validateClinicalOutput(
  response: ChatResponse,
  options: {
    task: 'diagnosis' | 'prescriptions' | 'clinical-notes' | 'general';
    requireHedging?: boolean;
    allowMedicationAdvice?: boolean;
  }
): OutputValidationResult {
  const result = validateOutput(response, {
    checkClinicalSafety: true,
    checkPHI: true,
  });

  const content = response.message || '';

  // Task-specific validation
  if (options.task === 'diagnosis' && options.requireHedging) {
    const hedgingPhrases = /\b(may|might|could|possibly|likely|suggests?|consider|rule\s+out|differential)\b/i;
    if (!hedgingPhrases.test(content)) {
      result.warnings.push('Diagnosis output lacks appropriate hedging language');
    }
  }

  if (options.task === 'prescriptions' && !options.allowMedicationAdvice) {
    const medicationAdvice = /\b(prescribe|take|administer|recommend)\s+\d+\s*(mg|ml|mcg|g)\b/i;
    if (medicationAdvice.test(content)) {
      result.errors.push('Medication dosage advice detected - requires physician review');
    }
  }

  // Check for appropriate disclaimers in diagnosis tasks
  if (options.task === 'diagnosis') {
    const disclaimerPresent = /\b(consult|see\s+a\s+(doctor|physician|healthcare)|professional\s+(medical\s+)?advice)\b/i;
    if (!disclaimerPresent.test(content)) {
      result.warnings.push('Diagnosis output should include disclaimer to seek professional advice');
    }
  }

  return result;
}

// ============================================================================
// Exports
// ============================================================================

export const OutputValidator = {
  validateOutput,
  validateTextOutput,
  validateStructuredOutput,
  validateClinicalOutput,
  redactPHI,
  containsPHI,
  detectPHITypes,
};

export default OutputValidator;
