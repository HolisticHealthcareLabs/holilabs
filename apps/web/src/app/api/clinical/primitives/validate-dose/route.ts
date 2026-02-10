/**
 * Clinical Primitive: Validate Dose
 *
 * Atomic primitive that validates medication dosages against guidelines.
 * Part of the decomposed clinical-decision tool for agent-native architecture.
 *
 * POST /api/clinical/primitives/validate-dose
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { verifyInternalAgentToken } from '@/lib/hash';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { assessRenalDataQuality } from '@/lib/clinical/lab-decision-rules';
import { DOAC_MEDICATION_ALIASES, DOAC_RENAL_POLICY } from '@/config/clinical-rules';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  medication: z.string().min(1).max(200),
  dose: z.number().positive(),
  unit: z.enum(['mg', 'mcg', 'g', 'mL', 'units', 'IU']),
  frequency: z.string().min(1).max(50), // e.g., "once daily", "twice daily", "q8h"
  route: z.enum(['oral', 'IV', 'IM', 'SC', 'topical', 'inhaled', 'rectal', 'sublingual']).optional(),
  patientWeight: z.number().positive().optional(), // kg
  patientAge: z.number().min(0).max(150).optional(),
  renalFunction: z.object({
    creatinineClearance: z.number().min(0).max(200).optional(), // mL/min
    eGFR: z.number().min(0).max(200).optional(),
    measuredAt: z.string().datetime().optional(),
  }).optional(),
  hepaticFunction: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
  indication: z.string().optional(),
  decisionContextTime: z.string().datetime().optional(),
  attestation: z.object({
    renalDataReviewed: z.boolean().optional(),
    reason: z.string().min(1).max(500).optional(),
    attestedBy: z.string().min(1).max(200).optional(),
    attestedAt: z.string().datetime().optional(),
  }).optional(),
});

// Common medication dose ranges (simplified - production would use full drug database)
const DOSE_GUIDELINES: Record<string, DoseGuideline> = {
  'metformin': {
    medication: 'metformin',
    minDose: 500,
    maxDose: 2550,
    unit: 'mg',
    maxDailyDose: 2550,
    frequencyOptions: ['once daily', 'twice daily', 'three times daily'],
    renalAdjustment: {
      30: 0, // eGFR <30: contraindicated
      45: 0.5, // eGFR 30-45: 50% dose
      60: 1, // eGFR >60: full dose
    },
  },
  'lisinopril': {
    medication: 'lisinopril',
    minDose: 2.5,
    maxDose: 40,
    unit: 'mg',
    maxDailyDose: 40,
    frequencyOptions: ['once daily'],
    renalAdjustment: {
      30: 0.25,
      60: 0.5,
      90: 1,
    },
  },
  'amoxicillin': {
    medication: 'amoxicillin',
    minDose: 250,
    maxDose: 1000,
    unit: 'mg',
    maxDailyDose: 3000,
    frequencyOptions: ['twice daily', 'three times daily', 'q8h'],
    pediatricDose: { perKg: 25, maxPerKg: 100, unit: 'mg/kg/day' },
  },
  'atorvastatin': {
    medication: 'atorvastatin',
    minDose: 10,
    maxDose: 80,
    unit: 'mg',
    maxDailyDose: 80,
    frequencyOptions: ['once daily'],
  },
  'omeprazole': {
    medication: 'omeprazole',
    minDose: 10,
    maxDose: 40,
    unit: 'mg',
    maxDailyDose: 40,
    frequencyOptions: ['once daily', 'twice daily'],
  },
  'amlodipine': {
    medication: 'amlodipine',
    minDose: 2.5,
    maxDose: 10,
    unit: 'mg',
    maxDailyDose: 10,
    frequencyOptions: ['once daily'],
  },
  'apixaban': {
    medication: 'apixaban',
    minDose: 2.5,
    maxDose: 10,
    unit: 'mg',
    maxDailyDose: 10,
    frequencyOptions: ['once daily', 'twice daily'],
    renalAdjustment: {
      15: 0,
      30: 0.5,
      45: 1,
    },
  },
  'rivaroxaban': {
    medication: 'rivaroxaban',
    minDose: 2.5,
    maxDose: 20,
    unit: 'mg',
    maxDailyDose: 20,
    frequencyOptions: ['once daily', 'twice daily'],
    renalAdjustment: {
      15: 0,
      30: 0.75,
      50: 1,
    },
  },
  'dabigatran': {
    medication: 'dabigatran',
    minDose: 75,
    maxDose: 150,
    unit: 'mg',
    maxDailyDose: 300,
    frequencyOptions: ['twice daily'],
    renalAdjustment: {
      15: 0,
      30: 0.5,
      50: 1,
    },
  },
  'edoxaban': {
    medication: 'edoxaban',
    minDose: 15,
    maxDose: 60,
    unit: 'mg',
    maxDailyDose: 60,
    frequencyOptions: ['once daily'],
    renalAdjustment: {
      15: 0,
      50: 0.5,
      95: 1,
    },
  },
};

interface DoseGuideline {
  medication: string;
  minDose: number;
  maxDose: number;
  unit: string;
  maxDailyDose: number;
  frequencyOptions: string[];
  renalAdjustment?: Record<number, number>; // eGFR threshold -> dose multiplier
  hepaticAdjustment?: Record<string, number>;
  pediatricDose?: { perKg: number; maxPerKg: number; unit: string };
}

export type ValidateDoseStatus =
  | 'safe'
  | 'warning'
  | 'dangerous'
  | 'unknown'
  | 'attestation_required';

interface ValidationResult {
  isValid: boolean;
  status: ValidateDoseStatus;
  issues: ValidationIssue[];
  recommendation: string;
  adjustedDose?: number;
  guidelines?: string;
  completionState: {
    canComplete: boolean;
    requiresAttestation: boolean;
    reason?: 'missing_renal_data' | 'stale_renal_data';
  };
  rationale: string[];
  deterministicContext: {
    rulesetVersion: string;
    medicationMatch: string | null;
    isDoacMedication: boolean;
    evaluationReferenceTime: string | null;
  };
}

interface ValidationIssue {
  type: 'dose_too_high' | 'dose_too_low' | 'renal_adjustment' | 'hepatic_adjustment' | 'frequency_mismatch' | 'unknown_medication' | 'attestation_required';
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface ValidateDoseApiResponse {
  success: true;
  data: ValidationResult;
  metadata: {
    method: 'deterministic';
    confidence: 'low' | 'high';
    latencyMs: number;
    deterministic: {
      rulesetVersion: string;
      medicationMatch: string | null;
      evaluationReferenceTime: string | null;
      reproducible: true;
    };
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authenticate
    let userId: string | undefined;
    const internalToken = req.headers.get('X-Agent-Internal-Token');

    if (internalToken && verifyInternalAgentToken(internalToken)) {
      const userEmail = req.headers.get('X-Agent-User-Email');
      const headerUserId = req.headers.get('X-Agent-User-Id');
      if (userEmail) {
        const dbUser = await prisma.user.findFirst({
          where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
          select: { id: true },
        });
        userId = dbUser?.id;
      }
    }

    if (!userId) {
      const session = await auth();
      userId = (session?.user as { id?: string })?.id;
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const input = validation.data;

    logger.info({
      event: 'primitive_validate_dose_start',
      medication: input.medication,
      dose: input.dose,
      unit: input.unit,
    });

    // Validate the dose
    const result = validateDose(input);

    const latencyMs = Date.now() - startTime;

    // Audit log
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'ClinicalPrimitive',
        resourceId: 'validate-dose',
        details: {
          medication: input.medication,
          dose: input.dose,
          isValid: result.isValid,
          status: result.status,
          issueCount: result.issues.length,
          latencyMs,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'primitive_validate_dose_complete',
      status: result.status,
      isValid: result.isValid,
      latencyMs,
    });

    const payload: ValidateDoseApiResponse = {
      success: true,
      data: result,
      metadata: {
        method: 'deterministic',
        confidence: getConfidenceForDoseStatus(result.status),
        latencyMs,
        deterministic: {
          rulesetVersion: result.deterministicContext.rulesetVersion,
          medicationMatch: result.deterministicContext.medicationMatch,
          evaluationReferenceTime: result.deterministicContext.evaluationReferenceTime,
          reproducible: true,
        },
      },
    };
    return NextResponse.json(payload);
  } catch (error) {
    logger.error({
      event: 'primitive_validate_dose_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to validate dose' },
      { status: 500 }
    );
  }
}

function validateDose(input: z.infer<typeof requestSchema>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rationale: string[] = [];
  const medLower = input.medication.toLowerCase();
  const medicationCanonical = getCanonicalMedication(medLower);
  const isDoacMedication = Boolean(medicationCanonical && medicationCanonical in DOAC_MEDICATION_ALIASES);
  const rulesetVersion = `${DOAC_RENAL_POLICY.rulesetVersion}+validate-dose-v1`;

  // Find matching guideline
  const guideline = findGuideline(medLower, medicationCanonical);

  if (!guideline) {
    rationale.push('No deterministic guideline found for medication, returning unknown.');
    return {
      isValid: true, // Don't block unknown medications
      status: 'unknown',
      issues: [{
        type: 'unknown_medication',
        severity: 'info',
        message: `No dosing guidelines found for ${input.medication}. Please verify with clinical pharmacist.`,
      }],
      recommendation: 'Manual verification recommended. No automated guidelines available.',
      completionState: {
        canComplete: true,
        requiresAttestation: false,
      },
      rationale,
      deterministicContext: {
        rulesetVersion,
        medicationMatch: null,
        isDoacMedication: false,
        evaluationReferenceTime: input.decisionContextTime || null,
      },
    };
  }
  rationale.push(`Guideline matched for ${guideline.medication}.`);

  // Check unit matches
  if (guideline.unit !== input.unit) {
    issues.push({
      type: 'dose_too_high', // Using existing type
      severity: 'warning',
      message: `Expected unit: ${guideline.unit}, received: ${input.unit}`,
    });
    rationale.push('Input unit does not match guideline unit.');
  }

  if (isDoacMedication) {
    const renalAssessment = assessRenalDataQuality(input.renalFunction, {
      maxAgeHours: DOAC_RENAL_POLICY.maxAgeHours,
      referenceTimeIso: input.decisionContextTime,
    });
    rationale.push(...renalAssessment.rationale);

    const isAttested = Boolean(input.attestation?.renalDataReviewed);
    if ((renalAssessment.isMissingCriticalInput || renalAssessment.isStale) && !isAttested) {
      const reason: 'missing_renal_data' | 'stale_renal_data' = renalAssessment.isMissingCriticalInput
        ? 'missing_renal_data'
        : 'stale_renal_data';

      issues.push({
        type: 'attestation_required',
        severity: 'critical',
        message: reason === 'missing_renal_data'
          ? 'DOAC completion blocked: renal input missing (provide eGFR or creatinine clearance) or attest review.'
          : 'DOAC completion blocked: renal input stale/undated for deterministic safety checks. Attestation required.',
      });
      rationale.push(`Completion blocked until attestation due to ${reason}.`);
      return {
        isValid: false,
        status: 'attestation_required',
        issues,
        recommendation: 'Provide fresh renal data or complete renal data attestation before finalizing DOAC dosing.',
        completionState: {
          canComplete: false,
          requiresAttestation: true,
          reason,
        },
        rationale,
        deterministicContext: {
          rulesetVersion,
          medicationMatch: guideline.medication,
          isDoacMedication: true,
          evaluationReferenceTime: input.decisionContextTime || null,
        },
      };
    }

    if (isAttested && (renalAssessment.isMissingCriticalInput || renalAssessment.isStale)) {
      issues.push({
        type: 'attestation_required',
        severity: 'warning',
        message: 'Renal data attestation accepted; proceed with caution and ensure manual verification is documented.',
      });
      rationale.push('Attestation present; gating requirement satisfied.');
    }
  }

  // Calculate adjusted max dose based on renal function
  let adjustedMaxDose = guideline.maxDose;
  let adjustedMaxDaily = guideline.maxDailyDose;

  if (input.renalFunction && guideline.renalAdjustment) {
    const eGFR = input.renalFunction.eGFR || input.renalFunction.creatinineClearance;
    if (eGFR !== undefined) {
      // Find appropriate adjustment factor
      const thresholds = Object.keys(guideline.renalAdjustment)
        .map(Number)
        .sort((a, b) => a - b);

      let multiplier = 1;
      for (const threshold of thresholds) {
        if (eGFR < threshold) {
          multiplier = guideline.renalAdjustment[threshold];
          break;
        }
      }

      if (multiplier === 0) {
        rationale.push('Renal threshold triggered contraindication.');
        issues.push({
          type: 'renal_adjustment',
          severity: 'critical',
          message: `${input.medication} is contraindicated with eGFR < ${thresholds[0]} mL/min`,
        });
        return {
          isValid: false,
          status: 'dangerous',
          issues,
          recommendation: `Do not use ${input.medication}. Consider alternative therapy.`,
          completionState: {
            canComplete: false,
            requiresAttestation: false,
          },
          rationale,
          deterministicContext: {
            rulesetVersion,
            medicationMatch: guideline.medication,
            isDoacMedication,
            evaluationReferenceTime: input.decisionContextTime || null,
          },
        };
      }

      if (multiplier < 1) {
        adjustedMaxDose = guideline.maxDose * multiplier;
        adjustedMaxDaily = guideline.maxDailyDose * multiplier;
        rationale.push(`Renal multiplier ${multiplier} applied.`);
        issues.push({
          type: 'renal_adjustment',
          severity: 'warning',
          message: `Dose reduction needed for renal impairment (eGFR: ${eGFR}). Max dose: ${adjustedMaxDose}${guideline.unit}`,
        });
      }
    }
  }

  // Check dose range
  if (input.dose > adjustedMaxDose) {
    rationale.push('Dose exceeds adjusted maximum.');
    issues.push({
      type: 'dose_too_high',
      severity: 'critical',
      message: `Dose ${input.dose}${input.unit} exceeds maximum of ${adjustedMaxDose}${guideline.unit}`,
    });
  }

  if (input.dose < guideline.minDose) {
    rationale.push('Dose below minimum therapeutic range.');
    issues.push({
      type: 'dose_too_low',
      severity: 'warning',
      message: `Dose ${input.dose}${input.unit} is below minimum therapeutic dose of ${guideline.minDose}${guideline.unit}`,
    });
  }

  // Check frequency
  const freqLower = input.frequency.toLowerCase();
  const validFrequency = guideline.frequencyOptions.some(
    f => freqLower.includes(f) || f.includes(freqLower)
  );

  if (!validFrequency) {
    rationale.push('Frequency is outside standard guideline options.');
    issues.push({
      type: 'frequency_mismatch',
      severity: 'info',
      message: `Frequency '${input.frequency}' may not be standard. Typical options: ${guideline.frequencyOptions.join(', ')}`,
    });
  }

  // Determine overall status
  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasWarning = issues.some(i => i.severity === 'warning');

  let status: 'safe' | 'warning' | 'dangerous';
  let recommendation: string;

  if (hasCritical) {
    status = 'dangerous';
    recommendation = 'Do not prescribe. Consult clinical pharmacist for dose adjustment.';
    rationale.push('Overall status set to dangerous due to critical issue.');
  } else if (hasWarning) {
    status = 'warning';
    recommendation = 'Review dose. Consider adjustments based on patient factors.';
    rationale.push('Overall status set to warning due to warning-level issue.');
  } else {
    status = 'safe';
    recommendation = 'Dose appears appropriate. Proceed with clinical judgement.';
    rationale.push('Overall status set to safe.');
  }

  return {
    isValid: !hasCritical,
    status,
    issues,
    recommendation,
    adjustedDose: hasCritical ? adjustedMaxDose : undefined,
    guidelines: `Standard range: ${guideline.minDose}-${guideline.maxDose}${guideline.unit}. Max daily: ${guideline.maxDailyDose}${guideline.unit}.`,
    completionState: {
      canComplete: !hasCritical,
      requiresAttestation: false,
    },
    rationale,
    deterministicContext: {
      rulesetVersion,
      medicationMatch: guideline.medication,
      isDoacMedication,
      evaluationReferenceTime: input.decisionContextTime || null,
    },
  };
}

function getConfidenceForDoseStatus(status: string): 'low' | 'high' {
  switch (status) {
    case 'unknown':
      return 'low';
    case 'safe':
    case 'warning':
    case 'dangerous':
    case 'attestation_required':
      return 'high';
    default:
      return 'low';
  }
}

function normalizeMedicationName(name: string): string {
  return name.toLowerCase().trim();
}

function getCanonicalMedication(medication: string): string | null {
  const normalized = normalizeMedicationName(medication);
  const aliasEntries = Object.entries(DOAC_MEDICATION_ALIASES).sort(([a], [b]) => a.localeCompare(b));

  for (const [canonical, aliases] of aliasEntries) {
    const isMatch = aliases.some(alias => normalized === alias || normalized.includes(alias));
    if (isMatch) {
      return canonical;
    }
  }

  return null;
}

function findGuideline(medicationLower: string, canonicalMedication: string | null): DoseGuideline | undefined {
  if (canonicalMedication && DOSE_GUIDELINES[canonicalMedication]) {
    return DOSE_GUIDELINES[canonicalMedication];
  }

  const sortedGuidelines = Object.values(DOSE_GUIDELINES)
    .slice()
    .sort((a, b) => a.medication.localeCompare(b.medication));
  return sortedGuidelines.find(
    guideline => medicationLower === guideline.medication || medicationLower.includes(guideline.medication)
  );
}
