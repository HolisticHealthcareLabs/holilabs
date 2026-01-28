/**
 * Clinical Primitive: Get Treatment Options
 *
 * Atomic primitive that returns treatment recommendations for a condition.
 * Part of the decomposed clinical-decision tool for agent-native architecture.
 *
 * POST /api/clinical/primitives/get-treatment-options
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { verifyInternalAgentToken } from '@/lib/hash';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { treatmentProtocolEngine } from '@/lib/clinical/engines/treatment-protocol-engine';
import type { PatientContext } from '@holilabs/shared-types';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  icd10Code: z.string().min(1).max(20),
  patientId: z.string().optional(),
  age: z.number().min(0).max(150).optional(),
  sex: z.enum(['M', 'F', 'O']).optional(),
  currentMedications: z.array(z.string()).optional().default([]),
  allergies: z.array(z.string()).optional().default([]),
  diagnoses: z.array(z.string()).optional().default([]),
});

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

    const { icd10Code, patientId, age, sex, currentMedications, allergies, diagnoses } = validation.data;

    // Build patient context
    const patientContext: PatientContext = {
      patientId: patientId || 'anonymous',
      age: age || 0,
      sex: sex || 'O',
      diagnoses: diagnoses.map((d, i) => ({
        id: `dx_${i}`,
        icd10Code: d,
        name: d,
        clinicalStatus: 'ACTIVE' as const,
      })),
      medications: currentMedications.map((m, i) => ({
        id: `med_${i}`,
        name: m,
        status: 'ACTIVE' as const,
      })),
      allergies: allergies.map((a, i) => ({
        id: `allergy_${i}`,
        allergen: a,
        type: 'OTHER' as const,
        severity: 'moderate' as const,
        status: 'ACTIVE' as const,
      })),
      recentLabs: [],
    };

    logger.info({
      event: 'primitive_get_treatment_options_start',
      icd10Code,
      patientId,
    });

    // Use the treatment protocol engine
    const result = await treatmentProtocolEngine.getRecommendations(icd10Code, patientContext);

    const latencyMs = Date.now() - startTime;

    // Audit log
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'ClinicalPrimitive',
        resourceId: 'get-treatment-options',
        details: {
          icd10Code,
          recommendationCount: result.data.length,
          method: result.method,
          latencyMs,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'primitive_get_treatment_options_complete',
      method: result.method,
      recommendationCount: result.data.length,
      latencyMs,
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendations: result.data,
        condition: icd10Code,
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
      event: 'primitive_get_treatment_options_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to get treatment options' },
      { status: 500 }
    );
  }
}
