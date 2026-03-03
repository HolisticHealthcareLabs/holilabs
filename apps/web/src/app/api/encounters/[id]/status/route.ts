/**
 * PATCH /api/encounters/[id]/status
 *
 * Update ClinicalEncounter status with state machine validation.
 * Valid transitions: SCHEDULED → CHECKED_IN → IN_PROGRESS → COMPLETED
 * CANCELLED can be reached from any state.
 *
 * @compliance HIPAA Audit Trail, LGPD
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logSafetyRuleFired } from '@/lib/clinical/safety/governance-events';

export const dynamic = 'force-dynamic';

// Valid state machine transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED:  ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:['COMPLETED', 'CANCELLED'],
  COMPLETED:  [],
  CANCELLED:  [],
};

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const encounterId = context.params?.id;
    if (!encounterId) {
      return NextResponse.json({ error: 'Missing encounter ID' }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status: newStatus } = body;
    if (!newStatus) {
      return NextResponse.json({ error: 'Missing required field: status' }, { status: 400 });
    }

    const encounter = await prisma.clinicalEncounter.findUnique({
      where: { id: encounterId },
      select: { id: true, status: true, patientId: true, providerId: true },
    });

    if (!encounter) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 });
    }

    // RBAC: only assigned provider or admin may update
    if (encounter.providerId !== context.user.id && context.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: not the assigned provider' }, { status: 403 });
    }

    const allowed = VALID_TRANSITIONS[encounter.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${encounter.status} → ${newStatus}`,
          allowedTransitions: allowed,
        },
        { status: 422 }
      );
    }

    const updated = await prisma.clinicalEncounter.update({
      where: { id: encounterId },
      data: {
        status: newStatus,
        startedAt: newStatus === 'IN_PROGRESS' ? new Date() : undefined,
        endedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });

    logSafetyRuleFired({
      actor: context.user.id,
      patientId: encounter.patientId,
      ruleId: 'ENC-STATUS',
      ruleName: 'Encounter Status Update',
      severity: 'info',
      description: `Encounter ${encounterId}: ${encounter.status} → ${newStatus}`,
    });

    return NextResponse.json({ encounter: updated });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'] }
);
