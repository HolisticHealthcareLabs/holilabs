/**
 * Care Pathway Engine
 *
 * Deterministic step evaluation and advancement with optimistic locking.
 * Uses JSON-Logic for entry criteria and branch conditions.
 *
 * ANVISA Class I: All pathway logic is deterministic.
 * Concurrency safety: Uses version field with $transaction for optimistic locking.
 *
 * AWAITING_REVIEW: Step entry criteria JSON-Logic rules need clinical validation.
 */

import jsonLogic from 'json-logic-js';
import type { PrismaClient, CarePathwayInstance } from '@prisma/client';
import type {
  PathwayStepDefinition,
  PathwayBranch,
  StepHistoryEntry,
} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdvanceResult {
  advanced: boolean;
  previousStepId: string;
  currentStepId: string;
  newStatus?: string;
  deviations: string[];
  branchTaken?: string;
}

export interface PatientPathwayFacts {
  patientId: string;
  age: number;
  diagnoses: string[];
  medications: string[];
  latestLabResults: Record<string, number>;
  encounterCount: number;
  lastEncounterDate?: string;
}

export class OptimisticLockError extends Error {
  constructor(instanceId: string) {
    super(`Optimistic lock conflict on pathway instance ${instanceId} — retry required`);
    this.name = 'OptimisticLockError';
  }
}

// ---------------------------------------------------------------------------
// Step Resolution
// ---------------------------------------------------------------------------

/**
 * Finds the next step to advance to, evaluating branch conditions with JSON-Logic.
 * Returns null if no branch condition is met (stays on current step).
 */
export function resolveNextStep(
  currentStep: PathwayStepDefinition,
  facts: PatientPathwayFacts,
): { nextStepId: string; branchLabel: string } | null {
  if (!currentStep.branches || currentStep.branches.length === 0) {
    return null;
  }

  for (const branch of currentStep.branches) {
    const result = jsonLogic.apply(branch.condition, facts);
    if (result) {
      return { nextStepId: branch.targetStepId, branchLabel: branch.label };
    }
  }

  return null;
}

/**
 * Evaluates whether the entry criteria for a step are met.
 */
export function evaluateEntryCriteria(
  step: PathwayStepDefinition,
  facts: PatientPathwayFacts,
): boolean {
  return Boolean(jsonLogic.apply(step.entryCriteria, facts));
}

/**
 * Checks whether a pathway step has timed out based on enrollment date.
 */
export function checkStepTimeout(
  stepHistory: StepHistoryEntry[],
  currentStepId: string,
  timeoutDays: number,
): boolean {
  const currentEntry = stepHistory.find(
    (e) => e.stepId === currentStepId && !e.completedAt,
  );
  if (!currentEntry) return false;

  const enteredAt = new Date(currentEntry.enteredAt);
  const now = new Date();
  const daysSinceEntry = (now.getTime() - enteredAt.getTime()) / (24 * 60 * 60 * 1000);

  return daysSinceEntry > timeoutDays;
}

// ---------------------------------------------------------------------------
// Pathway Advancement (with optimistic locking)
// ---------------------------------------------------------------------------

/**
 * Advances a pathway instance to the next step using optimistic locking.
 *
 * Uses Prisma $transaction with a version check to prevent concurrent
 * modifications. If the version has changed since the read, throws
 * OptimisticLockError.
 *
 * Steps:
 * 1. Read current instance + definition
 * 2. Resolve next step via JSON-Logic branch evaluation
 * 3. Update instance with incremented version in a transaction
 */
