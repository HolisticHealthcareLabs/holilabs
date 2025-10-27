/**
 * Differential Privacy Implementation
 * Adds calibrated noise to query results to prevent statistical re-identification
 *
 * THEORY:
 * Differential privacy ensures that the presence or absence of any single individual
 * in a dataset does not significantly affect the output of any analysis.
 *
 * PRIVACY BUDGET (ε):
 * - ε < 0.1: Very strong privacy (high noise)
 * - ε = 0.1-1.0: Strong privacy (moderate noise)
 * - ε = 1.0-10: Weak privacy (low noise)
 * - ε > 10: Very weak privacy (minimal noise)
 *
 * COMPLIANCE:
 * - GDPR Article 32: State-of-the-art technical measures
 * - HIPAA Expert Determination: Statistical de-identification
 * - Research standard for privacy-preserving analytics
 */

export interface DPConfig {
  epsilon: number; // Privacy budget (lower = more privacy, less utility)
  delta?: number; // Probability of privacy breach (typically 1/n²)
  sensitivity: number; // Maximum impact of single record on result
  mechanism: 'LAPLACE' | 'GAUSSIAN';
}

export interface DPResult<T = number> {
  noisyValue: T;
  originalValue: T;
  noise: number;
  epsilon: number;
  delta?: number;
}

/**
 * Add Laplace noise to a numeric value
 * Used for count queries, sums, and other numeric results
 *
 * @param value - Original value
 * @param config - Differential privacy configuration
 * @returns Noisy value with metadata
 */
export function addLaplaceNoise(
  value: number,
  config: DPConfig
): DPResult<number> {
  const { epsilon, sensitivity } = config;

  // Laplace distribution scale parameter
  const scale = sensitivity / epsilon;

  // Generate Laplace noise
  const noise = sampleLaplace(scale);

  // Add noise to value
  const noisyValue = Math.round(value + noise);

  return {
    noisyValue: Math.max(0, noisyValue), // Ensure non-negative for counts
    originalValue: value,
    noise,
    epsilon,
  };
}

/**
 * Add Gaussian noise to a numeric value
 * Used when composition of multiple queries is needed
 *
 * @param value - Original value
 * @param config - Differential privacy configuration
 * @returns Noisy value with metadata
 */
