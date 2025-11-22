/**
 * Differential Privacy Implementation
 * Provides mathematically provable privacy guarantees through calibrated noise
 */
/**
 * Apply differential privacy to a count query
 * Adds Laplace noise calibrated to sensitivity and epsilon
 *
 * @param value True count value
 * @param epsilon Privacy parameter (smaller = more private, typical: 0.1 to 1.0)
 * @param sensitivity Query sensitivity (default: 1 for counts)
 * @returns Noisy count (rounded to integer)
 */
export declare function dpCount(value: number, epsilon: number, sensitivity?: number): number;
/**
 * Apply differential privacy to histogram/frequency counts
 * Adds independent Laplace noise to each bin
 *
 * @param counts Object mapping categories to counts
 * @param epsilon Privacy parameter (divided among all bins)
 * @param sensitivity Query sensitivity (default: 1)
 * @returns Noisy histogram with same keys
 */
export declare function dpHistogram(counts: Record<string, number>, epsilon: number, sensitivity?: number): Record<string, number>;
/**
 * Apply differential privacy to a sum query
 *
 * @param value True sum
 * @param epsilon Privacy parameter
 * @param sensitivity Maximum contribution per individual
 * @returns Noisy sum
 */
export declare function dpSum(value: number, epsilon: number, sensitivity: number): number;
/**
 * Apply differential privacy to an average query
 *
 * @param sum True sum
 * @param count True count
 * @param epsilon Privacy parameter (split between sum and count)
 * @param sensitivity Maximum value per individual
 * @returns Noisy average
 */
export declare function dpAverage(sum: number, count: number, epsilon: number, sensitivity: number): number;
/**
 * Calculate composition of multiple DP queries
 * Under basic composition, privacy budgets add up
 *
 * @param epsilons Array of epsilon values used
 * @returns Total epsilon consumed
 */
export declare function composeEpsilon(epsilons: number[]): number;
//# sourceMappingURL=differential-privacy.d.ts.map