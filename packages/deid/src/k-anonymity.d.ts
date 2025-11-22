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
export declare function checkKAnonymity(data: any[], options: KAnonymityOptions): KAnonymityResult;
/**
 * Apply k-anonymity to dataset through suppression
 */
export declare function applyKAnonymity(data: any[], options: KAnonymityOptions): any[];
export declare function generalizeAge(age: number, rangeSize?: number): string;
export declare function generalizeZipCode(zipCode: string, digits?: number): string;
export declare function generalizeDate(date: string | Date, precision?: 'year' | 'month'): string;
//# sourceMappingURL=k-anonymity.d.ts.map