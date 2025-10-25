import { Policy, GeneralizationResult } from './types';
/**
 * Generalize sensitive data according to policy
 * - Ages → age bands
 * - Dates → year or quarter
 * - Geographic → ZIP3 or state only
 */
export declare function generalize(record: any, policy: Policy): GeneralizationResult;
//# sourceMappingURL=generalize.d.ts.map