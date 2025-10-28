/**
 * K-Anonymity Implementation
 * Ensures that each individual cannot be distinguished from at least k-1 other individuals
 * based on quasi-identifiers (age, zip code, diagnosis, etc.)
 */

export interface KAnonymityOptions {
  k: number;
  quasiIdentifiers: string[];
  suppressionValue?: string;
}

export interface KAnonymityResult {
  isAnonymous: boolean;
  k: number;
  violations: Array<{
    combination: Record<string, any>;
    count: number;
  }>;
}

/**
 * Check if dataset meets k-anonymity requirement
 */
export function checkKAnonymity(
  data: any[],
  options: KAnonymityOptions
): KAnonymityResult {
  const { k, quasiIdentifiers } = options;

  const groups = new Map<string, number>();

  for (const record of data) {
    const key = quasiIdentifiers
      .map((qi) => String(record[qi] ?? 'NULL'))
      .join('|');

    groups.set(key, (groups.get(key) || 0) + 1);
  }

  const violations: Array<{ combination: Record<string, any>; count: number }> = [];

  for (const [key, count] of groups.entries()) {
    if (count < k) {
      const values = key.split('|');
      const combination: Record<string, any> = {};

      quasiIdentifiers.forEach((qi, index) => {
        combination[qi] = values[index] === 'NULL' ? null : values[index];
      });

      violations.push({ combination, count });
    }
  }

  return {
    isAnonymous: violations.length === 0,
    k: violations.length === 0 ? k : Math.min(...Array.from(groups.values())),
    violations,
  };
}

/**
 * Apply k-anonymity to dataset through suppression
 */
export function applyKAnonymity(
  data: any[],
  options: KAnonymityOptions
): any[] {
  const { k, quasiIdentifiers, suppressionValue = '*' } = options;

  const checkResult = checkKAnonymity(data, options);

  if (checkResult.isAnonymous) {
    return data;
  }

  const result = data.map((record) => ({ ...record }));

  const groups = new Map<string, number[]>();

  result.forEach((record, index) => {
    const key = quasiIdentifiers
      .map((qi) => String(record[qi] ?? 'NULL'))
      .join('|');

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(index);
  });

  for (const [key, indices] of groups.entries()) {
    if (indices.length < k) {
      for (const index of indices) {
        for (const qi of quasiIdentifiers) {
          result[index][qi] = suppressionValue;
        }
      }
    }
  }

  return result;
}

export function generalizeAge(age: number, rangeSize: number = 5): string {
  const lowerBound = Math.floor(age / rangeSize) * rangeSize;
  const upperBound = lowerBound + rangeSize - 1;
  return `${lowerBound}-${upperBound}`;
}

export function generalizeZipCode(zipCode: string, digits: number = 3): string {
  const cleaned = String(zipCode).replace(/\D/g, '');
  return cleaned.slice(0, digits).padEnd(5, '*');
}

export function generalizeDate(
  date: string | Date,
  precision: 'year' | 'month' = 'year'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();

  if (precision === 'year') {
    return year.toString();
  } else {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
