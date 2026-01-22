/**
 * Retry Wrapper with Exponential Backoff
 *
 * P2-006: Centralized retry logic for transient failures in AI provider calls.
 * Implements exponential backoff with jitter to prevent thundering herd.
 *
 * Usage:
 *   const result = await withRetry(() => provider.generateResponse(prompt));
 *   const result = await withRetry(() => fetch(url), { maxAttempts: 5 });
 */

import logger from '@/lib/logger';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (including the initial attempt) */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;
  /** Maximum delay in milliseconds (cap for exponential growth) */
  maxDelayMs: number;
  /** Error patterns that should trigger a retry */
  retryableErrors: string[];
  /** Custom function to determine if an error is retryable */
  isRetryable?: (error: Error) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: [
    // Network errors
    'TimeoutError',
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ENETUNREACH',
    'fetch failed',
    // HTTP status codes that indicate transient issues
    '503',  // Service Unavailable
    '429',  // Too Many Requests
    '502',  // Bad Gateway
    '504',  // Gateway Timeout
    // Provider-specific transient errors
    'overloaded',
    'rate_limit',
    'capacity',
  ],
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable based on config
 */
function isRetryable(error: Error, config: RetryConfig): boolean {
  // Allow custom retryable check
  if (config.isRetryable) {
    return config.isRetryable(error);
  }

  const errorString = `${error.name} ${error.message}`.toLowerCase();

  return config.retryableErrors.some((pattern) =>
    errorString.includes(pattern.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 *
 * @param attempt Current attempt number (1-indexed)
 * @param config Retry configuration
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * 2^(attempt-1)
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (0-10% of delay) to prevent thundering herd
  const jitter = Math.random() * cappedDelay * 0.1;

  return Math.floor(cappedDelay + jitter);
}

/**
 * Execute an operation with retry logic and exponential backoff
 *
 * @param operation Async function to execute
 * @param config Optional retry configuration
 * @returns Result of the operation
 * @throws Last error if all retries are exhausted
 *
 * @example
 * // Basic usage with defaults
 * const result = await withRetry(() => fetch('https://api.example.com'));
 *
 * @example
 * // Custom configuration
 * const result = await withRetry(
 *   () => provider.generateResponse(prompt),
 *   { maxAttempts: 5, baseDelayMs: 500 }
 * );
 *
 * @example
 * // Custom retryable check
 * const result = await withRetry(
 *   () => apiCall(),
 *   {
 *     isRetryable: (error) => error.message.includes('temporary'),
 *   }
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (!isRetryable(lastError, fullConfig)) {
        logger.debug({
          event: 'ai_retry_not_retryable',
          errorName: lastError.name,
          errorMessage: lastError.message.substring(0, 100),
          attempt,
        });
        throw lastError;
      }

      // Check if we have retries left
      if (attempt >= fullConfig.maxAttempts) {
        logger.warn({
          event: 'ai_retry_exhausted',
          maxAttempts: fullConfig.maxAttempts,
          errorName: lastError.name,
        });
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, fullConfig);

      logger.info({
        event: 'ai_retry_attempt',
        attempt,
        maxAttempts: fullConfig.maxAttempts,
        delayMs: delay,
        errorName: lastError.name,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a wrapped version of a function with automatic retry
 *
 * @param fn Function to wrap
 * @param config Retry configuration
 * @returns Wrapped function with retry logic
 *
 * @example
 * const retryableFetch = withRetryWrapper(fetch, { maxAttempts: 3 });
 * const response = await retryableFetch('https://api.example.com');
 */
export function withRetryWrapper<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  config: Partial<RetryConfig> = {}
): (...args: TArgs) => Promise<TReturn> {
  return (...args: TArgs) => withRetry(() => fn(...args), config);
}

/**
 * Retry configuration presets for common scenarios
 */
export const RETRY_PRESETS = {
  /** Fast retry for local providers (Ollama, vLLM) */
  local: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    retryableErrors: ['ECONNREFUSED', 'ECONNRESET', 'TimeoutError'],
  } as Partial<RetryConfig>,

  /** Standard retry for cloud providers */
  cloud: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    retryableErrors: ['503', '429', '502', '504', 'overloaded', 'rate_limit'],
  } as Partial<RetryConfig>,

  /** Aggressive retry for critical operations */
  critical: {
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    retryableErrors: DEFAULT_RETRY_CONFIG.retryableErrors,
  } as Partial<RetryConfig>,

  /** No retry (fail immediately) */
  none: {
    maxAttempts: 1,
    baseDelayMs: 0,
    maxDelayMs: 0,
    retryableErrors: [],
  } as Partial<RetryConfig>,
} as const;

/**
 * Error class for retry exhaustion
 */
export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryExhaustedError';
  }
}
