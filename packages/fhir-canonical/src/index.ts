/**
 * @holi/fhir-canonical
 *
 * Bidirectional FHIR R4 ↔ CanonicalHealthRecord mapper
 * with Brazil RNDS profile validation
 *
 * Usage:
 *
 * ```typescript
 * import { FHIRToCanonicalConverter } from '@holi/fhir-canonical';
 * import type { CanonicalHealthRecord } from '@holi/fhir-canonical';
 *
 * const converter = new FHIRToCanonicalConverter('RNDS', 'https://rnds.saude.gov.br');
 * const canonical = await converter.convertBundle(fhirBundle);
 * ```
 */

// Types
export * from './types';
export * from './encounter-types';
export { generateLaudoMedico } from './laudo-medico';
export type { LaudoMedico, LaudoMedicoSection } from './laudo-medico';

// Mappers
export { FHIRToCanonicalConverter } from './mappers/to-canonical';
export { CanonicalToFHIRConverter } from './mappers/to-fhir';

// Validators
export {
  validateBRPatient,
  validateBRCondition,
  validateBRMedicacao,
  validateObservation,
  validateAllergyIntolerance,
  validateBRBundle,
  validateRNDSCompliance,
} from './validators/rnds-profiles';

export type {
  RNDSValidationResult,
} from './validators/rnds-profiles';
