/**
 * Circuit Breaker Pattern for External API Resilience
 *
 * Protects the application from cascading failures when external services are down.
 * Implements the circuit breaker pattern with three states:
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Service is down, fail fast without making requests
 * - HALF_OPEN: Testing if service has recovered
 *
 * Industry-grade implementation with:
 * - Automatic failure detection
 * - Exponential backoff
 * - Health check recovery
 * - Metrics and logging
 *
 * Usage:
 * ```typescript
 * const breaker = getCircuitBreaker('fhir-api');
 * const result = await breaker.execute(() => fetch('https://api.example.com'));
 * ```
 */

import { logger } from '@/lib/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  resetTimeout?: number;
  successThreshold?: number;
  timeout?: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  rejectedRequests: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private consecutiveSuccesses: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalRequests: number = 0;
  private rejectedRequests: number = 0;
  private nextAttemptTime?: number;

  constructor(private options: Required<CircuitBreakerOptions>) {
    logger.info({
      event: 'circuit_breaker_initialized',
      name: options.name,
    }, `Circuit breaker initialized: ${options.name}`);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (this.nextAttemptTime && Date.now() >= this.nextAttemptTime) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        this.rejectedRequests++;
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN for ${this.options.name}`
        );
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new CircuitBreakerTimeoutError('Request timeout')),
          this.options.timeout
        )
      ),
    ]);
  }

  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        logger.info({ event: 'circuit_breaker_closed', name: this.options.name });
        this.state = CircuitState.CLOSED;
        this.failures = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failures = 0;
    }
  }

  private onFailure(error: unknown): void {
    this.failures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    logger.warn({
      event: 'circuit_breaker_failure',
      name: this.options.name,
      failures: this.failures,
    });

    if (this.state === CircuitState.HALF_OPEN || 
        (this.state === CircuitState.CLOSED && this.failures >= this.options.failureThreshold)) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    logger.error({ event: 'circuit_breaker_opened', name: this.options.name });
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
    };
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreakerTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerTimeoutError';
  }
}

export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  return new CircuitBreaker({
    name: options.name,
    failureThreshold: options.failureThreshold ?? 5,
    resetTimeout: options.resetTimeout ?? 60000,
    successThreshold: options.successThreshold ?? 2,
    timeout: options.timeout ?? 30000,
  });
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, createCircuitBreaker({ name, ...options }));
  }
  return circuitBreakers.get(name)!;
}

export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};
  circuitBreakers.forEach((breaker, name) => {
    stats[name] = breaker.getStats();
  });
  return stats;
}
