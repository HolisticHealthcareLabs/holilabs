/**
 * k-Anonymity Checker
 * Prevents statistical re-identification by ensuring minimum group sizes
 *
 * COMPLIANCE:
 * - HIPAA Safe Harbor Alternative: Expert Determination
 * - GDPR Article 32: State-of-the-art security
 * - Prevents "uniqueness attacks" on de-identified data
 *
 * THEORY:
 * k-anonymity ensures that each record is indistinguishable from at least k-1 other records
 * when considering quasi-identifiers (age, gender, zip code, etc.)
 */

export interface KAnonymityConfig {
  k: number; // Minimum group size (typically 5-10)
  quasiIdentifiers: string[]; // Fields that could be used for re-identification
  suppressThreshold?: number; // If group size < this, suppress the group entirely
}

export interface KAnonymityResult {
  isKAnonymous: boolean;
  k: number;
  violations: KAnonymityViolation[];
  statistics: {
    totalRecords: number;
    totalGroups: number;
    smallestGroup: number;
    largestGroup: number;
    averageGroupSize: number;
    groupsBelowK: number;
  };
  recommendations: string[];
}

export interface KAnonymityViolation {
  quasiIdentifierValues: Record<string, any>;
  groupSize: number;
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recommendation: string;
}

/**
 * Check if a dataset satisfies k-anonymity
 *
 * @param records - Array of data records to check
 * @param config - k-anonymity configuration
 * @returns Analysis results with violations
 */
export function checkKAnonymity<T extends Record<string, any>>(
  records: T[],
  config: KAnonymityConfig
): KAnonymityResult {
  const { k, quasiIdentifiers } = config;

  if (records.length === 0) {
    return {
      isKAnonymous: true,
      k,
      violations: [],
      statistics: {
        totalRecords: 0,
        totalGroups: 0,
        smallestGroup: 0,
        largestGroup: 0,
        averageGroupSize: 0,
        groupsBelowK: 0,
      },
      recommendations: [],
    };
  }

  // Group records by quasi-identifier values
  const groups = groupByQuasiIdentifiers(records, quasiIdentifiers);

  // Analyze each group
  const violations: KAnonymityViolation[] = [];
  let smallestGroup = Infinity;
  let largestGroup = 0;
  let totalGroupSize = 0;
  let groupsBelowK = 0;

  for (const [key, groupRecords] of Object.entries(groups)) {
    const groupSize = groupRecords.length;
    totalGroupSize += groupSize;

    if (groupSize < smallestGroup) smallestGroup = groupSize;
    if (groupSize > largestGroup) largestGroup = groupSize;

    // Check if group satisfies k-anonymity
    if (groupSize < k) {
      groupsBelowK++;

      // Parse quasi-identifier values from group key
      const quasiIdentifierValues = parseGroupKey(key, quasiIdentifiers);

      // Determine risk level
      let risk: 'CRITICAL' | 'HIGH' | 'MEDIUM';
      if (groupSize === 1) {
        risk = 'CRITICAL';
      } else if (groupSize === 2) {
        risk = 'HIGH';
      } else {
        risk = 'MEDIUM';
      }

      violations.push({
        quasiIdentifierValues,
        groupSize,
        risk,
        recommendation: generateRecommendation(quasiIdentifierValues, groupSize, k),
      });
    }
  }

  // Calculate statistics
  const totalGroups = Object.keys(groups).length;
  const averageGroupSize = totalGroupSize / totalGroups;

  // Generate recommendations
  const recommendations = generateGlobalRecommendations(
    violations,
    records.length,
    k,
    quasiIdentifiers
  );

  return {
    isKAnonymous: violations.length === 0,
    k,
    violations,
    statistics: {
      totalRecords: records.length,
      totalGroups,
      smallestGroup: smallestGroup === Infinity ? 0 : smallestGroup,
      largestGroup,
      averageGroupSize: Math.round(averageGroupSize * 10) / 10,
      groupsBelowK,
    },
    recommendations,
  };
}

/**
 * Group records by their quasi-identifier values
 */
function groupByQuasiIdentifiers<T extends Record<string, any>>(
  records: T[],
  quasiIdentifiers: string[]
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  for (const record of records) {
    // Create a composite key from all quasi-identifiers
    const keyParts = quasiIdentifiers.map((qi) => {
      const value = record[qi];
      return value !== null && value !== undefined ? String(value) : 'NULL';
    });
    const key = keyParts.join('|');

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(record);
  }

  return groups;
}

/**
 * Parse group key back into quasi-identifier values
 */
function parseGroupKey(
  key: string,
  quasiIdentifiers: string[]
): Record<string, any> {
  const values = key.split('|');
  const result: Record<string, any> = {};

  quasiIdentifiers.forEach((qi, index) => {
    result[qi] = values[index] === 'NULL' ? null : values[index];
  });

  return result;
}

/**
 * Generate recommendation for a specific violation
 */
