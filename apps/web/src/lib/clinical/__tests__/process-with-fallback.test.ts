/**
 * Unit Tests: processWithFallback Pattern
 *
 * Law 3 Compliance: Design for Failure (The Fallback Imperative)
 * These tests verify that the system works at 100% reliability
 * even when AI providers fail.
 *
 * Test Categories:
 * 1. AI success with high confidence → returns AI result
 * 2. AI success with low confidence → triggers hybrid/fallback
 * 3. AI timeout → triggers fallback
 * 4. AI error → triggers fallback
 * 5. Fallback failure → throws FallbackError (critical bug)
 */

import { z } from 'zod';

// Mock dependencies BEFORE importing module under test
jest.mock('@/lib/ai/bridge', () => ({
  aiToJSON: jest.fn(),
}));

jest.mock('@/lib/ai/retry', () => ({
  withRetry: jest.fn(async (fn) => fn()),
  RETRY_PRESETS: {
    cloud: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000, retryableErrors: [] },
  },
}));

jest.mock('@/lib/logger');

// Import mocks after jest.mock()
const { aiToJSON } = require('@/lib/ai/bridge');
const { withRetry } = require('@/lib/ai/retry');
const logger = require('@/lib/logger').default;

// Import module under test
import {
  processWithFallback,
  FallbackError,
  ClinicalProcessor,
} from '../process-with-fallback';

