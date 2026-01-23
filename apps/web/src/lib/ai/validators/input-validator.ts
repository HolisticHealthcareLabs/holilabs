/**
 * AI Input Validator
 *
 * Validates AI request inputs for:
 * - Prompt safety (injection prevention)
 * - Length limits (cost control)
 * - Content policy compliance
 * - Rate limiting checks
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface InputValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedInput?: string;
}

export interface InputValidationConfig {
  maxPromptLength: number;
  maxMessages: number;
  maxTokenEstimate: number;
  allowSystemPromptOverride: boolean;
  blockPatterns: RegExp[];
  warnPatterns: RegExp[];
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: InputValidationConfig = {
  maxPromptLength: 100000, // ~25k tokens
  maxMessages: 50,
  maxTokenEstimate: 30000,
  allowSystemPromptOverride: false,
  blockPatterns: [
    // Prompt injection attempts
    /ignore\s+(all\s+)?previous\s+(instructions?|prompts?)/i,
    /disregard\s+(all\s+)?previous\s+(instructions?|prompts?)/i,
    /forget\s+(all\s+)?previous\s+(instructions?|prompts?)/i,
    /you\s+are\s+now\s+(a|an)\s+\w+\s+(that|who|which)/i,
    /\bDAN\s+mode\b/i,
    /\bjailbreak\b/i,
    /\bbypass\s+safety\b/i,
    // Code execution attempts
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /\bsystem\s*\(/i,
    /\b__import__\s*\(/i,
  ],
  warnPatterns: [
    // Potentially suspicious but not blocked
    /pretend\s+(you('re|are)?|to\s+be)/i,
    /act\s+as\s+(if|though|a)/i,
    /role\s*play/i,
    /\bsecret\s+instructions?\b/i,
    /\bhidden\s+prompt\b/i,
  ],
};

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validate AI chat input
 */
export function validateChatInput(
  messages: Array<{ role: string; content: string }>,
  config: Partial<InputValidationConfig> = {}
): InputValidationResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check message count
  if (messages.length > fullConfig.maxMessages) {
    errors.push(`Too many messages: ${messages.length} exceeds limit of ${fullConfig.maxMessages}`);
  }

  // Check total content length
  const totalLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  if (totalLength > fullConfig.maxPromptLength) {
    errors.push(`Total prompt length ${totalLength} exceeds limit of ${fullConfig.maxPromptLength}`);
  }

  // Validate each message
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Check role
    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      errors.push(`Invalid role "${msg.role}" in message ${i}`);
    }

    // Block system role override (unless explicitly allowed)
    if (msg.role === 'system' && i > 0 && !fullConfig.allowSystemPromptOverride) {
      errors.push(`System message not allowed after initial message (message ${i})`);
    }

    // Check for blocked patterns
    for (const pattern of fullConfig.blockPatterns) {
      if (pattern.test(msg.content || '')) {
        errors.push(`Blocked pattern detected in message ${i}: ${pattern.source}`);
        logger.warn({
          event: 'input_validation_blocked',
          messageIndex: i,
          pattern: pattern.source,
        });
      }
    }

    // Check for warning patterns
    for (const pattern of fullConfig.warnPatterns) {
      if (pattern.test(msg.content || '')) {
        warnings.push(`Suspicious pattern in message ${i}: ${pattern.source}`);
        logger.info({
          event: 'input_validation_warning',
          messageIndex: i,
          pattern: pattern.source,
        });
      }
    }
  }

  // Estimate token count (rough: 1 token ≈ 4 chars)
  const estimatedTokens = Math.ceil(totalLength / 4);
  if (estimatedTokens > fullConfig.maxTokenEstimate) {
    warnings.push(`Estimated tokens (${estimatedTokens}) may exceed model limits`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single prompt string
 */
export function validatePrompt(
  prompt: string,
  config: Partial<InputValidationConfig> = {}
): InputValidationResult {
  return validateChatInput([{ role: 'user', content: prompt }], config);
}

/**
 * Sanitize input by removing potentially dangerous patterns
 * Note: Use this sparingly - blocking is usually safer than sanitizing
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/[\r\n]+/g, '\n');
  sanitized = sanitized.replace(/\t/g, '  ');

  // Remove control characters (except newlines)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

// ============================================================================
// Medical-Specific Validation
// ============================================================================

/**
 * Validate clinical AI input for additional safety
 */
export function validateClinicalInput(
  messages: Array<{ role: string; content: string }>,
  options: {
    patientId?: string;
    requirePatientContext?: boolean;
  } = {}
): InputValidationResult {
  // Start with basic validation
  const baseResult = validateChatInput(messages);
  const errors = [...baseResult.errors];
  const warnings = [...baseResult.warnings];

  // Clinical-specific checks
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const content = lastUserMessage?.content || '';

  // Warn about requests for specific diagnoses without context
  if (/\b(diagnose|diagnosis)\b/i.test(content) && options.requirePatientContext && !options.patientId) {
    warnings.push('Diagnosis request without patient context - results may be generic');
  }

  // Warn about emergency keywords
  const emergencyKeywords = /\b(emergency|urgent|critical|life.?threatening|code\s+(blue|red)|cardiac\s+arrest)\b/i;
  if (emergencyKeywords.test(content)) {
    warnings.push('Emergency-related query detected - ensure appropriate clinical escalation');
    logger.info({
      event: 'emergency_keyword_detected',
      patientId: options.patientId,
    });
  }

  // Check for potential PHI in user messages (shouldn't be needed with proper de-identification)
  const phiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b[A-Z]{1,2}\d{6,10}\b/i, // MRN-like patterns
  ];

  for (const pattern of phiPatterns) {
    if (pattern.test(content)) {
      warnings.push('Potential PHI pattern detected in input');
      logger.warn({
        event: 'potential_phi_in_input',
        patientId: options.patientId,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Exports
// ============================================================================

export const InputValidator = {
  validateChatInput,
  validatePrompt,
  validateClinicalInput,
  sanitizeInput,
};

export default InputValidator;
