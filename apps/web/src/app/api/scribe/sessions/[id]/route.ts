/**
 * Scribe Session Detail API
 *
 * GET /api/scribe/sessions/:id - Get session with transcription and SOAP note
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/scribe/sessions/:id
 * Get session details with transcription and SOAP note
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const sessionId = context.params.id;

      // Verify session belongs to this clinician
      const session = await prisma.scribeSession.findFirst({
        where: {
          id: sessionId,
          clinicianId: context.user.id,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              dateOfBirth: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialty: true,
            },
          },
          transcription: true,
          soapNote: true,
        },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      console.error('Error fetching session:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session', message: error.message },
        { status: 500 }
      );
    }
  }
);
