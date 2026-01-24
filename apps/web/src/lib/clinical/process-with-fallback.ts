/**
 * Process with Fallback Pattern
 *
 * Law 3 Compliance: Design for Failure (The Fallback Imperative)
 * AI is probabilistic; Software is deterministic. The integration point is the point of failure.
 *
 * The Check: "Does system work at 100% reliability even if ALL AI providers fail simultaneously?"
 * Answer: Yes, because this function ensures deterministic fallback takes over.
 *
 * Usage:
 *   const result = await processWithFallback(
 *     prompt,
 *     diagnosisOutputSchema,
 *     () => deterministicDiagnosis(symptoms),
 *     { task: 'diagnosis-support' }
 *   );
 */

import { z, ZodSchema } from 'zod';
import { aiToJSON, type BridgeOptions } from '@/lib/ai/bridge';
import { withRetry, RETRY_PRESETS, type RetryConfig } from '@/lib/ai/retry';
import { isFeatureEnabled } from '@/lib/feature-flags';
import logger from '@/lib/logger';
import type { ConfidenceLevel } from '@holilabs/shared-types';

// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Maps clinical task types to their feature flag names.
 * This enables the AI kill switch for specific task types.
 */
const TASK_TO_FEATURE_FLAG: Record<string, string> = {
  'diagnosis-support': 'ai.diagnosis.enabled',
  'drug-interaction': 'ai.diagnosis.enabled', // Safety-critical, same flag
  'clinical-notes': 'ai.scribe.enabled',
  'transcript-summary': 'ai.scribe.enabled',
  'billing-codes': 'ai.diagnosis.enabled', // Uses clinical AI
  'icd-coding': 'ai.diagnosis.enabled',
  'treatment-protocol': 'ai.treatment.enabled',
  'adherence-assessment': 'ai.adherence.enabled',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * ProcessingResult wraps all AI output with metadata about how it was produced.
 * This enables quality monitoring and helps identify when fallbacks are triggered.
 */
export interface ProcessingResult<T> {
  /** The actual data result */
  data: T;
  /** How the result was produced */
  method: 'ai' | 'fallback' | 'hybrid';
  /** Confidence level in the result */
  confidence: ConfidenceLevel;
  /** AI processing latency (if AI was used) */
  aiLatencyMs?: number;
  /** Reason fallback was used (if applicable) */
  fallbackReason?: string;
  /** Validation errors encountered (if any) */
  validationErrors?: string[];
}

/**
 * Configuration for the fallback behavior
 */
export interface FallbackOptions {
  /** Below this confidence threshold, use fallback/hybrid (0-1) */
  confidenceThreshold?: number;
  /** Maximum time to wait for AI response in ms */
  timeoutMs?: number;
  /** Maximum retry attempts before falling back */
  maxRetries?: number;
  /** Retry preset to use */
  retryPreset?: keyof typeof RETRY_PRESETS;
  /** Clinical task for routing (affects provider selection) */
  task?: BridgeOptions['task'];
  /** Whether to de-identify input before sending to AI */
  deidentify?: boolean;
  /** If true, merge AI partial results with fallback instead of replacing */
  enableHybrid?: boolean;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Clinic ID for feature flag checks (enables clinic-specific AI kill switch) */
  clinicId?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 2;

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Process a request with AI, falling back to deterministic logic if AI fails.
 *
 * THE FALLBACK IMPERATIVE: Every AI call MUST go through this function.
 * If AI fails or returns low confidence, deterministic fallback takes over.
 *
 * @param prompt The prompt to send to AI
 * @param schema Zod schema to validate AI response against
 * @param fallbackFn Deterministic fallback function (MUST NEVER FAIL)
 * @param options Configuration options
 * @returns ProcessingResult with data and metadata about how it was produced
 *
 * @example
 * const result = await processWithFallback(
 *   buildDiagnosisPrompt(symptoms),
 *   diagnosisOutputSchema,
 *   () => deterministicDiagnosis(symptoms),
 *   { task: 'diagnosis-support', confidenceThreshold: 0.75 }
 * );
 *
 * if (result.method === 'fallback') {
 *   logger.warn('AI unavailable, used deterministic fallback');
 * }
 */
export async function processWithFallback<T>(
  prompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<T, z.ZodTypeDef, any>,
  fallbackFn: () => T | Promise<T>,
  options: FallbackOptions = {}
): Promise<ProcessingResult<T>> {
  const {
    confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryPreset = 'cloud',
    task,
    deidentify = true,
    enableHybrid = true,
    systemPrompt,
    clinicId,
  } = options;

  const startTime = Date.now();
  const requestId = generateRequestId();

  logger.info({
    event: 'process_with_fallback_start',
    requestId,
    task,
    clinicId,
    confidenceThreshold,
    timeoutMs,
  });

  // ─────────────────────────────────────────────────────────────
  // FEATURE FLAG CHECK: AI Kill Switch
  // If AI is disabled for this task/clinic, skip directly to fallback
  // ─────────────────────────────────────────────────────────────
  if (task) {
    const featureFlag = TASK_TO_FEATURE_FLAG[task];
    if (featureFlag) {
      const aiEnabled = await isFeatureEnabled(featureFlag, { clinicId });
      if (!aiEnabled) {
        logger.warn({
          event: 'process_with_fallback_ai_disabled',
          requestId,
          task,
          featureFlag,
          clinicId,
          reason: 'Feature flag disabled',
        });

        const fallbackData = await executeFallback(fallbackFn, requestId);
        return {
          data: fallbackData,
          method: 'fallback',
          confidence: 'fallback',
          aiLatencyMs: Date.now() - startTime,
          fallbackReason: `AI disabled via feature flag: ${featureFlag}`,
        };
      }
    }
  }

  try {
    // Attempt AI processing with timeout and retry
    const aiResult = await Promise.race([
      withRetry(
        () =>
          aiToJSON(prompt, schema, {
            task,
            deidentify,
            systemPrompt,
            maxRetries: 0, // Let withRetry handle retries
          }),
        {
          ...RETRY_PRESETS[retryPreset],
          maxAttempts: maxRetries,
        }
      ),
      timeout<T>(timeoutMs, requestId),
    ]);

    const latencyMs = Date.now() - startTime;

    // Extract confidence from result (if present)
    const confidence = extractConfidence(aiResult);

    logger.info({
      event: 'process_with_fallback_ai_success',
      requestId,
      latencyMs,
      confidence,
      task,
    });

    // Check confidence threshold
    if (confidence < confidenceThreshold) {
      logger.info({
        event: 'process_with_fallback_low_confidence',
        requestId,
        confidence,
        threshold: confidenceThreshold,
        enableHybrid,
      });

      if (enableHybrid) {
        // AI succeeded but confidence too low - use hybrid approach
        const fallbackData = await executeFallback(fallbackFn, requestId);
        const mergedData = mergeResults(aiResult, fallbackData);

        return {
          data: mergedData,
          method: 'hybrid',
          confidence: 'medium',
          aiLatencyMs: latencyMs,
          fallbackReason: `AI confidence ${formatPercent(confidence)} below threshold ${formatPercent(confidenceThreshold)}`,
        };
      }

      // Hybrid disabled - use pure fallback
      const fallbackData = await executeFallback(fallbackFn, requestId);
      return {
        data: fallbackData,
        method: 'fallback',
        confidence: 'fallback',
        aiLatencyMs: latencyMs,
        fallbackReason: `AI confidence ${formatPercent(confidence)} below threshold ${formatPercent(confidenceThreshold)}, hybrid disabled`,
      };
    }

    // AI succeeded with acceptable confidence
    return {
      data: aiResult,
      method: 'ai',
      confidence: confidenceToLevel(confidence),
      aiLatencyMs: latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn({
      event: 'process_with_fallback_ai_failed',
      requestId,
      latencyMs,
      error: errorMessage,
      task,
    });

    // AI failed completely - use deterministic fallback
    const fallbackData = await executeFallback(fallbackFn, requestId);

    return {
      data: fallbackData,
      method: 'fallback',
      confidence: 'fallback',
      aiLatencyMs: latencyMs,
      fallbackReason: errorMessage,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a timeout promise that rejects after specified duration
 */
function timeout<T>(ms: number, requestId: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      logger.warn({
        event: 'process_with_fallback_timeout',
        requestId,
        timeoutMs: ms,
      });
      reject(new Error(`AI timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Execute fallback function with error handling
 * CRITICAL: Fallback should never throw - if it does, we have a serious bug
 */
async function executeFallback<T>(
  fallbackFn: () => T | Promise<T>,
  requestId: string
): Promise<T> {
  try {
    logger.info({
      event: 'process_with_fallback_executing_fallback',
      requestId,
    });
    return await fallbackFn();
  } catch (error) {
    // This should NEVER happen - fallbacks must be bulletproof
    logger.error({
      event: 'process_with_fallback_fallback_failed',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw - if fallback fails, we have a critical bug
    throw new FallbackError(
      `Deterministic fallback failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Extract confidence score from AI result
 * Looks for common confidence field names
 */
function extractConfidence(result: unknown): number {
  if (typeof result !== 'object' || result === null) {
    return 0.5; // Default if no object
  }

  const obj = result as Record<string, unknown>;

  // Direct confidence field
  if ('confidence' in obj && typeof obj.confidence === 'number') {
    return obj.confidence;
  }

  // Probability field (common in diagnosis outputs)
  if ('probability' in obj && typeof obj.probability === 'number') {
    return obj.probability;
  }

  // Check nested arrays (e.g., differentials)
  if ('differentials' in obj && Array.isArray(obj.differentials)) {
    const probs = obj.differentials
      .filter((d): d is { probability: number } =>
        typeof d === 'object' && d !== null && 'probability' in d && typeof d.probability === 'number'
      )
      .map((d) => d.probability);

    if (probs.length > 0) {
      // Return max probability as overall confidence
      return Math.max(...probs);
    }
  }

  // Extraction quality (from scribe outputs)
  if ('extractionQuality' in obj) {
    switch (obj.extractionQuality) {
      case 'complete':
        return 0.9;
      case 'partial':
        return 0.6;
      case 'uncertain':
        return 0.3;
    }
  }

  return 0.5; // Default if no confidence found
}

/**
 * Convert numeric confidence to confidence level
 */
function confidenceToLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
}

/**
 * Format confidence as percentage string
 */
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Merge AI results with fallback results
 * Prefers AI fields but fills gaps with fallback
 */
function mergeResults<T>(aiResult: T, fallbackResult: T): T {
  // For arrays, combine unique items
  if (Array.isArray(aiResult) && Array.isArray(fallbackResult)) {
    const combined = [...aiResult];
    for (const item of fallbackResult) {
      // Add fallback items that don't have AI equivalents
      // This is a simple merge - specific types may need custom logic
      if (!aiResult.some((ai) => isEquivalent(ai, item))) {
        combined.push(item);
      }
    }
    return combined as T;
  }

  // For objects, spread fallback first (lower priority) then AI (higher priority)
  if (typeof aiResult === 'object' && typeof fallbackResult === 'object') {
    return { ...fallbackResult, ...aiResult };
  }

  // For primitives, prefer AI
  return aiResult;
}

/**
 * Check if two items are equivalent (for deduplication)
 */
function isEquivalent(a: unknown, b: unknown): boolean {
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  if (a === null || b === null) {
    return a === b;
  }

  // Check by ID if present
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  if ('id' in aObj && 'id' in bObj) {
    return aObj.id === bObj.id;
  }
  if ('icd10Code' in aObj && 'icd10Code' in bObj) {
    return aObj.icd10Code === bObj.icd10Code;
  }

  return false;
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `pwf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// ERROR CLASSES
// ═══════════════════════════════════════════════════════════════

/**
 * Error thrown when the deterministic fallback fails
 * This indicates a critical bug - fallbacks should never fail
 */
export class FallbackError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FallbackError';
  }
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-configured wrappers for common clinical tasks
 * All wrappers support optional clinicId for feature flag checks
 */
export const ClinicalProcessor = {
  /**
   * Process diagnosis with fallback (higher confidence threshold)
   */
  diagnosis: <T>(
    prompt: string,
    schema: ZodSchema<T>,
    fallbackFn: () => T | Promise<T>,
    clinicId?: string
  ) =>
    processWithFallback(prompt, schema, fallbackFn, {
      task: 'diagnosis-support',
      confidenceThreshold: 0.75,
      timeoutMs: 15000,
      clinicId,
    }),

  /**
   * Process treatment recommendations with fallback
   */
  treatment: <T>(
    prompt: string,
    schema: ZodSchema<T>,
    fallbackFn: () => T | Promise<T>,
    clinicId?: string
  ) =>
    processWithFallback(prompt, schema, fallbackFn, {
      task: 'diagnosis-support', // Same safety level as diagnosis
      confidenceThreshold: 0.8,
      timeoutMs: 12000,
      clinicId,
    }),

  /**
   * Process clinical notes extraction (lower threshold OK)
   */
  notes: <T>(
    prompt: string,
    schema: ZodSchema<T>,
    fallbackFn: () => T | Promise<T>,
    clinicId?: string
  ) =>
    processWithFallback(prompt, schema, fallbackFn, {
      task: 'clinical-notes',
      confidenceThreshold: 0.6,
      timeoutMs: 10000,
      clinicId,
    }),

  /**
   * Process billing codes
   */
  billing: <T>(
    prompt: string,
    schema: ZodSchema<T>,
    fallbackFn: () => T | Promise<T>,
    clinicId?: string
  ) =>
    processWithFallback(prompt, schema, fallbackFn, {
      task: 'billing-codes',
      confidenceThreshold: 0.7,
      timeoutMs: 8000,
      clinicId,
    }),

  /**
   * Process drug interactions (highest safety requirements)
   */
  drugInteraction: <T>(
    prompt: string,
    schema: ZodSchema<T>,
    fallbackFn: () => T | Promise<T>,
    clinicId?: string
  ) =>
    processWithFallback(prompt, schema, fallbackFn, {
      task: 'drug-interaction',
      confidenceThreshold: 0.9,
      timeoutMs: 15000,
      enableHybrid: false, // Pure AI or pure fallback for safety
      clinicId,
    }),
};
