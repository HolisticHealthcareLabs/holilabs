/**
 * CDS Evaluation API
 *
 * POST /api/cds/evaluate - Evaluate clinical decision support rules
 * GET  /api/cds/evaluate - Return API documentation and registered rules
 *
 * Merges deterministic DOAC safety evaluation (Track A core) with broader CDS engine
 * (drug interactions, WHO-PEN, PAHO). DOAC safety always runs; CDS engine degrades
 * gracefully if Redis is unavailable.
 *
 * @compliance CDS Hooks 2.0, HL7 FHIR, HIPAA, FDA 21 CFR Part 11
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import logger from '@/lib/logger';
import { evaluateDOACRule } from '@/lib/clinical/safety/doac-evaluator';
import type { DOACType } from '@/lib/clinical/safety/doac-evaluator';
import {
  logDOACEvaluation,
  logAttestationRequired,
  logPatientDataAccess,
  getGovernanceMetadata,
} from '@/lib/clinical/safety/governance-events';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext, CDSAlert, CDSHookType, CDSEvaluationResult } from '@/lib/cds/types';

export const dynamic = 'force-dynamic';

// Known DOAC generic names
const DOAC_NAMES = ['rivaroxaban', 'apixaban', 'edoxaban', 'dabigatran'];

const medicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  genericName: z.string().optional(),
  rxNormCode: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  status: z.enum(['active', 'completed', 'discontinued', 'draft']),
});

const evaluateSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  encounterId: z.string().optional(),
  hookType: z.enum([
    'patient-view',
    'medication-prescribe',
    'order-select',
    'order-sign',
    'encounter-start',
    'encounter-discharge',
  ]),
  context: z.object({
    patientId: z.string(),
    encounterId: z.string().optional(),
    medications: z.array(medicationSchema).optional(),
    allergies: z.array(z.object({
      id: z.string(),
      allergen: z.string(),
      allergenCode: z.string().optional(),
      reaction: z.string().optional(),
      severity: z.enum(['mild', 'moderate', 'severe', 'life-threatening']),
      verificationStatus: z.enum(['confirmed', 'unconfirmed', 'refuted']),
    })).optional(),
    conditions: z.array(z.object({
      id: z.string(),
      code: z.string(),
      display: z.string(),
      icd10Code: z.string().optional(),
      snomedCode: z.string().optional(),
      clinicalStatus: z.enum(['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved']),
      verificationStatus: z.enum(['confirmed', 'provisional', 'differential', 'refuted']),
      recordedDate: z.string(),
    })).optional(),
    labResults: z.array(z.object({
      id: z.string(),
      testName: z.string(),
      loincCode: z.string().optional(),
      value: z.union([z.string(), z.number()]),
      unit: z.string().optional(),
      referenceRange: z.string().optional(),
      interpretation: z.enum(['normal', 'low', 'high', 'critical']).optional(),
      effectiveDate: z.string(),
      status: z.enum(['final', 'preliminary', 'amended']),
    })).optional(),
    vitalSigns: z.object({
      temperature: z.number().optional(),
      bloodPressureSystolic: z.number().optional(),
      bloodPressureDiastolic: z.number().optional(),
      heartRate: z.number().optional(),
      respiratoryRate: z.number().optional(),
      oxygenSaturation: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
      bmi: z.number().optional(),
      recordedAt: z.string().optional(),
    }).optional(),
    demographics: z.object({
      age: z.number(),
      gender: z.enum(['male', 'female', 'other', 'unknown']),
      birthDate: z.string(),
      pregnant: z.boolean().optional(),
      breastfeeding: z.boolean().optional(),
      smoking: z.boolean().optional(),
      alcohol: z.boolean().optional(),
    }).optional(),
  }),
});

/**
 * POST /api/cds/evaluate
 * Evaluate CDS rules for patient context
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = evaluateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: parsed.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      const { patientId, encounterId, hookType, context: reqContext } = parsed.data;
      const startTime = Date.now();

      // 1. Log PATIENT_DATA_ACCESS governance event
      const accessedFields: string[] = [];
      if (reqContext.medications?.length) accessedFields.push('medications');
      if (reqContext.allergies?.length) accessedFields.push('allergies');
      if (reqContext.conditions?.length) accessedFields.push('conditions');
      if (reqContext.labResults?.length) accessedFields.push('labResults');
      if (reqContext.vitalSigns) accessedFields.push('vitalSigns');
      if (reqContext.demographics) accessedFields.push('demographics');

      logPatientDataAccess({
        actor: context.user.id,
        patientId,
        fields: accessedFields,
        purpose: `CDS evaluation (${hookType})`,
        traceId: context.requestId,
      });

      // 2. Broader CDS engine evaluation (graceful degradation if Redis is down)
      let engineResult: CDSEvaluationResult | null = null;
      let engineWarning: string | null = null;

      try {
        const cdsContext: CDSContext = {
          patientId,
          encounterId,
          userId: context.user.id,
          hookInstance: uuidv4(),
          hookType: hookType as CDSHookType,
          context: reqContext as CDSContext['context'],
        };

        engineResult = await cdsEngine.evaluate(cdsContext);
      } catch (err) {
        engineWarning = 'CDS engine unavailable — DOAC safety evaluation still active';
        logger.warn('[CDS Evaluate] Engine error (graceful degradation):', err);
      }

      // 3. DOAC Safety Evaluation — runs for medication-prescribe / order-sign hooks
      const doacAlerts: CDSAlert[] = [];
      const shouldRunDOAC =
        (hookType === 'medication-prescribe' || hookType === 'order-sign') &&
        reqContext.medications?.length;

      if (shouldRunDOAC) {
        for (const med of reqContext.medications!) {
          const genericName = (med.genericName ?? med.name).toLowerCase();
          const matchedDOAC = DOAC_NAMES.find((d) => genericName.includes(d)) as DOACType | undefined;

          if (!matchedDOAC) continue;

          // Extract CrCl from lab results
          const crClLab = reqContext.labResults?.find(
            (l) =>
              l.testName.toLowerCase().includes('creatinine clearance') ||
              l.testName.toLowerCase().includes('crcl')
          );
          const crCl = crClLab ? parseFloat(String(crClLab.value)) : null;

          const doacResult = evaluateDOACRule({
            medication: matchedDOAC,
            patient: {
              creatinineClearance: crCl,
              weight: reqContext.vitalSigns?.weight ?? null,
              age: reqContext.demographics?.age ?? null,
              labTimestamp: crClLab?.effectiveDate ?? null,
            },
          });

          // Log DOAC evaluation governance event
          logDOACEvaluation({
            actor: context.user.id,
            patientId,
            medication: matchedDOAC,
            severity: doacResult.severity,
            ruleId: doacResult.ruleId,
            traceId: context.requestId,
          });

          // Log attestation event if triggered
          if (doacResult.severity === 'ATTESTATION_REQUIRED') {
            logAttestationRequired({
              actor: context.user.id,
              patientId,
              medication: matchedDOAC,
              reason: doacResult.missingFields?.length
                ? 'MISSING_DATA'
                : 'STALE_RENAL_LABS',
              missingFields: doacResult.missingFields,
              staleSince: doacResult.staleSince,
              traceId: context.requestId,
            });
          }

          if (doacResult.severity !== 'PASS') {
            const alertSeverity =
              doacResult.severity === 'BLOCK'
                ? 'critical'
                : 'warning';

            doacAlerts.push({
              id: uuidv4(),
              ruleId: doacResult.ruleId,
              source: {
                label: 'Cortex DOAC Safety',
                url: doacResult.citationUrl,
              },
              severity: alertSeverity,
              category: 'contraindication',
              indicator: alertSeverity,
              summary:
                doacResult.severity === 'BLOCK'
                  ? `CONTRAINDICATED: ${matchedDOAC}`
                  : doacResult.severity === 'ATTESTATION_REQUIRED'
                    ? `Attestation Required: ${matchedDOAC}`
                    : `Caution: ${matchedDOAC}`,
              detail: doacResult.rationale,
              links: doacResult.citationUrl
                ? [{ label: 'Evidence', url: doacResult.citationUrl, type: 'absolute' as const }]
                : [],
              suggestions: [],
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      // 4. Merge alerts: DOAC safety first, then engine alerts
      const engineAlerts = engineResult?.alerts ?? [];
      const allAlerts = [...doacAlerts, ...engineAlerts];

      // 5. Separate prevention alerts for dedicated section (backwards-compatible)
      const preventionAlerts = allAlerts.filter((a) => a.category === 'preventive-care');
      const clinicalAlerts = allAlerts.filter((a) => a.category !== 'preventive-care');

      const processingTime = Date.now() - startTime;

      const governance = getGovernanceMetadata({
        actor: context.user.id,
        patientId,
        traceId: context.requestId,
      });

      return NextResponse.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          hookType,
          context: {
            patientId,
            encounterId,
            userId: context.user.id,
          },
          alerts: allAlerts,
          cards: allAlerts, // CDS Hooks 2.0 alias
          prevention: preventionAlerts.length > 0 ? {
            alerts: preventionAlerts,
            screeningGaps: preventionAlerts.length,
          } : undefined,
          rulesEvaluated: (engineResult?.rulesEvaluated ?? 0) + (shouldRunDOAC ? reqContext.medications!.length : 0),
          rulesFired: allAlerts.length,
          processingTime,
          governance,
          ...(engineWarning ? { warnings: [engineWarning] } : {}),
        },
      });
    } catch (error) {
      return safeErrorResponse(error, {
        userMessage: 'CDS evaluation failed',
      });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'],
    rateLimit: { windowMs: 60_000, maxRequests: 120 },
    skipCsrf: true,
    audit: { action: 'CDS_EVALUATE', resource: 'ClinicalDecisionSupport' },
  }
);

/**
 * GET /api/cds/evaluate
 * Return API documentation and registered rules
 */
