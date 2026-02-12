/**
 * Governance Events Logger
 *
 * All patient data access, safety rule evaluations, and overrides are logged
 * for audit, compliance, and clinical governance review.
 *
 * Logged events:
 * - DOAC_EVALUATION: Safety evaluation performed
 * - ATTESTATION_REQUIRED: Missing/stale data flagged
 * - OVERRIDE_SUBMITTED: Clinician override with reason code
 * - PATIENT_DATA_ACCESS: Read of sensitive fields
 *
 * All events include:
 * - actor (user ID)
 * - resource (patient ID)
 * - action (what was done)
 * - timestamp (ISO 8601)
 * - traceId (request correlation ID)
 * - legalBasis (compliance citation)
 *
 * @compliance HIPAA Audit Trail, FDA 21 CFR Part 11, LGPD (Brazil)
 * @author Safety Core Agent
 * @since 2026-02-11
 */

import { logger } from '@/lib/logger';

export type GovernanceEventType =
  | 'DOAC_EVALUATION'
  | 'ATTESTATION_REQUIRED'
  | 'OVERRIDE_SUBMITTED'
  | 'PATIENT_DATA_ACCESS'
  | 'SAFETY_RULE_FIRED';

/**
 * Base governance event structure
 */
export interface GovernanceEventPayload {
  event: GovernanceEventType;
  actor: string; // User ID (clinician, system, etc.)
  resource: string; // Patient ID
  action: string; // Human-readable action
  timestamp: string; // ISO 8601
  traceId?: string; // Request correlation ID
  legalBasis: string; // Compliance reference
  metadata?: Record<string, any>;
}

/**
 * DOAC evaluation event
 */
export interface DOACEvaluationEvent extends GovernanceEventPayload {
  event: 'DOAC_EVALUATION';
  medication: string;
  severity: string;
  ruleId: string;
}

/**
 * Attestation requirement event
 */
export interface AttestationRequiredEvent extends GovernanceEventPayload {
  event: 'ATTESTATION_REQUIRED';
  reason: string;
  missingFields?: string[];
  staleSince?: number; // hours
}

/**
 * Override submission event
 */
export interface OverrideSubmittedEvent extends GovernanceEventPayload {
  event: 'OVERRIDE_SUBMITTED';
  ruleId: string;
  originalSeverity: string;
  reasonCode: string;
  metadata: {
    overriddenRule: string;
    clinicianId: string;
    patientId: string;
    timestamp: string;
    notes?: string;
  };
}

/**
 * Patient data access event
 */
export interface PatientDataAccessEvent extends GovernanceEventPayload {
  event: 'PATIENT_DATA_ACCESS';
  fields: string[]; // Which fields were accessed
  purpose: string; // Why we're accessing
}

/**
 * Log a DOAC evaluation event
 */
export function logDOACEvaluation(params: {
  actor: string;
  patientId: string;
  medication: string;
  severity: string;
  ruleId: string;
  traceId?: string;
}): void {
  const event: DOACEvaluationEvent = {
    event: 'DOAC_EVALUATION',
    actor: params.actor,
    resource: params.patientId,
    action: `Evaluated DOAC safety: ${params.medication} → ${params.severity}`,
    timestamp: new Date().toISOString(),
    traceId: params.traceId,
    medication: params.medication,
    severity: params.severity,
    ruleId: params.ruleId,
    legalBasis: 'FDA 21 CFR Part 11 (Clinical Decision Support Audit)',
  };

  logger.info(event);
}

/**
 * Log that attestation is required
 */
export function logAttestationRequired(params: {
  actor: string;
  patientId: string;
  medication: string;
  reason: string;
  missingFields?: string[];
  staleSince?: number;
  traceId?: string;
}): void {
  const event: AttestationRequiredEvent = {
    event: 'ATTESTATION_REQUIRED',
    actor: params.actor,
    resource: params.patientId,
    action: `Attestation required for ${params.medication}: ${params.reason}`,
    timestamp: new Date().toISOString(),
    traceId: params.traceId,
    reason: params.reason,
    missingFields: params.missingFields,
    staleSince: params.staleSince,
    legalBasis: 'FDA 21 CFR Part 11 (Clinical Verification)',
    metadata: {
      medication: params.medication,
    },
  };

  logger.info(event);
}

/**
 * Log an override submission with reason code
 */
export function logOverrideSubmitted(params: {
  actor: string;
  patientId: string;
  ruleId: string;
  originalSeverity: string;
  reasonCode: string;
  notes?: string;
  traceId?: string;
}): void {
  const event: OverrideSubmittedEvent = {
    event: 'OVERRIDE_SUBMITTED',
    actor: params.actor,
    resource: params.patientId,
    action: `Overrode rule ${params.ruleId} with reason: ${params.reasonCode}`,
    timestamp: new Date().toISOString(),
    traceId: params.traceId,
    ruleId: params.ruleId,
    originalSeverity: params.originalSeverity,
    reasonCode: params.reasonCode,
    legalBasis: 'HIPAA Audit Trail 45 CFR §164.312(b)',
    metadata: {
      overriddenRule: params.ruleId,
      clinicianId: params.actor,
      patientId: params.patientId,
      timestamp: new Date().toISOString(),
      notes: params.notes,
    },
  };

  logger.info(event);
}

/**
 * Log patient data access
 */
export function logPatientDataAccess(params: {
  actor: string;
  patientId: string;
  fields: string[];
  purpose: string;
  traceId?: string;
}): void {
  const event: PatientDataAccessEvent = {
    event: 'PATIENT_DATA_ACCESS',
    actor: params.actor,
    resource: params.patientId,
    action: `Accessed patient data (${params.fields.join(', ')}) for: ${params.purpose}`,
    timestamp: new Date().toISOString(),
    traceId: params.traceId,
    fields: params.fields,
    purpose: params.purpose,
    legalBasis: 'HIPAA Audit Trail 45 CFR §164.312(b)',
  };

  logger.info(event);
}

/**
 * Log a safety rule evaluation that resulted in an alert
 */
export function logSafetyRuleFired(params: {
  actor: string;
  patientId: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  description: string;
  traceId?: string;
}): void {
  const event: GovernanceEventPayload = {
    event: 'SAFETY_RULE_FIRED',
    actor: params.actor,
    resource: params.patientId,
    action: `Safety rule fired: ${params.ruleName} (${params.severity})`,
    timestamp: new Date().toISOString(),
    traceId: params.traceId,
    legalBasis: 'FDA 21 CFR Part 11 (Clinical Decision Support Audit)',
    metadata: {
      ruleId: params.ruleId,
      ruleName: params.ruleName,
      severity: params.severity,
      description: params.description,
    },
  };

  logger.info(event);
}

/**
 * Helper to construct governance metadata for API responses
 */
export function getGovernanceMetadata(params: {
  actor: string;
  patientId: string;
  traceId?: string;
}): { actor: string; resource: string; timestamp: string; traceId?: string } {
  return {
    actor: params.actor,
    resource: params.patientId,
    timestamp: new Date().toISOString(),
    traceId: params.traceId,
  };
}

/**
 * Build a compliance citation for a governance event
 */
export function complianceCitation(type: 'audit' | 'clinical-verification' | 'data-access'): string {
  switch (type) {
    case 'audit':
      return 'HIPAA Audit Trail 45 CFR §164.312(b) + FDA 21 CFR Part 11';
    case 'clinical-verification':
      return 'FDA 21 CFR Part 11 (Clinical Verification Requirement)';
    case 'data-access':
      return 'HIPAA Minimum Necessary 45 CFR §164.501';
    default:
      return 'Healthcare SaaS Governance';
  }
}
