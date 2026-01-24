/**
 * Circuit Breaker for AI Calls
 *
 * Prevents cascading failures when AI providers experience issues.
 * Implements the Circuit Breaker pattern with three states:
 *
 * CLOSED (normal): Requests flow through
 * OPEN (failed): Requests immediately fail (fast-fail)
 * HALF_OPEN (testing): Allow one request to test recovery
 *
 * Thresholds (configurable):
 * - Failure threshold: 5 failures → open circuit
 * - Recovery timeout: 30 seconds before half-open
 * - Success threshold: 2 successes in half-open → close circuit
 */

import logger from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Milliseconds to wait before trying again (half-open) */
  recoveryTimeoutMs: number;
  /** Number of successes in half-open to close circuit */
  successThreshold: number;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Name for logging */
  name: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  isAvailable: boolean;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 consecutive failures
  recoveryTimeoutMs: 30_000, // 30 seconds before half-open
  successThreshold: 2, // 2 successes to close
  requestTimeoutMs: 15_000, // 15 second request timeout
  name: 'ai-provider',
};

// ═══════════════════════════════════════════════════════════════
// CIRCUIT BREAKER CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Circuit Breaker implementation for AI provider calls
 *
 * @example
 * const claudeBreaker = new CircuitBreaker({ name: 'claude' });
 *
 * try {
 *   const result = await claudeBreaker.execute(() => callClaude(prompt));
 * } catch (error) {
 *   if (error instanceof CircuitOpenError) {
 *     // Circuit is open, use fallback immediately
 *     return fallbackResult;
 *   }
 *   throw error;
 * }
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws CircuitOpenError if circuit is open
   * @throws Original error if function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit allows request
    if (!this.isAvailable()) {
      logger.warn({
        event: 'circuit_breaker_rejected',
        name: this.config.name,
        state: this.state,
        failures: this.failures,
      });
      throw new CircuitOpenError(this.config.name, this.state);
    }

    // If half-open, we're testing recovery
    const isTestRequest = this.state === 'HALF_OPEN';

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.recordSuccess(isTestRequest);
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with configurable timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new CircuitTimeoutError(this.config.name, this.config.requestTimeoutMs));
      }, this.config.requestTimeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * Record a successful request
   */
  private recordSuccess(isTestRequest: boolean): void {
    this.successes++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.failures = 0; // Reset consecutive failures

    if (this.state === 'HALF_OPEN') {
      // In half-open, check if we should close
      if (this.successes >= this.config.successThreshold) {
        this.close();
      }
    }

    logger.debug({
      event: 'circuit_breaker_success',
      name: this.config.name,
      state: this.state,
      isTestRequest,
      consecutiveSuccesses: this.successes,
    });
  }

  /**
   * Record a failed request
   */
  private recordFailure(error: unknown): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.successes = 0; // Reset consecutive successes

    logger.warn({
      event: 'circuit_breaker_failure',
      name: this.config.name,
      state: this.state,
      consecutiveFailures: this.failures,
      error: error instanceof Error ? error.message : String(error),
    });

    // Check if we should open the circuit
    if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
      this.open();
    } else if (this.state === 'HALF_OPEN') {
      // Failed during test - go back to open
      this.open();
    }
  }

  /**
   * Check if circuit allows requests
   */
  isAvailable(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      const now = Date.now();
      const timeSinceFailure = now - (this.lastFailureTime || 0);

      if (timeSinceFailure >= this.config.recoveryTimeoutMs) {
        // Transition to half-open
        this.halfOpen();
        return true;
      }

      return false;
    }

    // HALF_OPEN - allow one request at a time
    return true;
  }

  /**
   * Open the circuit (stop accepting requests)
   */
  private open(): void {
    const previousState = this.state;
    this.state = 'OPEN';

    logger.error({
      event: 'circuit_breaker_opened',
      name: this.config.name,
      previousState,
      failures: this.failures,
      recoveryTimeoutMs: this.config.recoveryTimeoutMs,
    });
  }

  /**
   * Transition to half-open (testing recovery)
   */
  private halfOpen(): void {
    const previousState = this.state;
    this.state = 'HALF_OPEN';
    this.successes = 0; // Reset for threshold check

    logger.info({
      event: 'circuit_breaker_half_open',
      name: this.config.name,
      previousState,
    });
  }

  /**
   * Close the circuit (resume normal operation)
   */
  private close(): void {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;

    logger.info({
      event: 'circuit_breaker_closed',
      name: this.config.name,
      previousState,
    });
  }

  /**
   * Get current circuit stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      isAvailable: this.isAvailable(),
    };
  }

  /**
   * Manually reset the circuit (for admin/testing)
   */
  reset(): void {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;

    logger.info({
      event: 'circuit_breaker_manual_reset',
      name: this.config.name,
      previousState,
    });
  }

  /**
   * Get the current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR CLASSES
// ═══════════════════════════════════════════════════════════════

/**
 * Error thrown when circuit is open and request is rejected
 */
