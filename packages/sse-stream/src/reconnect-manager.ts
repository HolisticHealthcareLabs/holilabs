import { ReconnectStats } from './types';

/**
 * ReconnectManager implements exponential backoff with jitter for SSE reconnections
 * Uses AWS-style full jitter algorithm for optimal reconnection behavior
 * QUINN invariant: reconnection failures are logged, never thrown
 */
export class ReconnectManager {
  private attemptCount: number = 0;
  private lastResetAt?: string;
  private totalAttemptsSum: number = 0;
  private stats: ReconnectStats = {
    totalAttempts: 0,
    successfulReconnects: 0,
    failedReconnects: 0,
    averageAttempts: 0
  };

  constructor(
    private maxReconnectAttempts: number = 10,
    private baseReconnectDelayMs: number = 1000,
    private maxReconnectDelayMs: number = 30000
  ) {}

  /**
   * Calculate the next reconnection delay using exponential backoff with full jitter
   * Formula: delay = random(0, min(baseDelay * 2^attempt, maxDelay))
   *
   * Full jitter provides better distribution and prevents thundering herd
   * Reference: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
   *
   * @param attempt The current reconnection attempt number (0-indexed)
   * @returns Delay in milliseconds before next reconnection attempt
   */
  public getNextDelay(attempt: number): number {
    if (attempt < 0) {
      attempt = 0;
    }

    // Calculate the upper bound: base * 2^attempt, capped at max
    const maxDelay = Math.min(
      this.baseReconnectDelayMs * Math.pow(2, attempt),
      this.maxReconnectDelayMs
    );

    // Full jitter: random delay between 0 and maxDelay
    return Math.floor(Math.random() * (maxDelay + 1));
  }

  /**
   * Determine if another reconnection attempt should be made
   * @param attempt The current attempt number (0-indexed)
   * @returns true if reconnection should be attempted, false if max attempts exceeded
   */
  public shouldReconnect(attempt: number): boolean {
    return attempt < this.maxReconnectAttempts;
  }

  /**
   * Reset the attempt counter on successful connection
   * QUINN: Track stats for observability
   */
  public reset(): void {
    if (this.attemptCount > 0) {
      this.stats.successfulReconnects++;
    }

    // Track cumulative attempts for average calculation
    this.totalAttemptsSum += this.attemptCount;
    this.stats.totalAttempts = this.totalAttemptsSum;

    // Average = total attempts / number of reconnections
    if (this.stats.successfulReconnects > 0) {
      this.stats.averageAttempts =
        this.totalAttemptsSum / this.stats.successfulReconnects;
    }

    this.attemptCount = 0;
    this.lastResetAt = new Date().toISOString();
  }

  /**
   * Record a failed reconnection attempt
   * QUINN: Log failures for debugging, never throw
   */
  public recordFailure(): void {
    this.stats.failedReconnects++;
    this.stats.lastAttemptAt = new Date().toISOString();
  }

  /**
   * Get current attempt counter
   * @returns Current attempt number
   */
  public getCurrentAttempt(): number {
    return this.attemptCount;
  }

  /**
   * Increment and get the next attempt number
   * @returns The next attempt number to use
   */
  public nextAttempt(): number {
    return this.attemptCount++;
  }

  /**
   * Get reconnection statistics
   * @returns Current stats for monitoring
   */
  public getStats(): ReconnectStats {
    return {
      ...this.stats,
      lastAttemptAt: this.stats.lastAttemptAt || this.lastResetAt
    };
  }

  /**
   * Check if we've hit the maximum reconnection attempts
   * @returns true if further reconnection attempts are unlikely
   */
  public isMaxAttemptsReached(): boolean {
    return this.attemptCount >= this.maxReconnectAttempts;
  }
}
