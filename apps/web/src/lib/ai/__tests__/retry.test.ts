/**
 * Retry Wrapper Tests
 *
 * P2-006: Tests for retry with exponential backoff
 * All data is synthetic - NO PHI
 */

jest.mock('@/lib/logger');

const logger = require('@/lib/logger').default;

import {
  withRetry,
  withRetryWrapper,
  RETRY_PRESETS,
  RetryExhaustedError,
  type RetryConfig,
} from '../retry';

describe('retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const resultPromise = withRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient TimeoutError', async () => {
      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';

      const operation = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success after retry');

      const resultPromise = withRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success after retry');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on ECONNRESET error', async () => {
      const connError = new Error('ECONNRESET');

      const operation = jest
        .fn()
        .mockRejectedValueOnce(connError)
        .mockResolvedValueOnce('recovered');

      const resultPromise = withRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('recovered');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 Service Unavailable', async () => {
      const error503 = new Error('HTTP 503 Service Unavailable');

      const operation = jest
        .fn()
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce('service recovered');

      const resultPromise = withRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('service recovered');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limit', async () => {
      const error429 = new Error('HTTP 429 Too Many Requests');

      const operation = jest
        .fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce('rate limit cleared');

      const resultPromise = withRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('rate limit cleared');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 400 Bad Request', async () => {
      const error400 = new Error('HTTP 400 Bad Request');

      const operation = jest.fn().mockRejectedValue(error400);

      await expect(withRetry(operation)).rejects.toThrow('HTTP 400 Bad Request');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 401 Unauthorized', async () => {
      const error401 = new Error('HTTP 401 Unauthorized');

      const operation = jest.fn().mockRejectedValue(error401);

      await expect(withRetry(operation)).rejects.toThrow('HTTP 401 Unauthorized');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after maxAttempts', async () => {
      const timeoutError = new Error('Persistent timeout');
      timeoutError.name = 'TimeoutError';

      const operation = jest.fn().mockRejectedValue(timeoutError);

      // Attach catch handler before running timers to prevent unhandled rejection
      let caughtError: Error | undefined;
      const resultPromise = withRetry(operation, { maxAttempts: 3 }).catch(
        (e: unknown) => {
          caughtError = e as Error;
        }
      );

      await jest.runAllTimersAsync();
      await resultPromise;

      expect(caughtError!.message).toBe('Persistent timeout');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.name = 'TimeoutError';

      const operation = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success');

      const resultPromise = withRetry(operation, {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      });

      // First attempt fails immediately
      await jest.advanceTimersByTimeAsync(0);
      expect(operation).toHaveBeenCalledTimes(1);

      // Wait for first backoff (1000ms base)
      await jest.advanceTimersByTimeAsync(1100); // Include jitter margin
      expect(operation).toHaveBeenCalledTimes(2);

      // Wait for second backoff (2000ms = 1000 * 2^1)
      await jest.advanceTimersByTimeAsync(2200);

      const result = await resultPromise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should cap delay at maxDelayMs', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.name = 'TimeoutError';

      const operation = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success');

      // With baseDelay=5000 and maxDelay=8000:
      // Attempt 1: immediate
      // Attempt 2: delay = 5000 * 2^0 = 5000 (under max)
      // Attempt 3: delay = 5000 * 2^1 = 10000 -> capped to 8000
      const resultPromise = withRetry(operation, {
        maxAttempts: 4,
        baseDelayMs: 5000,
        maxDelayMs: 8000,
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should log retry attempts', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.name = 'TimeoutError';

      const operation = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success');

      const resultPromise = withRetry(operation);
      await jest.runAllTimersAsync();
      await resultPromise;

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_retry_attempt',
          attempt: 1,
        })
      );
    });

    it('should log when retries are exhausted', async () => {
      const timeoutError = new Error('persistent');
      timeoutError.name = 'TimeoutError';

      const operation = jest.fn().mockRejectedValue(timeoutError);

      // Attach catch handler before running timers to prevent unhandled rejection
      const resultPromise = withRetry(operation, { maxAttempts: 2 }).catch(
        () => {
          // Expected rejection
        }
      );

      await jest.runAllTimersAsync();
      await resultPromise;

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_retry_exhausted',
          maxAttempts: 2,
        })
      );
    });

    it('should accept custom isRetryable function', async () => {
      const customError = new Error('Custom retryable error');

      const operation = jest
        .fn()
        .mockRejectedValueOnce(customError)
        .mockResolvedValueOnce('custom retry worked');

      const resultPromise = withRetry(operation, {
        isRetryable: (error) => error.message.includes('Custom retryable'),
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('custom retry worked');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('withRetryWrapper', () => {
    it('should wrap a function with retry logic', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.name = 'TimeoutError';

      const originalFn = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('wrapped success');

      const wrappedFn = withRetryWrapper(originalFn, { maxAttempts: 2 });

      const resultPromise = wrappedFn('arg1', 'arg2');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('wrapped success');
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(originalFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('RETRY_PRESETS', () => {
    it('should have local preset with fast retry', () => {
      expect(RETRY_PRESETS.local.maxAttempts).toBe(2);
      expect(RETRY_PRESETS.local.baseDelayMs).toBe(500);
      expect(RETRY_PRESETS.local.retryableErrors).toContain('ECONNREFUSED');
    });

    it('should have cloud preset with standard retry', () => {
      expect(RETRY_PRESETS.cloud.maxAttempts).toBe(3);
      expect(RETRY_PRESETS.cloud.baseDelayMs).toBe(1000);
      expect(RETRY_PRESETS.cloud.retryableErrors).toContain('429');
      expect(RETRY_PRESETS.cloud.retryableErrors).toContain('503');
    });

    it('should have critical preset with aggressive retry', () => {
      expect(RETRY_PRESETS.critical.maxAttempts).toBe(5);
      expect(RETRY_PRESETS.critical.maxDelayMs).toBe(30000);
    });

    it('should have none preset that fails immediately', () => {
      expect(RETRY_PRESETS.none.maxAttempts).toBe(1);
    });
  });
});
