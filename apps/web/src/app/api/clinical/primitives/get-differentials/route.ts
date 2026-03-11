/**
 * Clinical Primitive: Get Differential Diagnoses
 *
 * Atomic primitive that returns differential diagnoses for symptoms.
 * Part of the decomposed clinical-decision tool for agent-native architecture.
 *
 * POST /api/clinical/primitives/get-differentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';
import { symptomDiagnosisEngine } from '@/lib/clinical/engines/symptom-diagnosis-engine';
import type { SymptomInput, PatientContext } from '@holilabs/shared-types';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

const requestSchema = z.object({
  chiefComplaint: z.string().min(1).max(1000),
  symptoms: z.array(z.string().max(200)).max(50).optional().default([]),
  duration: z.string().max(200).optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  patientId: z.string().optional(),
  age: z.number().min(0).max(150).optional(),
  sex: z.enum(['M', 'F', 'O']).optional(),
});

export const POST = createProtectedRoute(
  async (req: NextRequest): Promise<NextResponse> => {
  const startTime = Date.now();

  try {
    // Validate request
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { chiefComplaint, symptoms, duration, severity, patientId, age, sex } = validation.data;

    // Build symptom input
    const symptomInput: SymptomInput = {
      chiefComplaint,
      duration,
      severity,
      associatedSymptoms: symptoms,
    };

    // Build minimal patient context
    const patientContext: PatientContext = {
      patientId: patientId || 'anonymous',
      age: age || 0,
      sex: sex || 'O',
      diagnoses: [],
      medications: [],
      allergies: [],
      recentLabs: [],
    };

    logger.info({
      event: 'primitive_get_differentials_start',
      chiefComplaint,
      symptomCount: symptoms.length,
    });

    // Use the symptom diagnosis engine
    const result = await symptomDiagnosisEngine.evaluate(symptomInput, patientContext);

    const latencyMs = Date.now() - startTime;

    // Audit log
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'ClinicalPrimitive',
        resourceId: 'get-differentials',
        details: {
          chiefComplaint,
          symptomCount: symptoms.length,
          differentialCount: result.data.differentials.length,
          method: result.method,
          latencyMs,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'primitive_get_differentials_complete',
      method: result.method,
      differentialCount: result.data.differentials.length,
      latencyMs,
    });

    return NextResponse.json({
      success: true,
      data: {
        differentials: result.data.differentials,
        urgency: result.data.urgency,
      },
      metadata: {
        method: result.method,
        confidence: result.confidence,
        fallbackReason: result.fallbackReason,
        latencyMs,
      },
    });
  } catch (error) {
    logger.error({
      event: 'primitive_get_differentials_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to get differentials' },
      { status: 500 }
    );
  }
},
  { roles: [...ROLES] }
);
