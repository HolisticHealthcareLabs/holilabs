/**
 * AI Input/Output Validator
 *
 * Core validation logic for AI inputs and outputs to ensure deterministic, reliable clinical features.
 * All AI inputs MUST be validated before sending to providers (prompt injection defense).
 * All AI outputs MUST be validated before reaching the UI.
 *
 * Features:
 * - Input validation for prompt injection patterns
 * - Zod schema validation for type safety
 * - Domain-specific validators (medical terms, drug interactions, ICD-10)
 * - Retry with error feedback
 * - Strict mode for production
 */

import { z, ZodSchema, ZodError } from 'zod';
import logger from '@/lib/logger';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: z.ZodIssue[];
  retryable?: boolean;
}

export interface ValidatorConfig {
  /** Maximum number of retries on validation failure */
  maxRetries?: number;
  /** Whether to throw on validation failure (default: true in production) */
  strict?: boolean;
  /** Custom error transformer */
  errorTransformer?: (error: ZodError) => string;
}

const DEFAULT_CONFIG: ValidatorConfig = {
  maxRetries: 2,
  strict: process.env.NODE_ENV === 'production',
};

/**
 * Validates AI output against a Zod schema
 *
 * @param data The AI output to validate
 * @param schema The Zod schema to validate against
 * @param config Optional validation configuration
 * @returns ValidationResult with parsed data or error details
 */
export function validateAIOutput<T>(
  data: unknown,
  schema: ZodSchema<T>,
  config: ValidatorConfig = {}
): ValidationResult<T> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const parsed = schema.parse(data);

    logger.debug({
      event: 'ai_output_validated',
      schema: schema.description || 'unknown',
      success: true,
    });

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = fullConfig.errorTransformer
        ? fullConfig.errorTransformer(error)
        : formatZodError(error);

      logger.warn({
        event: 'ai_output_validation_failed',
        schema: schema.description || 'unknown',
        issues: error.issues,
        message: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        details: error.issues,
        retryable: true,
      };
    }

    const unknownError = error instanceof Error ? error.message : String(error);

    logger.error({
      event: 'ai_output_validation_error',
      error: unknownError,
    });

    return {
      success: false,
      error: unknownError,
      retryable: false,
    };
  }
}

/**
 * Safely parses JSON from AI output
 *
 * @param text The raw text from AI
 * @returns Parsed JSON or null if parsing fails
 */
export function safeParseJSON(text: string): unknown | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try to extract JSON object or array directly
    const objectMatch = text.match(/\{[\s\S]*\}/);
    const arrayMatch = text.match(/\[[\s\S]*\]/);

    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }

    // Try parsing the entire text
    return JSON.parse(text);
  } catch {
    logger.warn({
      event: 'json_parse_failed',
      textLength: text.length,
      textPreview: text.substring(0, 100),
    });
    return null;
  }
}

/**
 * Format Zod error for human-readable feedback
 */
export function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return `Validation failed: ${issues.join('; ')}`;
}

/**
 * Create a validation feedback prompt for retry
 *
 * @param originalPrompt The original prompt sent to AI
 * @param error The validation error
 * @returns A new prompt with error feedback
 */
export function createRetryPrompt(originalPrompt: string, error: string): string {
  return `${originalPrompt}

IMPORTANT: Your previous response failed validation with this error:
${error}

Please correct your response to match the required format exactly.
Return ONLY valid JSON without any additional text or explanation.`;
}

/**
 * Validation error class for AI outputs
 */
export class AIValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: z.ZodIssue[],
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'AIValidationError';
  }
}

/**
 * Batch validate multiple AI outputs
 */
export function validateBatch<T>(
  items: unknown[],
  schema: ZodSchema<T>
): { valid: T[]; invalid: { item: unknown; error: string }[] } {
  const valid: T[] = [];
  const invalid: { item: unknown; error: string }[] = [];

  for (const item of items) {
    const result = validateAIOutput(item, schema);
    if (result.success && result.data) {
      valid.push(result.data);
    } else {
      invalid.push({ item, error: result.error || 'Unknown validation error' });
    }
  }

  logger.info({
    event: 'batch_validation_complete',
    totalItems: items.length,
    validCount: valid.length,
    invalidCount: invalid.length,
  });

  return { valid, invalid };
}

// ============================================================================
// INPUT VALIDATION - Prompt Injection Defense
// ============================================================================

/**
 * Maximum allowed prompt length (characters)
 * Prevents resource exhaustion and reduces attack surface
 */
export const MAX_PROMPT_LENGTH = 50000;