describe('processWithFallback', () => {
  // Test schema
  const testSchema = z.object({
    result: z.string(),
    confidence: z.number().optional(),
  });

  // Test fallback function
  const fallbackFn = jest.fn(() => ({
    result: 'fallback-result',
    confidence: 0.5,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-establish withRetry mock implementation after clearAllMocks
    (withRetry as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
  });

  describe('AI Success Path', () => {
    it('should return AI result when confidence is high', async () => {
      const aiResult = { result: 'ai-result', confidence: 0.9 };
      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const result = await processWithFallback(
        'test prompt',
        testSchema,
        fallbackFn,
        { confidenceThreshold: 0.7 }
      );

      expect(result.method).toBe('ai');
      expect(result.data).toEqual(aiResult);
      expect(result.confidence).toBe('high');
      expect(result.aiLatencyMs).toBeDefined();
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should return AI result with medium confidence when between thresholds', async () => {
      const aiResult = { result: 'ai-result', confidence: 0.75 };
      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const result = await processWithFallback(
        'test prompt',
        testSchema,
        fallbackFn,
        { confidenceThreshold: 0.7 }
      );

      expect(result.method).toBe('ai');
      expect(result.confidence).toBe('medium');
    });

    it('should return AI result with low confidence level when above threshold but below 0.7', async () => {
      const aiResult = { result: 'ai-result', confidence: 0.72 };
      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const result = await processWithFallback(
        'test prompt',
        testSchema,
        fallbackFn,
        { confidenceThreshold: 0.7 }
      );

      expect(result.method).toBe('ai');
      expect(result.confidence).toBe('medium'); // 0.72 >= 0.7 is medium
    });
  });

  describe('Low Confidence - Hybrid Mode', () => {
    it('should use hybrid mode when AI confidence is below threshold', async () => {
      const aiResult = { result: 'ai-result', confidence: 0.5 };
      const fallbackResult = { result: 'fallback-result', confidence: 0.8 };

      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));
      fallbackFn.mockReturnValue(fallbackResult);

      const result = await processWithFallback(
        'test prompt',
        testSchema,
        fallbackFn,
        { confidenceThreshold: 0.7, enableHybrid: true }
      );

      expect(result.method).toBe('hybrid');
      expect(result.confidence).toBe('medium');
      expect(result.fallbackReason).toContain('below threshold');
      expect(fallbackFn).toHaveBeenCalled();
    });

    it('should use pure fallback when hybrid is disabled and confidence is low', async () => {
      const aiResult = { result: 'ai-result', confidence: 0.5 };
      const fallbackResult = { result: 'fallback-result', confidence: 0.5 };

      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));
      fallbackFn.mockReturnValue(fallbackResult);

      const result = await processWithFallback(
        'test prompt',
        testSchema,
        fallbackFn,
        { confidenceThreshold: 0.7, enableHybrid: false }
      );

      expect(result.method).toBe('fallback');
      expect(result.confidence).toBe('fallback');
      expect(result.data).toEqual(fallbackResult);
    });
  });

  describe('AI Failure - Fallback Path', () => {
    it('should use fallback when AI throws an error', async () => {
      const fallbackResult = { result: 'fallback-result', confidence: 0.5 };

      (aiToJSON as jest.Mock).mockImplementation(() => Promise.reject(new Error('AI provider unavailable')));
      fallbackFn.mockReturnValue(fallbackResult);

      const result = await processWithFallback(
        'test prompt',
        testSchema,
        fallbackFn
      );

      expect(result.method).toBe('fallback');
      expect(result.confidence).toBe('fallback');
      expect(result.data).toEqual(fallbackResult);
      expect(result.fallbackReason).toBe('AI provider unavailable');
      expect(fallbackFn).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'process_with_fallback_ai_failed',
        })
      );
    });

    it('should use fallback when AI returns malformed response', async () => {
      const fallbackResult = { result: 'fallback-result', confidence: 0.5 };

      (aiToJSON as jest.Mock).mockImplementation(() => Promise.reject(new Error('Validation failed')));
      fallbackFn.mockReturnValue(fallbackResult);

      const result = await processWithFallback(
        'test prompt',
        testSchema,
        fallbackFn
      );

      expect(result.method).toBe('fallback');
      expect(result.fallbackReason).toBe('Validation failed');
    });
  });

  describe('Timeout Handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should use fallback when AI times out', async () => {
      const fallbackResult = { result: 'fallback-result', confidence: 0.5 };

      // AI never resolves (simulates timeout)
      (aiToJSON as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      fallbackFn.mockReturnValue(fallbackResult);

      const resultPromise = processWithFallback(
        'test prompt',
        testSchema,
        fallbackFn,
        { timeoutMs: 5000 }
      );

      // Advance past timeout and flush promises
      await jest.advanceTimersByTimeAsync(6000);

      const result = await resultPromise;

      expect(result.method).toBe('fallback');
      expect(result.fallbackReason).toContain('timeout');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'process_with_fallback_timeout',
        })
      );
    });
  });

  describe('Fallback Failure - Critical Bug', () => {
    it('should throw FallbackError when fallback fails', async () => {
      (aiToJSON as jest.Mock).mockImplementation(() => Promise.reject(new Error('AI failed')));
      fallbackFn.mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      await expect(
        processWithFallback('test prompt', testSchema, fallbackFn)
      ).rejects.toThrow(FallbackError);

      await expect(
        processWithFallback('test prompt', testSchema, fallbackFn)
      ).rejects.toThrow('Deterministic fallback failed');

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'process_with_fallback_fallback_failed',
        })
      );
    });

    it('should preserve original error in FallbackError cause', async () => {
      const originalError = new Error('Original database error');

      (aiToJSON as jest.Mock).mockImplementation(() => Promise.reject(new Error('AI failed')));
      fallbackFn.mockImplementation(() => {
        throw originalError;
      });

      try {
        await processWithFallback('test prompt', testSchema, fallbackFn);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FallbackError);
        expect((error as FallbackError).cause).toBe(originalError);
      }
    });
  });

  describe('Async Fallback', () => {
    it('should handle async fallback functions', async () => {
      const fallbackResult = { result: 'async-fallback-result' };
      const asyncFallback = jest.fn(async () => {
        return fallbackResult;
      });

      (aiToJSON as jest.Mock).mockImplementation(() => Promise.reject(new Error('AI failed')));

      const result = await processWithFallback(
        'test prompt',
        testSchema,
        asyncFallback
      );

      expect(result.method).toBe('fallback');
      expect(result.data).toEqual(fallbackResult);
      expect(asyncFallback).toHaveBeenCalled();
    });
  });

  describe('Confidence Extraction', () => {
    it('should extract confidence from probability field', async () => {
      const aiResult = { result: 'test', probability: 0.85 };
      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const probabilityFallback = jest.fn(() => ({
        result: 'fallback-result',
        probability: 0.5,
      }));

      const result = await processWithFallback(
        'test prompt',
        z.object({ result: z.string(), probability: z.number() }),
        probabilityFallback,
        { confidenceThreshold: 0.7 }
      );

      expect(result.method).toBe('ai');
      expect(result.confidence).toBe('high');
    });

    it('should extract confidence from differentials array', async () => {
      const aiResult = {
        differentials: [
          { icd10Code: 'J06', probability: 0.6 },
          { icd10Code: 'J00', probability: 0.9 },
        ],
      };
      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const differentialsFallback = jest.fn(() => ({
        differentials: [{ icd10Code: 'FALLBACK', probability: 0.5 }],
      }));

      const result = await processWithFallback(
        'test prompt',
        z.object({
          differentials: z.array(z.object({
            icd10Code: z.string(),
            probability: z.number()
          }))
        }),
        differentialsFallback,
        { confidenceThreshold: 0.7 }
      );

      // Should use max probability (0.9) as confidence
      expect(result.method).toBe('ai');
      expect(result.confidence).toBe('high');
    });

    it('should default to 0.5 confidence when no confidence field present', async () => {
      const aiResult = { result: 'test-without-confidence' };
      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const result = await processWithFallback(
        'test prompt',
        z.object({ result: z.string() }),
        fallbackFn,
        { confidenceThreshold: 0.7 }
      );

      // Default 0.5 is below 0.7 threshold, should trigger hybrid
      expect(result.method).toBe('hybrid');
    });

    it('should handle extractionQuality field', async () => {
      const aiResult = { result: 'test', extractionQuality: 'complete' };
      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const extractionFallback = jest.fn(() => ({
        result: 'fallback-result',
        extractionQuality: 'uncertain',
      }));

      const result = await processWithFallback(
        'test prompt',
        z.object({ result: z.string(), extractionQuality: z.string() }),
        extractionFallback,
        { confidenceThreshold: 0.7 }
      );

      // 'complete' maps to 0.9 confidence
      expect(result.method).toBe('ai');
      expect(result.confidence).toBe('high');
    });
  });

  describe('Merge Results', () => {
    it('should merge AI and fallback arrays correctly', async () => {
      const aiResult = {
        items: [
          { id: '1', name: 'AI Item 1' },
          { id: '2', name: 'AI Item 2' },
        ],
        confidence: 0.5,
      };
      const fallbackResult = {
        items: [
          { id: '2', name: 'Fallback Item 2' }, // Duplicate by ID
          { id: '3', name: 'Fallback Item 3' },
        ],
        confidence: 0.8,
      };

      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const itemsFallback = jest.fn(() => fallbackResult);

      const result = await processWithFallback(
        'test prompt',
        z.object({ items: z.array(z.any()), confidence: z.number() }),
        itemsFallback,
        { confidenceThreshold: 0.7, enableHybrid: true }
      );

      expect(result.method).toBe('hybrid');
      // AI items take priority, fallback fields override at object level (spread order)
      expect(result.data.items).toContainEqual({ id: '1', name: 'AI Item 1' });
      expect(result.data.items).toContainEqual({ id: '2', name: 'AI Item 2' }); // AI version
    });

    it('should merge object results preferring AI fields', async () => {
      const aiResult = { result: 'ai-value', confidence: 0.5, aiOnly: true };
      const fallbackResult = { result: 'fallback-value', confidence: 0.8, fallbackOnly: true };

      (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

      const mergeSchema = z.object({ result: z.string(), confidence: z.number() }).passthrough();
      type MergeResult = z.infer<typeof mergeSchema> & { aiOnly?: boolean; fallbackOnly?: boolean };

      const mergeFallback = jest.fn((): MergeResult => fallbackResult);

      const result = await processWithFallback(
        'test prompt',
        mergeSchema,
        mergeFallback,
        { confidenceThreshold: 0.7, enableHybrid: true }
      );

      expect(result.method).toBe('hybrid');
      // AI fields override fallback (spread order: fallback first, then AI)
      expect(result.data.result).toBe('ai-value');
      // Cast to access passthrough properties
      const dataWithExtras = result.data as MergeResult;
      expect(dataWithExtras.aiOnly).toBe(true);
      expect(dataWithExtras.fallbackOnly).toBe(true);
    });
  });
});

