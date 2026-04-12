import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const id = context.params?.id;

      const incident = await prisma.safetyIncident.findUnique({
        where: { id },
        include: {
          correctiveActions: true,
          reportedBy: { select: { id: true, firstName: true, lastName: true } },
          leadInvestigator: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }

      return NextResponse.json({ data: incident });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch safety incident' });
    }
  },
  {
    roles: ['ADMIN', 'PHYSICIAN', 'CLINICIAN'] as any,
    audit: { action: 'READ', resource: 'SafetyIncident' },
    skipCsrf: true,
  },
);
