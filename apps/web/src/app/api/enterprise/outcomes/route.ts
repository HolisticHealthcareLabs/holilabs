/**
 * Enterprise Outcomes API — Blue Ocean Phase 5
 *
 * POST /api/enterprise/outcomes — Record a patient outcome
 * Auth: x-pharma-partner-key
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEnterpriseKey } from '@/lib/enterprise/auth';
import { outcomeTrackerService, type PatientOutcomeType } from '@/services/outcome-tracker.service';

export const dynamic = 'force-dynamic';

const VALID_OUTCOME_TYPES: PatientOutcomeType[] = [
  'READMISSION',
  'ADVERSE_EVENT',
  'COMPLICATION',
  'RESOLVED',
];

export async function POST(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    if (!body.anonymizedPatientId || typeof body.anonymizedPatientId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'anonymizedPatientId is required' },
        { status: 400 },
      );
    }

    if (!VALID_OUTCOME_TYPES.includes(body.outcomeType)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `outcomeType must be one of: ${VALID_OUTCOME_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const record = outcomeTrackerService.recordOutcome({
      anonymizedPatientId: body.anonymizedPatientId,
      outcomeType: body.outcomeType,
      linkedOverrideIds: body.linkedOverrideIds,
      metadata: body.metadata,
      recordedBy: 'enterprise-api',
    });

    return NextResponse.json({
      __format: 'enterprise_outcome_v1',
      outcome: record,
      meta: { apiVersion: '1.0.0' },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to record outcome.' },
      { status: 500 },
    );
  }
}
