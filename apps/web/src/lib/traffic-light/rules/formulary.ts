import { TrafficLightSignal } from '@/lib/governance/shared-types';
import { checkFormularyAction } from '@/app/dashboard/admin/formulary/actions';

/**
 * Check formulary status for a medication.
 * Delegates to server action for DB lookup. Safe to call from client (RPC) or server (direct).
 */
export async function checkFormulary(
  medicationName: string,
  organizationId: string = 'default-org'
): Promise<TrafficLightSignal | null> {
  const result = await checkFormularyAction(medicationName, organizationId);

  if (!result.type || !result.ruleId) return null;

  const evidenceText = result.rationale
    ? `Organization Protocol: ${result.rationale}`
    : 'Organization Protocol';

  if (result.type === 'RESTRICTED' || result.type === 'EXCLUDED') {
    return {
      ruleId: result.ruleId,
      ruleName: 'Formulary Restriction',
      category: 'administrative',
      color: 'ORANGE',
      message: `Formulary Alert: ${medicationName} is non-preferred.`,
      messagePortuguese: `Alerta de formulário: ${medicationName} não é preferido.`,
      suggestedCorrection: result.preferredDrug
        ? `Switch to ${result.preferredDrug} to save patient R$ ${result.savings.toFixed(2)}.`
        : undefined,
      evidence: [evidenceText],
    };
  }

  if (result.type === 'PRIOR_AUTH_REQUIRED') {
    return {
      ruleId: result.ruleId,
      ruleName: 'Prior Authorization Required',
      category: 'administrative',
      color: 'ORANGE',
      message: `${medicationName} requires prior authorization.`,
      messagePortuguese: `${medicationName} requer autorização prévia.`,
      suggestedCorrection: result.preferredDrug
        ? `Consider ${result.preferredDrug} as alternative.`
        : undefined,
      evidence: [evidenceText],
    };
  }

  if (result.type === 'PREFERRED') {
    return {
      ruleId: result.ruleId,
      ruleName: 'Formulary Optimization',
      category: 'administrative',
      color: 'GREEN',
      message: 'Cost Saving Opportunity',
      messagePortuguese: 'Oportunidade de economia',
      suggestedCorrection: result.preferredDrug
        ? `Switch to ${result.preferredDrug} to save patient R$ ${result.savings.toFixed(2)}.`
        : undefined,
      evidence: [evidenceText],
    };
  }

  return null;
}
