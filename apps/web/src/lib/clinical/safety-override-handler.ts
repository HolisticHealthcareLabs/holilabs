import { logSafetyEvent } from './safety-audit-logger';
import { GovernanceSeverity, GovernanceAction } from '@prisma/client';

export async function handleOverride(params: {
  ruleId: string;
  severity: string;
  reasonCode?: string;
  actor: string;
  patientId: string;
}) {
  const { ruleId, severity, reasonCode, actor, patientId } = params;

  if (!reasonCode) {
    throw new Error('reasonCode is required for override');
  }

  // Log the override event
  // When a user overrides a BLOCK, the effective action becomes PASSED,
  // but the audit trail records the override.
  await logSafetyEvent({
    userId: actor,
    patientId: patientId,
    ruleId,
    ruleName: ruleId, // In a real app we'd lookup the friendly name
    severity: severity as GovernanceSeverity,
    action: 'PASSED' as GovernanceAction, 
    rationale: 'Clinician override applied',
    overrideReason: reasonCode
  });

  return { success: true };
}
