/**
 * POST /api/prescriptions/safety-check
 *
 * Thin HTTP adapter — delegates all evaluation logic to the shared
 * evaluatePrescriptionSafety() service, keeping this route as a
 * pure request/response boundary.
 *
 * @compliance FDA 21 CFR Part 11, HIPAA, LGPD, ANVISA Class I
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { evaluatePrescriptionSafety } from '@/lib/clinical/safety/evaluate-prescription';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { patientId, medications, encounter, payer, context: clinicalCtx } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Missing required field: patientId' }, { status: 400 });
    }
    if (!Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: medications (non-empty array)' },
        { status: 400 }
      );
    }

    const result = await evaluatePrescriptionSafety(
      medications,
      encounter,
      payer,
      clinicalCtx,
      {
        actorId: context.user?.id ?? 'system',
        patientId,
        traceId: uuidv4(),
      }
    );

    return NextResponse.json({
      ...result,
      recommendations: result.signal
        .filter((a) => a.suggestions?.length)
        .flatMap((a) => a.suggestions!.map((s) => s.label)),
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'],
    skipCsrf: false,
  }
);