export const GET = createProtectedRoute(
  async () => {
    let currentRules: any[] = [];
    try {
      currentRules = cdsEngine.getRules().map((rule) => ({
        id: rule.id,
        name: rule.name,
        category: rule.category,
        severity: rule.severity,
        triggerHooks: rule.triggerHooks,
        enabled: rule.enabled,
        evidenceStrength: rule.evidenceStrength,
        source: rule.source,
      }));
    } catch {
      // CDS engine may fail to initialize if Redis is not available — return empty rules
    }

    return NextResponse.json({
      service: 'CDS Evaluation API',
      version: '2.0.0',
      description: 'Evaluates clinical decision support rules for patient context',
      compliance: ['CDS Hooks 2.0', 'HL7 FHIR R4', 'HIPAA', 'FDA 21 CFR Part 11'],
      endpoints: {
        'POST /api/cds/evaluate': {
          description: 'Evaluate CDS rules for a patient',
          authentication: 'Required (Session or Agent Gateway)',
          roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'],
          requestBody: {
            patientId: 'string (required)',
            encounterId: 'string (optional)',
            hookType: 'CDSHookType (required)',
            context: {
              patientId: 'string',
              medications: 'Medication[]',
              allergies: 'Allergy[]',
              conditions: 'Condition[]',
              labResults: 'LabResult[]',
              vitalSigns: 'VitalSigns',
              demographics: 'PatientDemographics',
            },
          },
        },
      },
      hookTypes: [
        'patient-view',
        'medication-prescribe',
        'order-select',
        'order-sign',
        'encounter-start',
        'encounter-discharge',
      ],
      doacMedications: DOAC_NAMES,
      currentRules,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
    skipCsrf: true,
  }
);