/**
 * Common prompt injection patterns to detect
 * These patterns attempt to override system instructions
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,
  /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,

  // System prompt extraction attempts
  /what\s+(are|is)\s+(your|the)\s+system\s+(prompt|instructions?)/i,
  /reveal\s+(your|the)\s+system\s+(prompt|instructions?)/i,
  /show\s+(your|the)\s+(hidden|initial)\s+(prompt|instructions?)/i,

  // Role override attempts
  /you\s+are\s+(now|no longer)\s+a/i,
  /pretend\s+(you\s+are|to\s+be)\s+a/i,
  /act\s+as\s+(if\s+you\s+(are|were)|an?)\s+/i,

  // Jailbreak patterns
  /DAN\s*mode/i,
  /developer\s+mode\s+(enabled|activated|on)/i,
  /\[?unlock(ed)?\]?\s*(mode|access)/i,
];

/**
 * Suspicious token sequences that may indicate prompt injection
 * Lower threshold - logged but not blocked
 */
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\<\|.*\|\>/,  // Token boundary markers
  /\[INST\]/i,   // Instruction markers
  /\<\<SYS\>\>/i, // System block markers
  /###\s*(system|instruction|assistant|user)/i, // Role markers
];

export interface InputValidationResult {
  valid: boolean;
  reason?: string;
  severity?: 'blocked' | 'warning';
}

/**
 * Validates user input for potential prompt injection attacks
 *
 * SECURITY: This is a defense-in-depth measure. Do not rely solely on this.
 * - Validates prompt length
 * - Checks for known injection patterns
 * - Logs suspicious patterns without blocking
 *
 * @param input The user's prompt to validate
 * @returns Validation result with reason if invalid
 */
export function validatePromptInput(input: string): InputValidationResult {
  // 1. Check prompt length
  if (input.length > MAX_PROMPT_LENGTH) {
    logger.warn({
      event: 'prompt_validation_blocked',
      reason: 'length_exceeded',
      length: input.length,
      maxLength: MAX_PROMPT_LENGTH,
    });
    return {
      valid: false,
      reason: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
      severity: 'blocked',
    };
  }

  // 2. Check for known injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      logger.warn({
        event: 'prompt_validation_blocked',
        reason: 'injection_pattern_detected',
        // HIPAA: Do not log the actual content or matched pattern
        patternIndex: INJECTION_PATTERNS.indexOf(pattern),
      });
      return {
        valid: false,
        reason: 'Your message contains patterns that cannot be processed. Please rephrase your question.',
        severity: 'blocked',
      };
    }
  }

  // 3. Check for suspicious patterns (warn but don't block)
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(input)) {
      logger.info({
        event: 'prompt_validation_warning',
        reason: 'suspicious_pattern_detected',
        // HIPAA: Do not log the actual content
        patternIndex: SUSPICIOUS_PATTERNS.indexOf(pattern),
      });
      // Don't block, just warn - may be legitimate clinical content
      return {
        valid: true,
        reason: 'Input contains unusual formatting',
        severity: 'warning',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates an array of chat messages for prompt injection
 *
 * @param messages Array of chat messages to validate
 * @returns Validation result
 */
export function validateChatMessages(
  messages: Array<{ role: string; content: string }>
): InputValidationResult {
  // Validate each message
  for (const message of messages) {
    // Only validate user messages - system/assistant messages are trusted
    if (message.role === 'user') {
      const result = validatePromptInput(message.content);
      if (!result.valid) {
        return result;
      }
    }
  }

  // Check total conversation length
  const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  if (totalLength > MAX_PROMPT_LENGTH * 2) {
    logger.warn({
      event: 'prompt_validation_blocked',
      reason: 'conversation_too_long',
      totalLength,
      messageCount: messages.length,
    });
    return {
      valid: false,
      reason: 'Conversation exceeds maximum length. Please start a new conversation.',
      severity: 'blocked',
    };
  }

  return { valid: true };
}

/**
 * Sanitizes prompt by removing potentially dangerous patterns
 * Use with caution - may alter user intent
 *
 * @param input The raw user input
 * @returns Sanitized input
 */
export function sanitizePrompt(input: string): string {
  let sanitized = input;

  // Remove token boundary markers
  sanitized = sanitized.replace(/\<\|.*?\|\>/g, '');

  // Remove instruction markers
  sanitized = sanitized.replace(/\[INST\]|\[\/INST\]/gi, '');

  // Remove system block markers
  sanitized = sanitized.replace(/\<\<SYS\>\>|\<\<\/SYS\>\>/gi, '');

  // Truncate if too long
  if (sanitized.length > MAX_PROMPT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_PROMPT_LENGTH);
  }

  return sanitized.trim();
}
