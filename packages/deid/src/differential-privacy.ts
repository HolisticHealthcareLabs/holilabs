/**
 * Differential Privacy Implementation
 * Provides mathematically provable privacy guarantees through calibrated noise
 */

/**
 * Generate Laplace noise with scale parameter b
 * Used for differential privacy mechanisms
 */
function generateLaplaceNoise(scale: number): number {
  // Generate uniform random in (-0.5, 0.5)
  const u = Math.random() - 0.5;
  
  // Laplace distribution: -b * sgn(u) * ln(1 - 2|u|)
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Apply differential privacy to a count query
 * Adds Laplace noise calibrated to sensitivity and epsilon
 * 
 * @param value True count value
 * @param epsilon Privacy parameter (smaller = more private, typical: 0.1 to 1.0)
 * @param sensitivity Query sensitivity (default: 1 for counts)
 * @returns Noisy count (rounded to integer)
 */
export function dpCount(
  value: number,
  epsilon: number,
  sensitivity: number = 1
): number {
  if (epsilon <= 0) {
    throw new Error('Epsilon must be positive');
  }

  // Scale parameter for Laplace mechanism
  const scale = sensitivity / epsilon;
  
  // Add Laplace noise
  const noise = generateLaplaceNoise(scale);
  const noisyValue = value + noise;
  
  // Return non-negative integer
  return Math.max(0, Math.round(noisyValue));
}

/**
 * Apply differential privacy to histogram/frequency counts
 * Adds independent Laplace noise to each bin
 * 
 * @param counts Object mapping categories to counts
 * @param epsilon Privacy parameter (divided among all bins)
 * @param sensitivity Query sensitivity (default: 1)
 * @returns Noisy histogram with same keys
 */
export function dpHistogram(
  counts: Record<string, number>,
  epsilon: number,
  sensitivity: number = 1
): Record<string, number> {
  if (epsilon <= 0) {
    throw new Error('Epsilon must be positive');
  }

  const result: Record<string, number> = {};
  const keys = Object.keys(counts);
  
  // Each bin gets equal share of privacy budget
  const epsilonPerBin = epsilon / keys.length;
  const scale = sensitivity / epsilonPerBin;

  for (const key of keys) {
    const noise = generateLaplaceNoise(scale);
    const noisyValue = counts[key] + noise;
    
    // Ensure non-negative
    result[key] = Math.max(0, Math.round(noisyValue));
  }

  return result;
}

/**
 * Apply differential privacy to a sum query
 * 
 * @param value True sum
 * @param epsilon Privacy parameter
 * @param sensitivity Maximum contribution per individual
 * @returns Noisy sum
 */
export function dpSum(
  value: number,
  epsilon: number,
  sensitivity: number
): number {
  if (epsilon <= 0) {
    throw new Error('Epsilon must be positive');
  }

  const scale = sensitivity / epsilon;
  const noise = generateLaplaceNoise(scale);
  
  return value + noise;
}

/**
 * Apply differential privacy to an average query
 * 
 * @param sum True sum
 * @param count True count
 * @param epsilon Privacy parameter (split between sum and count)
 * @param sensitivity Maximum value per individual
 * @returns Noisy average
 */
export function dpAverage(
  sum: number,
  count: number,
  epsilon: number,
  sensitivity: number
): number {
  if (epsilon <= 0) {
    throw new Error('Epsilon must be positive');
  }

  // Split privacy budget
  const epsilonSum = epsilon / 2;
  const epsilonCount = epsilon / 2;

  const noisySum = dpSum(sum, epsilonSum, sensitivity);
  const noisyCount = dpCount(count, epsilonCount, 1);

  // Avoid division by zero
  if (noisyCount === 0) {
    return 0;
  }

  return noisySum / noisyCount;
}

/**
 * Calculate composition of multiple DP queries
 * Under basic composition, privacy budgets add up
 * 
 * @param epsilons Array of epsilon values used
 * @returns Total epsilon consumed
 */
export function composeEpsilon(epsilons: number[]): number {
  return epsilons.reduce((sum, eps) => sum + eps, 0);
}
