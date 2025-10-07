/**
 * Scribe Sessions API
 *
 * POST /api/scribe/sessions - Create new scribe session
 * GET  /api/scribe/sessions - List scribe sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/scribe/sessions
 * Create a new scribe session (start recording)
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const { patientId, appointmentId } = body;

      if (!patientId) {
        return NextResponse.json(
          { error: 'Patient ID is required' },
          { status: 400 }
        );
      }

      // SECURITY: Verify clinician has access to this patient
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          assignedClinicianId: context.user.id,
        },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found or access denied' },
          { status: 404 }
        );
      }

      // Verify appointment if provided
      if (appointmentId) {
        const appointment = await prisma.appointment.findFirst({
          where: {
            id: appointmentId,
            clinicianId: context.user.id,
            patientId,
          },
        });

        if (!appointment) {
          return NextResponse.json(
            { error: 'Appointment not found or access denied' },
            { status: 404 }
          );
        }
      }

      // Create scribe session
      const session = await prisma.scribeSession.create({
        data: {
          patientId,
          clinicianId: context.user.id,
          appointmentId,
          status: 'RECORDING',
          transcriptionModel: 'whisper-1',
          soapModel: 'claude-3-5-sonnet-20250219',
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              tokenId: true,
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
        },
      });

      return NextResponse.json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      console.error('Error creating scribe session:', error);
      return NextResponse.json(
        { error: 'Failed to create scribe session', message: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * GET /api/scribe/sessions
 * List scribe sessions with pagination
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);

      // Pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      // Filters
      const patientId = searchParams.get('patientId');
      const status = searchParams.get('status');

      // Build where clause with tenant isolation
      const where: any = {
        clinicianId: context.user.id, // CRITICAL: Only show this clinician's sessions
      };

      if (patientId) {
        where.patientId = patientId;
      }

      if (status) {
        where.status = status;
      }

      // Execute query
      const [sessions, total] = await Promise.all([
        prisma.scribeSession.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
                tokenId: true,
              },
            },
            transcription: {
              select: {
                id: true,
                confidence: true,
                wordCount: true,
                durationSeconds: true,
              },
            },
            soapNote: {
              select: {
                id: true,
                status: true,
                overallConfidence: true,
                signedAt: true,
              },
            },
          },
        }),
        prisma.scribeSession.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching scribe sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scribe sessions', message: error.message },
        { status: 500 }
      );
    }
  }
);
