/**
 * CDS Evaluation API Endpoint
 *
 * Evaluates clinical decision support rules for a given patient context
 * Returns alerts and recommendations based on configured rules
 *
 * POST /api/cds/evaluate
 *
 * @compliance CDS Hooks 2.0, HL7 FHIR, HIPAA
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext, CDSHookType } from '@/lib/cds/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request body schema
 */
interface CDSEvaluationRequest {
  patientId: string;
  encounterId?: string;
  hookType: CDSHookType;
  context: {
    patientId: string;
    encounterId?: string;
    medications?: Array<{
      id: string;
      name: string;
      genericName?: string;
      rxNormCode?: string;
      dosage?: string;
      frequency?: string;
      route?: string;
      status: 'active' | 'completed' | 'discontinued' | 'draft';
    }>;
    allergies?: Array<{
      id: string;
      allergen: string;
      allergenCode?: string;
      reaction?: string;
      severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
      verificationStatus: 'confirmed' | 'unconfirmed' | 'refuted';
    }>;
    conditions?: Array<{
      id: string;
      code: string;
      display: string;
      icd10Code?: string;
      snomedCode?: string;
      clinicalStatus: 'active' | 'recurrence' | 'relapse' | 'inactive' | 'remission' | 'resolved';
      verificationStatus: 'confirmed' | 'provisional' | 'differential' | 'refuted';
      recordedDate: string;
    }>;
    labResults?: Array<{
      id: string;
      testName: string;
      loincCode?: string;
      value: string | number;
      unit?: string;
      referenceRange?: string;
      interpretation?: 'normal' | 'low' | 'high' | 'critical';
      effectiveDate: string;
      status: 'final' | 'preliminary' | 'amended';
    }>;
    vitalSigns?: {
      temperature?: number;
      bloodPressureSystolic?: number;
      bloodPressureDiastolic?: number;
      heartRate?: number;
      respiratoryRate?: number;
      oxygenSaturation?: number;
      weight?: number;
      height?: number;
      bmi?: number;
      recordedAt?: string;
    };
    demographics?: {
      age: number;
      gender: 'male' | 'female' | 'other' | 'unknown';
      birthDate: string;
      pregnant?: boolean;
      breastfeeding?: boolean;
      smoking?: boolean;
      alcohol?: boolean;
    };
  };
}

/**
 * POST /api/cds/evaluate
 * Evaluate CDS rules for patient context
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CDSEvaluationRequest = await request.json();

    // Validate required fields
    if (!body.patientId || !body.hookType || !body.context) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required fields: patientId, hookType, and context are required',
        },
        { status: 400 }
      );
    }

    // Validate hookType
    const validHookTypes: CDSHookType[] = [
      'patient-view',
      'medication-prescribe',
      'order-select',
      'order-sign',
      'encounter-start',
      'encounter-discharge',
    ];

    if (!validHookTypes.includes(body.hookType)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid hookType. Must be one of: ${validHookTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Build CDS context
    const cdsContext: CDSContext = {
      patientId: body.patientId,
      encounterId: body.encounterId,
      userId: session.user.id,
      hookInstance: uuidv4(),
      hookType: body.hookType,
      context: body.context,
    };

    console.log(
      `🔍 [CDS API] Evaluating ${body.hookType} for patient ${body.patientId} (user: ${session.user.email})`
    );

    // Evaluate CDS rules
    const startTime = Date.now();
    const result = await cdsEngine.evaluate(cdsContext);
    const evaluationTime = Date.now() - startTime;

    console.log(
      `✅ [CDS API] Evaluation complete: ${result.rulesFired} alerts generated in ${evaluationTime}ms`
    );

    // Return CDS response
    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          cards: result.alerts, // CDS Hooks naming convention
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [CDS API] Error during evaluation:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cds/evaluate
 * Return API documentation
 */
export async function GET() {
  return NextResponse.json({
    service: 'CDS Evaluation API',
    version: '1.0.0',
    description: 'Evaluates clinical decision support rules for patient context',
    compliance: ['CDS Hooks 2.0', 'HL7 FHIR R4', 'HIPAA'],
    endpoints: {
      'POST /api/cds/evaluate': {
        description: 'Evaluate CDS rules for a patient',
        authentication: 'Required (Bearer token)',
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
        response: {
          success: 'boolean',
          data: {
            timestamp: 'string (ISO 8601)',
            hookType: 'CDSHookType',
            alerts: 'CDSAlert[]',
            cards: 'CDSAlert[] (alias for CDS Hooks compatibility)',
            rulesEvaluated: 'number',
            rulesFired: 'number',
            processingTime: 'number (milliseconds)',
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
    ruleCategories: [
      'drug-interaction',
      'allergy',
      'guideline-recommendation',
      'lab-abnormal',
      'preventive-care',
      'duplicate-therapy',
      'contraindication',
      'dosing-guidance',
    ],
    currentRules: cdsEngine.getRules().map(rule => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      triggerHooks: rule.triggerHooks,
      enabled: rule.enabled,
      evidenceStrength: rule.evidenceStrength,
      source: rule.source,
    })),
  });
}
