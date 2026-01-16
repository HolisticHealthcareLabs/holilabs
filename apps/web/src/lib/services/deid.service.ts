/**
 * CDSS V3 - De-identification Service
 *
 * Single-responsibility service for PHI de-identification.
 * Wraps existing de-identification infrastructure for use by other services.
 *
 * CRITICAL: All transcripts MUST be de-identified before:
 * - Sending to any LLM
 * - Persisting to non-encrypted storage
 * - Emitting to frontend logs
 */

import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import logger from '@/lib/logger';

/**
 * De-identification result with metadata
 */
export interface DeidResult {
  text: string;
  wasModified: boolean;
  originalLength: number;
  redactedLength: number;
}

/**
 * Configuration for de-identification
 */
export interface DeidConfig {
  /** Throw on failure (default: true in production) */
  strict?: boolean;
  /** Log de-identification events (default: true) */
  audit?: boolean;
}

export class DeidService {
  private readonly strict: boolean;
  private readonly audit: boolean;

  constructor(config: DeidConfig = {}) {
    this.strict = config.strict ?? process.env.NODE_ENV === 'production';
    this.audit = config.audit ?? true;
  }

  /**
   * Redact PHI from text
   *
   * MUST be called before any text is sent to LLM or stored.
   * Uses the existing Presidio-based de-identification pipeline.
   */
  async redact(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text;
    }

    const startTime = Date.now();

    try {
      const redacted = await deidentifyTranscriptOrThrow(text);

      const duration = Date.now() - startTime;
      const wasModified = redacted !== text;

      if (this.audit) {
        logger.info({
          event: 'deid_redact_complete',
          originalLength: text.length,
          redactedLength: redacted.length,
          wasModified,
          durationMs: duration,
        });
      }

      return redacted;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error({
        event: 'deid_redact_failed',
        originalLength: text.length,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (this.strict) {
        throw error;
      }

      // In non-strict mode (dev only), return original with warning
      logger.warn({
        event: 'deid_bypass_non_strict',
        message: 'Returning original text due to de-identification failure (non-strict mode)',
      });
      return text;
    }
  }

  /**
   * Redact PHI and return detailed result
   */
  async redactWithMetadata(text: string): Promise<DeidResult> {
    const originalLength = text.length;
    const redacted = await this.redact(text);

    return {
      text: redacted,
      wasModified: redacted !== text,
      originalLength,
      redactedLength: redacted.length,
    };
  }

  /**
   * Batch redact multiple texts
   * Processes in parallel for efficiency
   */
  async redactBatch(texts: string[]): Promise<string[]> {
    if (this.audit) {
      logger.info({
        event: 'deid_batch_start',
        count: texts.length,
        totalLength: texts.reduce((sum, t) => sum + t.length, 0),
      });
    }

    const results = await Promise.all(texts.map(text => this.redact(text)));

    if (this.audit) {
      logger.info({
        event: 'deid_batch_complete',
        count: results.length,
      });
    }

    return results;
  }

  /**
   * Check if text likely contains PHI
   * Quick heuristic check - not a replacement for full de-identification
   */
  containsLikelyPHI(text: string): boolean {
    if (!text) return false;

    // Common PHI patterns (simplified - production uses Presidio)
    const patterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{3}[-.]\d{3}[-.]\d{4}\b/, // Phone
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // Date
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i, // Full date
      /\b\d{5}(-\d{4})?\b/, // ZIP code
      /\bMRN[:\s]*\d+\b/i, // Medical record number
      /\bDOB[:\s]*/i, // Date of birth marker
    ];

    return patterns.some(pattern => pattern.test(text));
  }
}

// Export singleton instance for convenience
let deidServiceInstance: DeidService | null = null;

export function getDeidService(config?: DeidConfig): DeidService {
  if (!deidServiceInstance || config) {
    deidServiceInstance = new DeidService(config);
  }
  return deidServiceInstance;
}

// Export factory function for dependency injection
export function createDeidService(config?: DeidConfig): DeidService {
  return new DeidService(config);
}
