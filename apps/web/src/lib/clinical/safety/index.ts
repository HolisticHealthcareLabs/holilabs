/**
 * Clinical Safety Modules
 *
 * Exports DOAC safety evaluation, attestation enforcement, and governance logging
 * for safety-critical prescribing workflows.
 *
 * @compliance FDA 21 CFR Part 11, HIPAA, Healthcare SaaS
 */

// DOAC Evaluator
export {
  evaluateDOACRule,
  type DOACType,
  type DOACPatientContext,
  type DOACEvaluationResult,
  type EvaluationSeverity,
} from './doac-evaluator';

// Attestation Gate
export {
  checkAttestation,
  validateCriticalField,
  getCriticalFieldDescription,
  checkLabFreshness,
  getFailingCriticalFields,
  type AttestationGateResult,
  type AttestationReason,
} from './attestation-gate';

// Override Handler
export {
  handleOverride,
  validateOverride,
  isValidReasonCode,
  getAvailableReasonCodes,
  getReasonCodeMetadata,
  formatReasonCode,
  requiresCMOReview,
  type OverrideSubmissionParams,
  type OverrideReasonCode,
  type OverrideValidationResult,
} from './override-handler';

// Governance Events
export {
  logDOACEvaluation,
  logAttestationRequired,
  logOverrideSubmitted,
  logPatientDataAccess,
  logSafetyRuleFired,
  getGovernanceMetadata,
  complianceCitation,
  type GovernanceEventPayload,
  type GovernanceEventType,
  type DOACEvaluationEvent,
  type AttestationRequiredEvent,
  type OverrideSubmittedEvent,
  type PatientDataAccessEvent,
} from './governance-events';
