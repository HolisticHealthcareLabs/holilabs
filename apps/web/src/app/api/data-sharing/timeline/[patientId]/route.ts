import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { getSharedTimeline, canAccessData } from '@/lib/care-coordination/cross-org.service';
import { DataSharingScope } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const patientId = context.params?.patientId;
      if (!patientId) {
        return NextResponse.json({ error: 'Missing patient ID' }, { status: 400 });
      }

      // CYRUS: tenant isolation — verify clinician has access to this patient (CVI-002)
      const hasAccess = await verifyPatientAccess(context.user.id, patientId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this patient record' }, { status: 403 });
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      const { searchParams } = new URL(request.url);
      const scopeFilter = searchParams.get('scope');

      if (scopeFilter) {
        const scope = scopeFilter as DataSharingScope;
        const accessResult = await canAccessData(
          prisma,
          context.user.id,
          context.user.organizationId,
          patientId,
          scope,
        );

        if (!accessResult.allowed) {
          return NextResponse.json(
            { error: accessResult.reason },
            { status: 403 },
          );
        }
      }

      const timeline = await getSharedTimeline(
        prisma,
        patientId,
        context.user.id,
        context.user.organizationId,
      );

      return NextResponse.json({ data: timeline });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch shared timeline' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN'] as any,
    audit: { action: 'READ', resource: 'SharedCareRecord' },
  },
);