export class CircuitOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly circuitState: CircuitState
  ) {
    super(`Circuit breaker '${circuitName}' is ${circuitState} - request rejected`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Error thrown when request times out
 */
export class CircuitTimeoutError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly timeoutMs: number
  ) {
    super(`Circuit breaker '${circuitName}' request timed out after ${timeoutMs}ms`);
    this.name = 'CircuitTimeoutError';
  }
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER-SPECIFIC CIRCUIT BREAKERS
// ═══════════════════════════════════════════════════════════════

/**
 * Circuit breakers for each AI provider
 * Shared across the application (singleton pattern)
 */
export const circuitBreakers = {
  claude: new CircuitBreaker({
    name: 'claude',
    failureThreshold: 5,
    recoveryTimeoutMs: 30_000,
    requestTimeoutMs: 30_000, // Claude can be slow for complex prompts
  }),

  gemini: new CircuitBreaker({
    name: 'gemini',
    failureThreshold: 5,
    recoveryTimeoutMs: 30_000,
    requestTimeoutMs: 15_000, // Gemini Flash is fast
  }),

  ollama: new CircuitBreaker({
    name: 'ollama',
    failureThreshold: 3, // Local, less reliable
    recoveryTimeoutMs: 10_000, // Faster recovery for local
    requestTimeoutMs: 60_000, // Local models can be slow
  }),

  together: new CircuitBreaker({
    name: 'together',
    failureThreshold: 5,
    recoveryTimeoutMs: 30_000,
    requestTimeoutMs: 20_000,
  }),

  vllm: new CircuitBreaker({
    name: 'vllm',
    failureThreshold: 3,
    recoveryTimeoutMs: 15_000,
    requestTimeoutMs: 30_000,
  }),
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get stats for all circuit breakers
 */
export function getAllCircuitStats(): Record<string, CircuitBreakerStats> {
  return Object.fromEntries(
    Object.entries(circuitBreakers).map(([name, breaker]) => [name, breaker.getStats()])
  );
}

/**
 * Check if any circuit breaker is open (system health check)
 */
export function hasOpenCircuits(): boolean {
  return Object.values(circuitBreakers).some((breaker) => breaker.getState() === 'OPEN');
}

/**
 * Reset all circuit breakers (admin function)
 */
export function resetAllCircuits(): void {
  for (const breaker of Object.values(circuitBreakers)) {
    breaker.reset();
  }
  logger.info({ event: 'all_circuits_reset' });
}

/**
 * Wrapper function to execute with circuit breaker by provider name
 */
export async function withCircuitBreaker<T>(
  provider: keyof typeof circuitBreakers,
  fn: () => Promise<T>
): Promise<T> {
  const breaker = circuitBreakers[provider];
  if (!breaker) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return breaker.execute(fn);
}
