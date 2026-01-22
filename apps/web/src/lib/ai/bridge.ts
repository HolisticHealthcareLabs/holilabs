/**
 * AI-to-JSON Bridge
 *
 * Ensures all AI outputs are valid JSON matching a schema before processing.
 * This is the deterministic layer between probabilistic AI and clinical features.
 *
 * Pattern:
 * 1. Send prompt to AI with JSON output requirement
 * 2. Parse response as JSON
 * 3. Validate against Zod schema
 * 4. Retry with error feedback if validation fails
 * 5. Return typed data or throw
 */

import { z, ZodSchema } from 'zod';
import { routeAIRequest, type TaskAwareRequest, type ClinicalTask } from './router';
// P2-005: ClinicalTask is now an alias for UnifiedAITask from types.ts
import { type UnifiedAITask } from './types';
import {
  validateAIOutput,
  safeParseJSON,
  createRetryPrompt,
  AIValidationError,
  type ValidationResult,
} from './validator';
import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import logger from '@/lib/logger';

export interface BridgeOptions {
  /** Maximum number of retries on validation failure */
  maxRetries?: number;
  /** Clinical task for routing */
  task?: ClinicalTask;
  /** Whether to de-identify input before sending to AI */
  deidentify?: boolean;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Temperature for AI response (lower = more deterministic) */
  temperature?: number;
  /** Force JSON response format (if supported by provider) */
  jsonMode?: boolean;
}

const DEFAULT_OPTIONS: BridgeOptions = {
  maxRetries: 2,
  deidentify: true,
  temperature: 0.1, // Low temperature for deterministic outputs
  jsonMode: true,
};

/**
 * Convert AI output to validated JSON
 *
 * @param prompt The prompt to send to AI
 * @param schema Zod schema to validate response against
 * @param options Bridge options
 * @returns Validated, typed data
 * @throws AIValidationError if validation fails after retries
 *
 * @example
 * const soapNote = await aiToJSON(
 *   'Generate a SOAP note for this encounter...',
 *   SOAPNoteSchema,
 *   { task: 'clinical-notes', deidentify: true }
 * );
 */
export async function aiToJSON<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options: BridgeOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let currentPrompt = prompt;
  let lastError: string | undefined;

  // De-identify input if required
  let processedPrompt = currentPrompt;
  if (opts.deidentify) {
    try {
      processedPrompt = await deidentifyTranscriptOrThrow(currentPrompt);
    } catch (error) {
      logger.error({
        event: 'bridge_deidentification_failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AIValidationError('De-identification failed', undefined, false);
    }
  }

  // Build system prompt for JSON output
  const systemPrompt = opts.systemPrompt || buildJSONSystemPrompt(schema);

  for (let attempt = 0; attempt <= (opts.maxRetries || 0); attempt++) {
    const attemptPrompt = attempt === 0
      ? processedPrompt
      : createRetryPrompt(processedPrompt, lastError || '');

    logger.info({
      event: 'bridge_ai_request',
      attempt: attempt + 1,
      maxAttempts: (opts.maxRetries || 0) + 1,
      task: opts.task,
      hasRetryFeedback: attempt > 0,
    });

    // Send to AI via router
    const response = await routeAIRequest({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: attemptPrompt },
      ],
      task: opts.task,
      temperature: opts.temperature,
    } as TaskAwareRequest);

    if (!response.success || !response.content) {
      lastError = response.error || 'AI request failed';
      logger.warn({
        event: 'bridge_ai_request_failed',
        attempt: attempt + 1,
        error: lastError,
      });
      continue;
    }

    // Parse JSON from response
    const parsed = safeParseJSON(response.content);
    if (parsed === null) {
      lastError = 'Failed to parse JSON from AI response';
      logger.warn({
        event: 'bridge_json_parse_failed',
        attempt: attempt + 1,
        responsePreview: response.content.substring(0, 200),
      });
      continue;
    }

    // Validate against schema
    const validation = validateAIOutput(parsed, schema);
    if (validation.success && validation.data) {
      logger.info({
        event: 'bridge_validation_success',
        attempt: attempt + 1,
        schema: schema.description || 'unknown',
      });
      return validation.data;
    }

    lastError = validation.error;
    logger.warn({
      event: 'bridge_validation_failed',
      attempt: attempt + 1,
      error: lastError,
      details: validation.details,
    });
  }

  // All retries exhausted
  logger.error({
    event: 'bridge_all_retries_exhausted',
    finalError: lastError,
    schema: schema.description || 'unknown',
    task: opts.task,
  });

  throw new AIValidationError(
    `AI output validation failed after ${(opts.maxRetries || 0) + 1} attempts: ${lastError}`,
    undefined,
    false
  );
}

/**
 * Build a system prompt that instructs AI to output valid JSON
 */
function buildJSONSystemPrompt<T>(schema: ZodSchema<T>): string {
  // Try to extract schema shape for the prompt
  let schemaHint = '';
  try {
    // For Zod objects, we can provide structure hints
    if ('shape' in schema) {
      const shape = (schema as z.ZodObject<any>).shape;
      const fields = Object.keys(shape);
      schemaHint = `\nRequired fields: ${fields.join(', ')}`;
    }
  } catch {
    // Ignore if we can't extract schema info
  }

  return `You are a medical AI assistant that ALWAYS responds with valid JSON.

CRITICAL REQUIREMENTS:
1. Your response MUST be valid JSON only - no markdown, no explanation, no text before or after
2. The JSON must match the exact structure requested${schemaHint}
3. All required fields must be present
4. Use null for optional fields with no value
5. Be precise and accurate - this is for clinical use

If you cannot provide the requested information, return a JSON object with an "error" field explaining why.`;
}

/**
 * Convenience wrapper for common clinical AI tasks
 */
export const AIBridge = {
  /**
   * Generate SOAP notes with validation
   */
  soapNote: <T>(prompt: string, schema: ZodSchema<T>) =>
    aiToJSON(prompt, schema, { task: 'clinical-notes', temperature: 0.1 }),

  /**
   * Generate autofill suggestions with validation
   */
  autofill: <T>(prompt: string, schema: ZodSchema<T>) =>
    aiToJSON(prompt, schema, { task: 'general', temperature: 0 }),

  /**
   * Check drug interactions with validation (always uses Claude for safety)
   */
  drugInteraction: <T>(prompt: string, schema: ZodSchema<T>) =>
    aiToJSON(prompt, schema, { task: 'drug-interaction', temperature: 0 }),

  /**
   * Generate prescription with validation (always uses Claude for safety)
   */
  prescription: <T>(prompt: string, schema: ZodSchema<T>) =>
    aiToJSON(prompt, schema, { task: 'prescription-review', temperature: 0 }),

  /**
   * Generate clinical alert with validation
   */
  clinicalAlert: <T>(prompt: string, schema: ZodSchema<T>) =>
    aiToJSON(prompt, schema, { task: 'diagnosis-support', temperature: 0.1 }),

  /**
   * Generic validated AI call
   */
  validated: aiToJSON,
};
