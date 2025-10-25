import { Policy, RedactionResult } from './types';
/**
 * Redact structured data (FHIR JSON, CSV, etc.)
 */
export declare function redactStructured(data: any, policy: Policy): RedactionResult;
/**
 * Redact free-text notes (clinical narratives)
 */
export declare function redactText(text: string, locale: string, policy: Policy): string;
//# sourceMappingURL=redact.d.ts.map