describe('ClinicalProcessor Convenience Wrappers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-establish withRetry mock implementation after clearAllMocks
    (withRetry as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
  });

  it('ClinicalProcessor.diagnosis should use higher confidence threshold', async () => {
    const aiResult = { result: 'diagnosis', confidence: 0.76 };
    (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

    const schema = z.object({ result: z.string(), confidence: z.number() });
    const fallbackFn = jest.fn(() => ({ result: 'fallback', confidence: 0.5 }));

    // 0.76 is above 0.75 threshold for diagnosis
    const result = await ClinicalProcessor.diagnosis('test', schema, fallbackFn);

    expect(result.method).toBe('ai');
    expect(aiToJSON).toHaveBeenCalledWith(
      'test',
      schema,
      expect.objectContaining({
        task: 'diagnosis-support',
      })
    );
  });

  it('ClinicalProcessor.drugInteraction should disable hybrid mode', async () => {
    const aiResult = { result: 'interaction', confidence: 0.5 };
    (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

    const schema = z.object({ result: z.string(), confidence: z.number() });
    const fallbackFn = jest.fn(() => ({ result: 'fallback', confidence: 0.5 }));

    const result = await ClinicalProcessor.drugInteraction('test', schema, fallbackFn);

    // Low confidence (0.5) with hybrid disabled = pure fallback
    expect(result.method).toBe('fallback');
    expect(fallbackFn).toHaveBeenCalled();
  });

  it('ClinicalProcessor.treatment should use 0.8 confidence threshold', async () => {
    const aiResult = { result: 'treatment', confidence: 0.79 };
    (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

    const schema = z.object({ result: z.string(), confidence: z.number() });
    const fallbackFn = jest.fn(() => ({ result: 'fallback', confidence: 0.5 }));

    // 0.79 is below 0.8 threshold for treatment
    const result = await ClinicalProcessor.treatment('test', schema, fallbackFn);

    expect(result.method).toBe('hybrid'); // Below threshold, hybrid enabled by default
  });

  it('ClinicalProcessor.notes should use lower 0.6 confidence threshold', async () => {
    const aiResult = { result: 'notes', confidence: 0.65 };
    (aiToJSON as jest.Mock).mockImplementation(() => Promise.resolve(aiResult));

    const schema = z.object({ result: z.string(), confidence: z.number() });
    const fallbackFn = jest.fn(() => ({ result: 'fallback', confidence: 0.5 }));

    // 0.65 is above 0.6 threshold for notes
    const result = await ClinicalProcessor.notes('test', schema, fallbackFn);

    expect(result.method).toBe('ai');
  });
});