export function addGaussianNoise(
  value: number,
  config: DPConfig
): DPResult<number> {
  const { epsilon, delta = 1e-5, sensitivity } = config;

  // Gaussian distribution standard deviation
  const sigma = (sensitivity * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon;

  // Generate Gaussian noise
  const noise = sampleGaussian(0, sigma);

  // Add noise to value
  const noisyValue = Math.round(value + noise);

  return {
    noisyValue: Math.max(0, noisyValue),
    originalValue: value,
    noise,
    epsilon,
    delta,
  };
}

/**
 * Add differential privacy to count query
 *
 * @param count - Original count
 * @param epsilon - Privacy budget
 * @returns Noisy count
 */
export function dpCount(count: number, epsilon: number = 0.1): DPResult<number> {
  return addLaplaceNoise(count, {
    epsilon,
    sensitivity: 1, // Adding/removing one record changes count by 1
    mechanism: 'LAPLACE',
  });
}

/**
 * Add differential privacy to sum query
 *
 * @param sum - Original sum
 * @param maxContribution - Maximum value any single record can contribute
 * @param epsilon - Privacy budget
 * @returns Noisy sum
 */
export function dpSum(
  sum: number,
  maxContribution: number,
  epsilon: number = 0.1
): DPResult<number> {
  return addLaplaceNoise(sum, {
    epsilon,
    sensitivity: maxContribution, // Max impact of one record
    mechanism: 'LAPLACE',
  });
}

/**
 * Add differential privacy to mean/average query
 *
 * @param mean - Original mean
 * @param count - Number of records
 * @param minValue - Minimum possible value
 * @param maxValue - Maximum possible value
 * @param epsilon - Privacy budget
 * @returns Noisy mean
 */
export function dpMean(
  mean: number,
  count: number,
  minValue: number,
  maxValue: number,
  epsilon: number = 0.1
): DPResult<number> {
  const range = maxValue - minValue;
  const sensitivity = range / count;

  const result = addLaplaceNoise(mean, {
    epsilon,
    sensitivity,
    mechanism: 'LAPLACE',
  });

  return {
    ...result,
    noisyValue: Math.max(minValue, Math.min(maxValue, result.noisyValue)),
  };
}

/**
 * Add differential privacy to histogram/frequency distribution
 *
 * @param histogram - Object with category counts
 * @param epsilon - Privacy budget
 * @returns Noisy histogram
 */
export function dpHistogram<T extends string | number>(
  histogram: Record<T, number>,
  epsilon: number = 0.1
): DPResult<Record<T, number>> {
  const categories = Object.keys(histogram) as T[];
  const noisyHistogram = {} as Record<T, number>;

  // Divide privacy budget among all categories
  const epsilonPerCategory = epsilon / categories.length;

  for (const category of categories) {
    const count = histogram[category];
    const result = addLaplaceNoise(count, {
      epsilon: epsilonPerCategory,
      sensitivity: 1,
      mechanism: 'LAPLACE',
    });
    noisyHistogram[category] = result.noisyValue;
  }

  return {
    noisyValue: noisyHistogram,
    originalValue: histogram,
    noise: 0, // Composite noise
    epsilon,
  };
}

/**
 * Privacy budget tracker
 * Ensures total epsilon doesn't exceed threshold
 */
export class PrivacyBudgetTracker {
  private budgets: Map<string, number> = new Map();
  private maxEpsilon: number;

  constructor(maxEpsilon: number = 1.0) {
    this.maxEpsilon = maxEpsilon;
  }

  /**
   * Check if a query can be executed without exceeding budget
   *
   * @param queryId - Unique identifier for the query/dataset
   * @param epsilon - Privacy budget required for this query
   * @returns Whether the query is allowed
   */
  canExecuteQuery(queryId: string, epsilon: number): boolean {
    const currentBudget = this.budgets.get(queryId) || 0;
    return currentBudget + epsilon <= this.maxEpsilon;
  }

  /**
   * Consume privacy budget for a query
   *
   * @param queryId - Unique identifier for the query/dataset
   * @param epsilon - Privacy budget consumed
   * @throws Error if budget exceeded
   */
  consumeBudget(queryId: string, epsilon: number): void {
    if (!this.canExecuteQuery(queryId, epsilon)) {
      const currentBudget = this.budgets.get(queryId) || 0;
      throw new Error(
        `Privacy budget exceeded for query ${queryId}. ` +
        `Current: ${currentBudget}, Requested: ${epsilon}, Max: ${this.maxEpsilon}`
      );
    }

    const currentBudget = this.budgets.get(queryId) || 0;
    this.budgets.set(queryId, currentBudget + epsilon);
  }

  /**
   * Get remaining privacy budget
   *
   * @param queryId - Unique identifier for the query/dataset
   * @returns Remaining epsilon
   */
  getRemainingBudget(queryId: string): number {
    const currentBudget = this.budgets.get(queryId) || 0;
    return this.maxEpsilon - currentBudget;
  }

  /**
   * Reset privacy budget (e.g., after cooldown period)
   *
   * @param queryId - Unique identifier for the query/dataset
   */
  resetBudget(queryId: string): void {
    this.budgets.delete(queryId);
  }

  /**
   * Get all tracked queries and their budgets
   */
  getAllBudgets(): Map<string, number> {
    return new Map(this.budgets);
  }
}

/**
 * Sample from Laplace distribution
 * Laplace(0, b) where b is scale parameter
 */
function sampleLaplace(scale: number): number {
  // Use inverse transform sampling
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Sample from Gaussian distribution using Box-Muller transform
 * Normal(mean, sigma)
 */
function sampleGaussian(mean: number, sigma: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();

  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sigma * z0;
}

/**
 * Calculate optimal epsilon for given privacy/utility tradeoff
 *
 * @param recordCount - Number of records in dataset
 * @param privacyLevel - 'HIGH' | 'MEDIUM' | 'LOW'
 * @returns Recommended epsilon value
 */
export function calculateOptimalEpsilon(
  recordCount: number,
  privacyLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
): number {
  // Industry guidelines:
  // - High privacy: ε ≤ 0.1
  // - Medium privacy: ε = 0.1-1.0
  // - Low privacy: ε = 1.0-10.0

  if (privacyLevel === 'HIGH') {
    return recordCount < 100 ? 0.01 : recordCount < 1000 ? 0.05 : 0.1;
  }

  if (privacyLevel === 'LOW') {
    return recordCount < 100 ? 1.0 : recordCount < 1000 ? 5.0 : 10.0;
  }

  // Medium privacy (default)
  return recordCount < 100 ? 0.1 : recordCount < 1000 ? 0.5 : 1.0;
}

/**
 * Calculate noise magnitude for a given epsilon
 * Helps understand expected noise level
 *
 * @param epsilon - Privacy budget
 * @param sensitivity - Query sensitivity
 * @param percentile - Which percentile of noise distribution (default 95%)
 * @returns Expected noise magnitude
 */
export function calculateExpectedNoise(
  epsilon: number,
  sensitivity: number = 1,
  percentile: number = 0.95
): number {
  // For Laplace distribution: noise magnitude at percentile p
  // is b * ln(2/(1-p)) where b = sensitivity/epsilon
  const scale = sensitivity / epsilon;
  return scale * Math.log(2 / (1 - percentile));
}

/**
 * Validate differential privacy configuration
 *
 * @param config - DP configuration
 * @returns Validation errors (empty if valid)
 */
export function validateDPConfig(config: DPConfig): string[] {
  const errors: string[] = [];

  if (config.epsilon <= 0) {
    errors.push('Epsilon must be positive');
  }

  if (config.epsilon > 10) {
    errors.push('WARNING: Epsilon > 10 provides very weak privacy');
  }

  if (config.delta !== undefined && config.delta >= 0.01) {
    errors.push('Delta should be < 0.01 (typically 1/n²)');
  }

  if (config.sensitivity <= 0) {
    errors.push('Sensitivity must be positive');
  }

  if (config.mechanism === 'GAUSSIAN' && !config.delta) {
    errors.push('Gaussian mechanism requires delta parameter');
  }

  return errors;
}
