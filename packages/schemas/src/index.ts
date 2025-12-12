/**
 * @holi/schemas - Single Source of Truth for All Validation
 *
 * CRITICAL INVARIANT: All frontend forms and backend APIs MUST import from this package.
 * No duplicate schema definitions allowed elsewhere in the codebase.
 */

// Constants
export * from './constants';

// Schemas
export * from './patient.schema';
export * from './clinical.schema';
export * from './prescription.schema';
export * from './appointment.schema';
export * from './compliance.schema';
export * from './user.schema';
export * from './analytics.schema';
