/**
 * Graceful Degradation Utilities
 *
 * Provides utilities for gracefully degrading functionality when services are unavailable.
 * Ensures the application remains functional even when optional features fail.
 */

import { logger } from '@/lib/logger';
import { getCircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';

/**
 * Execute with fallback
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  options?: { name?: string; logFailure?: boolean }
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (options?.logFailure) {
      logger.warn({
        event: 'fallback_triggered',
        name: options.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return typeof fallback === 'function' ? await fallback() : fallback;
  }
}

/**
 * Execute with circuit breaker and fallback
 */
export async function withCircuitBreakerAndFallback<T>(
  serviceName: string,
  operation: () => Promise<T>,
  fallback: () => Promise<T> | T
): Promise<T> {
  const breaker = getCircuitBreaker(serviceName);
  try {
    return await breaker.execute(operation);
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      logger.warn({ event: 'circuit_breaker_fallback', service: serviceName });
    }
    return typeof fallback === 'function' ? await fallback() : fallback;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
        logger.info({ event: 'retry_attempt', attempt: attempt + 1, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}

/**
 * Feature flag check
 */
export function isFeatureEnabled(featureName: string, defaultValue: boolean = false): boolean {
  if (typeof window === 'undefined') {
    const envPrefix = 'NEXT_PUBLIC_FEATURE_';
    const envKey = envPrefix + featureName.toUpperCase();
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      return envValue === 'true' || envValue === '1';
    }
    return defaultValue;
  }
  try {
    const storageKey = 'feature_' + featureName;
    const override = localStorage.getItem(storageKey);
    if (override !== null) return override === 'true';
  } catch {}
  return defaultValue;
}

/**
 * Graceful timeout with fallback
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([operation(), timeoutPromise]);
}
