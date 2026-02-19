
import { logger } from '@/lib/logger';

export async function logFormularyOverride(
  clinicianId: string,
  ruleId: string,
  reason: string,
  prescriptionDetails: any
) {
  // In a real implementation, this would write to the FormularyOverride table via Prisma
  // and potentially trigger a compliance alert if the reason is suspicious.
  
  logger.info({
    event: 'FORMULARY_OVERRIDE',
    clinicianId,
    ruleId,
    reason,
    timestamp: new Date().toISOString(),
    details: prescriptionDetails
  });

  console.log(`[AUDIT] Formulary Override Logged: User ${clinicianId} overrode Rule ${ruleId} due to ${reason}`);
  
  // Mock DB write
  return { success: true, id: 'mock-override-id' };
}

export async function logNudgeImpression(
  clinicianId: string,
  ruleId: string,
  action: 'VIEWED' | 'DISMISSED' | 'ACCEPTED'
) {
  logger.info({
    event: 'FORMULARY_NUDGE_INTERACTION',
    clinicianId,
    ruleId,
    action,
    timestamp: new Date().toISOString()
  });
}
