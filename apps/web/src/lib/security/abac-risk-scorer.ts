/**
 * ABAC Risk Scorer — Attribute-Based Access Control risk assessment.
 *
 * Scores requests on a 0-1 scale based on:
 * - Actor type (AGENT, SYSTEM, USER)
 * - PHI field sensitivity (weighted by field type)
 * - Consent basis (presence/absence)
 * - Patient relationship (direct, team, org, none)
 * - Session volume (cumulative tool calls)
 * - Emergency override status (break-glass)
 *
 * Recommendation thresholds:
 * - <0.25: ALLOW
 * - <0.50: LOG_ENHANCED
 * - <0.70: REQUIRE_JUSTIFICATION
 * - ≥0.70: DENY
 */

export type ActorType = 'AGENT' | 'SYSTEM' | 'USER';
export type PatientRelationship = 'ASSIGNED' | 'TEAM' | 'ORGANIZATION' | 'NONE';
export type Recommendation = 'ALLOW' | 'LOG_ENHANCED' | 'REQUIRE_JUSTIFICATION' | 'DENY';

export interface ABACRiskInput {
  toolName: string;
  toolCategory: string;
  actorType: ActorType;
  accessedFields: string[];
  patientRelationship: PatientRelationship;
  consentBasis: string | null;
  sessionToolCallCount: number;
  isEmergencyOverride: boolean;
}

export interface ABACRiskFactor {
  name: string;
  description: string;
  value: number;
}

export interface ABACRiskScore {
  score: number;
  recommendation: Recommendation;
  factors: ABACRiskFactor[];
}

/**
 * PHI field sensitivity weights.
 * Sum capped at 0.40 in scoring to prevent dominating other factors.
 */
const PHI_FIELD_WEIGHTS: Record<string, number> = {
  cpf: 0.15,
  cns: 0.15,
  rg: 0.12,
  dateOfBirth: 0.08,
  firstName: 0.05,
  lastName: 0.05,
  email: 0.08,
  phone: 0.06,
  address: 0.10,
  diagnosis: 0.12,
  medication: 0.08,
  labResult: 0.08,
  soapNote: 0.10,
};

/**
 * Normalize PHI sensitivity to 0.40 cap.
 */
function calculatePHISensitivity(accessedFields: string[]): number {
  let total = 0;
  for (const field of accessedFields) {
    total += PHI_FIELD_WEIGHTS[field] || 0;
  }
  return Math.min(total, 0.40);
}

/**
 * Map actor type to risk contribution.
 */
function getActorTypeRisk(actorType: ActorType): number {
  switch (actorType) {
    case 'AGENT':
      return 0.10;
    case 'SYSTEM':
      return 0.05;
    case 'USER':
      return 0.0;
    default:
      return 0.0;
  }
}

/**
 * Map patient relationship to risk contribution.
 */
function getRelationshipRisk(relationship: PatientRelationship): number {
  switch (relationship) {
    case 'ASSIGNED':
      return 0.0;
    case 'TEAM':
      return 0.05;
    case 'ORGANIZATION':
      return 0.15;
    case 'NONE':
      return 0.30;
    default:
      return 0.30;
  }
}

/**
 * Calculate session volume risk based on cumulative tool calls.
 */
function getSessionVolumeRisk(sessionToolCallCount: number): number {
  if (sessionToolCallCount > 50) {
    return 0.15;
  }
  if (sessionToolCallCount > 20) {
    return 0.08;
  }
  return 0.0;
}

/**
 * Calculate ABAC risk score for an access request.
 */
export function calculateABACRiskScore(input: ABACRiskInput): ABACRiskScore {
  const factors: ABACRiskFactor[] = [];

  // Factor 1: Actor Type
  const actorTypeRisk = getActorTypeRisk(input.actorType);
  factors.push({
    name: 'actor_type',
    description: `Actor type: ${input.actorType}`,
    value: actorTypeRisk,
  });

  // Factor 2: PHI Sensitivity
  const phiSensitivity = calculatePHISensitivity(input.accessedFields);
  factors.push({
    name: 'phi_sensitivity',
    description: `Accessed fields: ${input.accessedFields.join(', ') || 'none'}`,
    value: phiSensitivity,
  });

  // Factor 3: Consent Basis
  const consentRisk = input.consentBasis ? 0.0 : 0.25;
  factors.push({
    name: 'consent_basis',
    description: `Consent: ${input.consentBasis ? 'present' : 'absent'}`,
    value: consentRisk,
  });

  // Factor 4: Patient Relationship
  const relationshipRisk = getRelationshipRisk(input.patientRelationship);
  factors.push({
    name: 'patient_relationship',
    description: `Relationship: ${input.patientRelationship}`,
    value: relationshipRisk,
  });

  // Factor 5: Session Volume
  const volumeRisk = getSessionVolumeRisk(input.sessionToolCallCount);
  factors.push({
    name: 'session_volume',
    description: `Tool calls in session: ${input.sessionToolCallCount}`,
    value: volumeRisk,
  });

  // Factor 6: Emergency Override
  const emergencyAdjustment = input.isEmergencyOverride ? -0.20 : 0.0;
  if (input.isEmergencyOverride) {
    factors.push({
      name: 'emergency_override',
      description: 'Break-glass override active',
      value: emergencyAdjustment,
    });
  }

  // Clamp raw score to [0, 1]
  let rawScore = 0;
  for (const factor of factors) {
    rawScore += factor.value;
  }
  const score = Math.max(0, Math.min(1, rawScore));

  // Determine recommendation based on score
  let recommendation: Recommendation;
  if (score < 0.25) {
    recommendation = 'ALLOW';
  } else if (score < 0.50) {
    recommendation = 'LOG_ENHANCED';
  } else if (score < 0.70) {
    recommendation = 'REQUIRE_JUSTIFICATION';
  } else {
    recommendation = 'DENY';
  }

  return {
    score,
    recommendation,
    factors,
  };
}
