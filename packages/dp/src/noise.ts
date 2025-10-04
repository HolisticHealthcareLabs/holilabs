import { randomBytes } from 'crypto';
import { DPParameters, DPResult } from './types';

/**
 * Add Laplace noise for differential privacy
 * Used for queries with L1 sensitivity
 */
export function laplaceNoise(
  value: number,
  epsilon: number,
  sensitivity: number = 1
): number {
  const scale = sensitivity / epsilon;
  const u = Math.random() - 0.5;
  const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  return value + noise;
}

/**
 * Add Gaussian noise for differential privacy
 * Used for queries with L2 sensitivity and (ε,δ)-DP
 */
export function gaussianNoise(
  value: number,
  epsilon: number,
  delta: number,
  sensitivity: number = 1
): number {
  // Calculate sigma for Gaussian mechanism
  const sigma = (sensitivity * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon;

  // Box-Muller transform for Gaussian random
  const u1 = Math.random();
  const u2 = Math.random();
  const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;

  return value + noise;
}

/**
 * Apply differential privacy to a dataset export
 */
export function applyDPToExport(
  dataset: any,
  parameters: DPParameters
): DPResult {
  // For MVP: apply noise to numeric aggregates
  // In production: implement query-specific DP mechanisms

  function addNoiseToValues(data: any): any {
    if (typeof data === 'number') {
      if (parameters.mechanism === 'laplace') {
        return laplaceNoise(data, parameters.epsilon);
      } else {
        return gaussianNoise(data, parameters.epsilon, parameters.delta);
      }
    }

    if (Array.isArray(data)) {
      return data.map(addNoiseToValues);
    }

    if (typeof data === 'object' && data !== null) {
      const noisyObj: any = {};
      for (const key in data) {
        // Only add noise to numeric fields that look like aggregates
        if (isAggregateField(key) && typeof data[key] === 'number') {
          noisyObj[key] = addNoiseToValues(data[key]);
        } else {
          noisyObj[key] = data[key];
        }
      }
      return noisyObj;
    }

    return data;
  }

  const noisyData = addNoiseToValues(dataset);

  return {
    data: noisyData,
    parameters,
    noiseAdded: true,
  };
}

/**
 * Detect if a field is an aggregate that should have noise added
 */
function isAggregateField(fieldName: string): boolean {
  const aggregatePatterns = [
    'count', 'sum', 'avg', 'mean', 'total', 'average',
    'min', 'max', 'median', 'percentile',
  ];

  const normalized = fieldName.toLowerCase();
  return aggregatePatterns.some((pattern) => normalized.includes(pattern));
}

/**
 * Validate epsilon and delta parameters
 */
export function validateDPParameters(epsilon: number, delta: number): boolean {
  // Typical bounds for DP parameters
  return epsilon > 0 && epsilon <= 10 && delta > 0 && delta <= 0.01;
}

/**
 * Compose epsilon under sequential composition
 */
export function composeEpsilonSequential(epsilons: number[]): number {
  return epsilons.reduce((sum, eps) => sum + eps, 0);
}

/**
 * Compose epsilon under advanced composition (tighter bound)
 */
export function composeEpsilonAdvanced(
  epsilons: number[],
  delta: number
): number {
  const k = epsilons.length;
  const maxEps = Math.max(...epsilons);

  // Advanced composition theorem
  const composed =
    maxEps * Math.sqrt(2 * k * Math.log(1 / delta)) + k * maxEps * (Math.exp(maxEps) - 1);

  return Math.min(composed, composeEpsilonSequential(epsilons));
}
