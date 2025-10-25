import { PseudonymizationResult } from './types';
/**
 * Pseudonymize subject identifiers using salted hash
 * Generates a deterministic patient token from subject keys
 */
export declare function pseudonymize(subjectKeys: string[], saltRotationKey: string): PseudonymizationResult;
/**
 * Verify if a subject matches a given token
 */
export declare function verifyPseudonym(subjectKeys: string[], saltRotationKey: string, expectedPointerHash: string): boolean;
/**
 * Generate a new salt rotation key (for key rotation operations)
 */
export declare function generateSaltRotationKey(): string;
//# sourceMappingURL=pseudonymize.d.ts.map