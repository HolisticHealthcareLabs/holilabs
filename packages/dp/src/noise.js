"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laplaceNoise = laplaceNoise;
exports.gaussianNoise = gaussianNoise;
exports.applyDPToExport = applyDPToExport;
exports.validateDPParameters = validateDPParameters;
exports.composeEpsilonSequential = composeEpsilonSequential;
exports.composeEpsilonAdvanced = composeEpsilonAdvanced;
/**
 * Add Laplace noise for differential privacy
 * Used for queries with L1 sensitivity
 */
function laplaceNoise(value, epsilon, sensitivity = 1) {
    const scale = sensitivity / epsilon;
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    return value + noise;
}
/**
 * Add Gaussian noise for differential privacy
 * Used for queries with L2 sensitivity and (ε,δ)-DP
 */
function gaussianNoise(value, epsilon, delta, sensitivity = 1) {
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
function applyDPToExport(dataset, parameters) {
    // For MVP: apply noise to numeric aggregates
    // In production: implement query-specific DP mechanisms
    function addNoiseToValues(data) {
        if (typeof data === 'number') {
            if (parameters.mechanism === 'laplace') {
                return laplaceNoise(data, parameters.epsilon);
            }
            else {
                return gaussianNoise(data, parameters.epsilon, parameters.delta);
            }
        }
        if (Array.isArray(data)) {
            return data.map(addNoiseToValues);
        }
        if (typeof data === 'object' && data !== null) {
            const noisyObj = {};
            for (const key in data) {
                // Only add noise to numeric fields that look like aggregates
                if (isAggregateField(key) && typeof data[key] === 'number') {
                    noisyObj[key] = addNoiseToValues(data[key]);
                }
                else {
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
function isAggregateField(fieldName) {
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
function validateDPParameters(epsilon, delta) {
    // Typical bounds for DP parameters
    return epsilon > 0 && epsilon <= 10 && delta > 0 && delta <= 0.01;
}
/**
 * Compose epsilon under sequential composition
 */
function composeEpsilonSequential(epsilons) {
    return epsilons.reduce((sum, eps) => sum + eps, 0);
}
/**
 * Compose epsilon under advanced composition (tighter bound)
 */
function composeEpsilonAdvanced(epsilons, delta) {
    const k = epsilons.length;
    const maxEps = Math.max(...epsilons);
    // Advanced composition theorem
    const composed = maxEps * Math.sqrt(2 * k * Math.log(1 / delta)) + k * maxEps * (Math.exp(maxEps) - 1);
    return Math.min(composed, composeEpsilonSequential(epsilons));
}
//# sourceMappingURL=noise.js.map