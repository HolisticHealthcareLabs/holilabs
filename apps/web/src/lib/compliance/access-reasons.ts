/**
 * Access Reason Constants & Validation
 *
 * HIPAA §164.502(b) - Minimum Necessary Standard
 * LGPD Art. 6 - Purpose Limitation
 * Law 25.326 (Argentina) Art. 5 - Purpose Specification
 *
 * All PHI access must be logged with a valid access reason
 */

import { AccessReason } from '@prisma/client';

/**
 * Valid access reasons for PHI access
 * Based on HIPAA permitted uses and disclosures
 */
export const VALID_ACCESS_REASONS: AccessReason[] = [
  'DIRECT_PATIENT_CARE',      // Treatment - providing direct medical care
  'CARE_COORDINATION',         // Treatment - coordinating care between providers
  'EMERGENCY_ACCESS',          // Emergency situations requiring immediate access
  'ADMINISTRATIVE',            // Healthcare operations - administrative purposes
  'QUALITY_IMPROVEMENT',       // Healthcare operations - quality improvement
  'BILLING',                   // Payment - billing and claims processing
  'LEGAL_COMPLIANCE',          // Legal requirement or court order
  'RESEARCH_IRB_APPROVED',     // Research with IRB approval and proper consent
  'PUBLIC_HEALTH',             // Public health reporting (communicable diseases, etc.)
];

/**
 * Human-readable descriptions for each access reason
 */
export const ACCESS_REASON_DESCRIPTIONS: Record<AccessReason, string> = {
  DIRECT_PATIENT_CARE: 'Providing direct medical care to the patient',
  CARE_COORDINATION: 'Coordinating care with other healthcare providers',
  EMERGENCY_ACCESS: 'Emergency situation requiring immediate patient information access',
  ADMINISTRATIVE: 'Administrative purposes related to healthcare operations',
  QUALITY_IMPROVEMENT: 'Quality improvement, auditing, or accreditation activities',
  BILLING: 'Billing, claims processing, or payment operations',
  LEGAL_COMPLIANCE: 'Legal requirement, court order, or regulatory compliance',
  RESEARCH_IRB_APPROVED: 'IRB-approved research with proper patient consent',
  PUBLIC_HEALTH: 'Public health reporting or disease surveillance activities',
};

/**
 * HIPAA references for each access reason
 */
export const ACCESS_REASON_HIPAA_REFERENCES: Record<AccessReason, string> = {
  DIRECT_PATIENT_CARE: '§164.506(c)(2) - Treatment',
  CARE_COORDINATION: '§164.506(c)(2) - Treatment coordination',
  EMERGENCY_ACCESS: '§164.510(a) - Emergency situations',
  ADMINISTRATIVE: '§164.506(c)(4) - Healthcare operations',
  QUALITY_IMPROVEMENT: '§164.506(c)(4) - Quality improvement activities',
  BILLING: '§164.506(c)(3) - Payment operations',
  LEGAL_COMPLIANCE: '§164.512 - Uses and disclosures required by law',
  RESEARCH_IRB_APPROVED: '§164.512(i) - Research with IRB approval',
  PUBLIC_HEALTH: '§164.512(b) - Public health activities',
};

/**
 * Validate access reason string
 */
export function isValidAccessReason(reason: string): reason is AccessReason {
  return VALID_ACCESS_REASONS.includes(reason as AccessReason);
}

/**
 * Get human-readable description for access reason
 */
export function getAccessReasonDescription(reason: AccessReason): string {
  return ACCESS_REASON_DESCRIPTIONS[reason] || 'Unknown access reason';
}

/**
 * Get HIPAA reference for access reason
 */
export function getAccessReasonHIPAAReference(reason: AccessReason): string {
  return ACCESS_REASON_HIPAA_REFERENCES[reason] || 'Unknown HIPAA reference';
}

/**
 * Create validation error response for missing/invalid access reason
 */
export function createAccessReasonError() {
  return {
    error: 'Access reason is required for HIPAA compliance',
    validReasons: VALID_ACCESS_REASONS,
    descriptions: ACCESS_REASON_DESCRIPTIONS,
    hipaaReference: 'HIPAA §164.502(b) - Minimum Necessary Standard',
    lgpdReference: 'LGPD Art. 6 - Purpose Limitation',
  };
}
