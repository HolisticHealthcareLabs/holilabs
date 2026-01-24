/**
 * AI Type Definitions
 *
 * Law 3 Compliance: Design for Failure
 * These types support the processWithFallback() pattern.
 *
 * Law 4 Compliance: Hybrid Core
 * AI outputs structured JSON (Layer 1), code executes logic (Layer 2).
 *
 * Law 5 Compliance: Data Contract
 * All AI outputs must be Zod-validated before touching database or rules engine.
 */

import type { RealTimeVitals } from './patient';
import type { ConfidenceLevel } from './clinical';

// ═══════════════════════════════════════════════════════════════
// AI SCRIBE OUTPUT (Layer 1: Probabilistic)
// ═══════════════════════════════════════════════════════════════

/**
 * AIScribeOutput is the structured payload extracted from encounter audio/text.
 *
 * Law 4: AI Scribe listens and extracts structured payload (PatientState JSON).
 * This is Layer 1 (Probabilistic) output.
 */
export interface AIScribeOutput {
  chiefComplaint?: string;
  vitalSigns?: RealTimeVitals;
  symptoms?: string[];
  medicationsMentioned?: string[];
  allergiesMentioned?: string[];
  assessmentNotes?: string;
  planNotes?: string;

  // Confidence in extraction
  confidence?: number;
  extractionQuality?: 'complete' | 'partial' | 'uncertain';
}

// ═══════════════════════════════════════════════════════════════
// PROCESSING RESULT (Fallback Pattern - Law 3)
// ═══════════════════════════════════════════════════════════════

/**
 * ProcessingResult wraps all AI output with metadata about how it was produced.
 *
 * Law 3 Check: "Does system work at 100% if all AI providers fail?"
 * Answer: Yes, because fallback method can produce valid results.
 */
export interface ProcessingResult<T> {
  data: T;
  method: 'ai' | 'fallback' | 'hybrid';
  confidence: ConfidenceLevel;
  aiLatencyMs?: number;
  fallbackReason?: string;
  validationErrors?: string[];
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * FallbackConfig controls when and how deterministic fallback activates.
 *
 * The Fallback Imperative: Every AI call must have a deterministic backup.
 */
export interface FallbackConfig {
  /** Below this confidence threshold, use fallback/hybrid */
  confidenceThreshold: number;
  /** Maximum time to wait for AI response */
  timeoutMs: number;
  /** Number of retries before giving up on AI */
  maxRetries: number;
  /** The deterministic fallback function */
  fallbackFn: () => unknown;
}

// ═══════════════════════════════════════════════════════════════
// AI PROVIDER TYPES (from existing codebase)
// ═══════════════════════════════════════════════════════════════

export type AIProviderType =
  | 'gemini'
  | 'claude'
  | 'openai'
  | 'ollama'
  | 'vllm'
  | 'together';

/**
 * Unified AI task type for routing decisions.
 * Safety-critical tasks → Claude, Commodity tasks → Gemini, etc.
 */
export type UnifiedAITask =
  // Safety-critical tasks → Claude
  | 'drug-interaction'
  | 'diagnosis-support'
  | 'prescription-review'
  | 'lab-interpretation'

  // High-volume commodity tasks → Gemini
  | 'translation'
  | 'summarization'
  | 'clinical-notes'
  | 'patient-education'
  | 'billing-codes'
  | 'scheduling'
  | 'referral-letter'

  // Specialized tasks
  | 'transcript-summary'
  | 'soap-generation'
  | 'icd-coding'

  // Evaluation tasks (LLM-as-Judge)
  | 'evaluation'

  // Default
  | 'general';

/**
 * Configuration for task-to-provider routing
 */
export interface TaskConfig {
  task: UnifiedAITask;
  primaryProvider: AIProviderType;
  fallbackProviders: AIProviderType[];
  preferLocal: boolean;
  estimatedLatency: 'fast' | 'medium' | 'slow';
  privacyLevel: 'local' | 'self-hosted' | 'cloud';
  estimatedCostPer1k: number;
  rationale: string;
}

// ═══════════════════════════════════════════════════════════════
// RETRY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Configuration for retry behavior with exponential backoff
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
  isRetryable?: (error: Error) => boolean;
}

export const RETRY_PRESETS = {
  local: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    retryableErrors: ['ECONNREFUSED', 'ECONNRESET', 'TimeoutError'],
  },
  cloud: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    retryableErrors: ['503', '429', '502', '504', 'overloaded', 'rate_limit'],
  },
  critical: {
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    retryableErrors: [
      'TimeoutError',
      'ECONNRESET',
      '503',
      '429',
      '502',
      '504',
      'overloaded',
      'rate_limit',
    ],
  },
  none: {
    maxAttempts: 1,
    baseDelayMs: 0,
    maxDelayMs: 0,
    retryableErrors: [],
  },
} as const;
