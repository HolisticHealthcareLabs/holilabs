import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { GovernanceAction, GovernanceSeverity } from '@prisma/client';

export type SafetyEventContext = {
  userId: string;
  patientId: string;
  ruleId: string;
  ruleName: string;
  severity: GovernanceSeverity;
  action: GovernanceAction;
  rationale: string;
  overrideReason?: string;
};

/**
 * Persists a clinical safety event to the Governance log chain.
 * This is a requirement for SaMD compliance (audit trail).
 * 
 * Hierarchy: InteractionSession -> GovernanceLog -> GovernanceEvent
 */
export async function logSafetyEvent(context: SafetyEventContext) {
  const { userId, patientId, ruleId, ruleName, severity, action, rationale, overrideReason } = context;

  // 1. Log to structured logger (fast path)
  logger.info({
    event: 'CLINICAL_SAFETY_EVENT',
    ...context,
    timestamp: new Date().toISOString(),
  }, `Safety Event: ${ruleName} -> ${action}`);

  // 2. Persist to Database (Audit Trail)
  try {
    await prisma.$transaction(async (tx) => {
      // A. Create Session (if not passed in context, we create a transient one for this event)
      // In a real flow, we might want to attach to an existing session, but for safety checks
      // that might happen outside a "chat", a transient session is safer than failing.
      const session = await tx.interactionSession.create({
        data: {
          userId,
          patientId,
        },
      });

      // B. Create Governance Log (The "Flight Recorder" entry)
      const log = await tx.governanceLog.create({
        data: {
          sessionId: session.id,
          inputPrompt: 'DETERMINISTIC_RULE_EVALUATION', // Sentinel value for non-LLM checks
          rawModelOutput: JSON.stringify({ severity, rationale }),
          sanitizedOutput: rationale,
          provider: 'cortex-safety-engine',
          validationStatus: 'VERIFIED', // Deterministic rules are pre-verified
          ruleId,
          ruleDescription: ruleName,
          overrideReason,
        },
      });

      // C. Create the granular Event
      await tx.governanceEvent.create({
        data: {
          logId: log.id,
          ruleId,
          ruleName,
          severity,
          description: rationale,
          actionTaken: action,
          overrideByUser: !!overrideReason,
          overrideReason,
        },
      });
    });
  } catch (error) {
    // Failsafe: If DB logging fails, we MUST NOT crash the clinical workflow,
    // but we MUST log the failure to the system logger so it can be reconciled.
    logger.error({
      event: 'SAFETY_EVENT_PERSISTENCE_FAILED',
      error,
      originalContext: context,
    }, 'Failed to persist safety event to database');
  }
}
