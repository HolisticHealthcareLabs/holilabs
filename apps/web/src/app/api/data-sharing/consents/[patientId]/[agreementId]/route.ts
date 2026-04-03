import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { revokeConsent } from '@/lib/care-coordination/cross-org.service';

export const dynamic = 'force-dynamic';

export const DELETE = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const patientId = context.params?.patientId;
      const agreementId = context.params?.agreementId;

      if (!patientId || !agreementId) {
        return NextResponse.json(
          { error: 'Missing patient ID or agreement ID' },
          { status: 400 },
        );
      }

      // CYRUS: tenant isolation — verify clinician has access to this patient (CVI-002)
      const hasAccess = await verifyPatientAccess(context.user.id, patientId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this patient record' }, { status: 403 });
      }

      await revokeConsent(prisma, patientId, agreementId, context.user.id);

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('No consent record found')) {
          return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error.message.includes('already been revoked')) {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
      }
      return safeErrorResponse(error, { userMessage: 'Failed to revoke consent' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN'] as any,
    audit: { action: 'DELETE', resource: 'PatientSharingConsent' },
  },
);
