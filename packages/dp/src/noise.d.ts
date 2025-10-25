import { DPParameters, DPResult } from './types';
/**
 * Add Laplace noise for differential privacy
 * Used for queries with L1 sensitivity
 */
export declare function laplaceNoise(value: number, epsilon: number, sensitivity?: number): number;
/**
 * Add Gaussian noise for differential privacy
 * Used for queries with L2 sensitivity and (ε,δ)-DP
 */
export declare function gaussianNoise(value: number, epsilon: number, delta: number, sensitivity?: number): number;
/**
 * Apply differential privacy to a dataset export
 */
export declare function applyDPToExport(dataset: any, parameters: DPParameters): DPResult;
/**
 * Validate epsilon and delta parameters
 */
export declare function validateDPParameters(epsilon: number, delta: number): boolean;
/**
 * Compose epsilon under sequential composition
 */
export declare function composeEpsilonSequential(epsilons: number[]): number;
/**
 * Compose epsilon under advanced composition (tighter bound)
 */
export declare function composeEpsilonAdvanced(epsilons: number[], delta: number): number;
//# sourceMappingURL=noise.d.ts.map