function generateRecommendation(
  quasiIdentifierValues: Record<string, any>,
  groupSize: number,
  k: number
): string {
  const deficit = k - groupSize;

  if (groupSize === 1) {
    return `CRITICAL: This record is unique and can be re-identified. ` +
      `Consider: (1) Generalizing quasi-identifiers further (e.g., wider age bands), ` +
      `(2) Suppressing this record entirely, or ` +
      `(3) Combining with ${deficit} similar records.`;
  }

  if (groupSize === 2) {
    return `HIGH RISK: Only ${groupSize} records share these quasi-identifiers. ` +
      `Need ${deficit} more records to achieve ${k}-anonymity. ` +
      `Consider: (1) Broader generalization (e.g., age band 30-40 → 30-50), ` +
      `(2) Geographic generalization (ZIP → State), or ` +
      `(3) Temporal generalization (date → quarter/year).`;
  }

  return `MEDIUM RISK: Group size is ${groupSize}, below k=${k}. ` +
    `Need ${deficit} more records. Consider generalizing attributes: ${Object.keys(quasiIdentifierValues).join(', ')}.`;
}

/**
 * Generate global recommendations based on all violations
 */
function generateGlobalRecommendations(
  violations: KAnonymityViolation[],
  totalRecords: number,
  k: number,
  quasiIdentifiers: string[]
): string[] {
  if (violations.length === 0) {
    return [`✅ Dataset satisfies ${k}-anonymity. Safe to release.`];
  }

  const recommendations: string[] = [];

  const criticalCount = violations.filter((v) => v.risk === 'CRITICAL').length;
  const highCount = violations.filter((v) => v.risk === 'HIGH').length;

  // Overall status
  recommendations.push(
    `⚠️  ${violations.length} groups violate ${k}-anonymity (${criticalCount} critical, ${highCount} high risk).`
  );

  // Calculate suppression impact
  const suppressedRecords = violations.reduce((sum, v) => sum + v.groupSize, 0);
  const suppressionPercentage = ((suppressedRecords / totalRecords) * 100).toFixed(1);

  recommendations.push(
    `Option 1: Suppress ${suppressedRecords} records (${suppressionPercentage}% of dataset) to achieve ${k}-anonymity.`
  );

  // Generalization suggestions
  const quasiIdentifierCounts: Record<string, number> = {};
  violations.forEach((v) => {
    Object.keys(v.quasiIdentifierValues).forEach((qi) => {
      quasiIdentifierCounts[qi] = (quasiIdentifierCounts[qi] || 0) + 1;
    });
  });

  const mostProblematicQI = Object.entries(quasiIdentifierCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (mostProblematicQI) {
    recommendations.push(
      `Option 2: Generalize '${mostProblematicQI[0]}' further (appears in ${mostProblematicQI[1]} violations).`
    );
  }

  // Increase k suggestion
  if (criticalCount === 0 && highCount < violations.length * 0.1) {
    recommendations.push(
      `Option 3: Reduce k from ${k} to ${Math.max(2, k - 1)} if acceptable for your use case.`
    );
  }

  // Data collection suggestion
  if (parseFloat(suppressionPercentage) > 20) {
    recommendations.push(
      `Consider: Collect more data to increase group sizes naturally.`
    );
  }

  return recommendations;
}

/**
 * Apply k-anonymity by suppressing records that violate it
 *
 * @param records - Array of records
 * @param config - k-anonymity configuration
 * @returns Filtered records that satisfy k-anonymity
 */
export function applyKAnonymity<T extends Record<string, any>>(
  records: T[],
  config: KAnonymityConfig
): { kAnonymousRecords: T[]; suppressedCount: number } {
  const groups = groupByQuasiIdentifiers(records, config.quasiIdentifiers);

  const kAnonymousRecords: T[] = [];
  let suppressedCount = 0;

  for (const groupRecords of Object.values(groups)) {
    if (groupRecords.length >= config.k) {
      // Group satisfies k-anonymity, include all records
      kAnonymousRecords.push(...groupRecords);
    } else {
      // Group violates k-anonymity, suppress these records
      suppressedCount += groupRecords.length;
    }
  }

  return {
    kAnonymousRecords,
    suppressedCount,
  };
}

/**
 * Suggest optimal k value based on dataset characteristics
 *
 * @param recordCount - Total number of records
 * @param sensitivityLevel - 'HIGH' | 'MEDIUM' | 'LOW'
 * @returns Recommended k value
 */
export function suggestKValue(
  recordCount: number,
  sensitivityLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
): number {
  // Industry standards:
  // - HIPAA: k >= 5 recommended
  // - Research: k >= 5-10
  // - High sensitivity: k >= 10-20

  if (sensitivityLevel === 'HIGH') {
    // High sensitivity (e.g., rare diseases, genetic data)
    return recordCount < 100 ? 10 : recordCount < 1000 ? 15 : 20;
  }

  if (sensitivityLevel === 'LOW') {
    // Low sensitivity (e.g., general demographics)
    return recordCount < 50 ? 3 : 5;
  }

  // Medium sensitivity (default)
  return recordCount < 50 ? 3 : recordCount < 500 ? 5 : 10;
}
