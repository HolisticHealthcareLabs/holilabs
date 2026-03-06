/**
 * LGPD Art. 18 (VI) — Right to Erasure: Deletion Request
 *
 * POST /api/patients/[id]/deletion-request
 * Initiates a LGPD erasure request with two-step confirmation.
 *
 * @compliance LGPD Art. 18 (VI) — Right to erasure of unnecessary data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = context.params?.id;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const user = context.user;
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Authorization check
    if (user.role !== 'ADMIN') {
      const hasAccess = await verifyPatientAccess(user.id, patientId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have permission to request deletion for this patient' },
          { status: 403 }
        );
      }
    }

    // Check for existing pending deletion request (prevent duplicates)
    const existingRequest = await prisma.deletionRequest.findFirst({
      where: { patientId, status: 'PENDING_CONFIRMATION' },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A deletion request is already pending for this patient' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const legalBasis = body.legalBasis || 'LGPD_ARTICLE_18';

    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const deletionRequest = await prisma.deletionRequest.create({
      data: {
        patientId,
        requestedById: user.id,
        legalBasis,
        status: 'PENDING_CONFIRMATION',
        confirmationToken,
        confirmationDeadline,
      } as any,
    });

    return NextResponse.json(
      {
        id: deletionRequest.id,
        status: deletionRequest.status,
        legalBasis,
        confirmationToken,
        confirmationDeadline: confirmationDeadline.toISOString(),
        message: 'Deletion request created. Confirm within 7 days to proceed.',
      },
      { status: 201 }
    );
  },
  { skipCsrf: true }
);