export async function advancePathway(
  prisma: PrismaClient,
  instanceId: string,
  facts: PatientPathwayFacts,
): Promise<AdvanceResult> {
  const instance = await prisma.carePathwayInstance.findUnique({
    where: { id: instanceId },
    include: { pathwayDefinition: true },
  });

  if (!instance) {
    throw new Error(`Pathway instance ${instanceId} not found`);
  }

  if (instance.status !== 'ACTIVE') {
    return {
      advanced: false,
      previousStepId: instance.currentStepId,
      currentStepId: instance.currentStepId,
      deviations: [],
    };
  }

  const steps = instance.pathwayDefinition.steps as unknown as PathwayStepDefinition[];
  const currentStep = steps.find((s) => s.stepId === instance.currentStepId);

  if (!currentStep) {
    throw new Error(`Step ${instance.currentStepId} not found in pathway definition`);
  }

  const deviations: string[] = [];
  const stepHistory = (instance.stepHistory ?? []) as unknown as StepHistoryEntry[];

  // Check for timeout deviation
  if (checkStepTimeout(stepHistory, instance.currentStepId, currentStep.timeoutDays)) {
    deviations.push(`TIMEOUT: Step "${currentStep.name}" exceeded ${currentStep.timeoutDays} day limit`);
  }

  // Resolve next step
  const nextStep = resolveNextStep(currentStep, facts);
  if (!nextStep) {
    return {
      advanced: false,
      previousStepId: instance.currentStepId,
      currentStepId: instance.currentStepId,
      deviations,
    };
  }

  const targetStep = steps.find((s) => s.stepId === nextStep.nextStepId);
  if (targetStep && !evaluateEntryCriteria(targetStep, facts)) {
    return {
      advanced: false,
      previousStepId: instance.currentStepId,
      currentStepId: instance.currentStepId,
      deviations: [...deviations, `ENTRY_CRITERIA_NOT_MET: Cannot advance to "${targetStep.name}"`],
    };
  }

  // Update step history
  const now = new Date().toISOString();
  const updatedHistory: StepHistoryEntry[] = stepHistory.map((e) =>
    e.stepId === instance.currentStepId && !e.completedAt
      ? { ...e, completedAt: now, outcome: nextStep.branchLabel }
      : e,
  );
  updatedHistory.push({
    stepId: nextStep.nextStepId,
    enteredAt: now,
    deviations,
  });

  const isTerminal = targetStep?.isTerminal ?? false;
  const newStatus = isTerminal ? 'COMPLETED' : 'ACTIVE';

  // Optimistic locking: update only if version matches
  const updated = await prisma.$transaction(async (tx: any) => {
    const result = await tx.carePathwayInstance.updateMany({
      where: {
        id: instanceId,
        version: instance.version,
      },
      data: {
        currentStepId: nextStep.nextStepId,
        stepHistory: updatedHistory as any,
        deviationCount: instance.deviationCount + deviations.length,
        version: instance.version + 1,
        ...(isTerminal ? { status: 'COMPLETED', completedAt: new Date() } : {}),
      },
    });

    if (result.count === 0) {
      throw new OptimisticLockError(instanceId);
    }

    return result;
  });

  return {
    advanced: true,
    previousStepId: instance.currentStepId,
    currentStepId: nextStep.nextStepId,
    newStatus,
    deviations,
    branchTaken: nextStep.branchLabel,
  };
}

/**
 * Enrolls a patient in a care pathway.
 */
export async function enrollPatient(
  prisma: PrismaClient,
  patientId: string,
  pathwayDefinitionId: string,
  tenantId: string,
  enrolledBy: string,
): Promise<CarePathwayInstance> {
  const definition = await prisma.carePathwayDefinition.findUnique({
    where: { id: pathwayDefinitionId },
  });

  if (!definition || !definition.isActive) {
    throw new Error(`Pathway definition ${pathwayDefinitionId} not found or inactive`);
  }

  const steps = definition.steps as unknown as PathwayStepDefinition[];
  const firstStep = steps[0];

  if (!firstStep) {
    throw new Error('Pathway definition has no steps');
  }

  return prisma.carePathwayInstance.create({
    data: {
      patientId,
      tenantId,
      pathwayDefinitionId,
      currentStepId: firstStep.stepId,
      enrolledBy,
      status: 'ACTIVE',
      stepHistory: [
        {
          stepId: firstStep.stepId,
          enteredAt: new Date().toISOString(),
          deviations: [],
        },
      ],
      version: 1,
      adherenceScore: 100,
    },
  });
}
