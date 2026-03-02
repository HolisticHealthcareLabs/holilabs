/**
 * Appointment Situations API Routes
 * POST /api/appointments/[id]/situations - Add situation to appointment
 * DELETE /api/appointments/[id]/situations - Remove situation from appointment
 *
 * @compliance HIPAA, createProtectedRoute auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const AddSituationSchema = z.object({
  situationId: z.string().min(1, 'situationId is required'),
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/appointments/[id]/situations
 * Adds a situation tag to an appointment
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const appointmentId = context.params?.id;

      if (!appointmentId) {
        return NextResponse.json(
          { error: 'Appointment ID is required' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const parsed = AddSituationSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: parsed.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      const { situationId, notes } = parsed.data;

      // Verify appointment exists and user has access
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true, clinician: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // Check if situation already exists on appointment
      const existing = await prisma.appointmentSituation.findUnique({
        where: {
          appointmentId_situationId: {
            appointmentId,
            situationId,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Situation already added to this appointment' },
          { status: 400 }
        );
      }

      // Add situation to appointment
      const appointmentSituation = await prisma.appointmentSituation.create({
        data: {
          appointmentId,
          situationId,
          addedBy: context.user.id,
          notes,
        },
        include: {
          situation: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: { appointmentSituation },
        message: 'Situation added successfully',
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to add situation' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
    audit: { action: 'CREATE', resource: 'AppointmentSituation' },
  }
);

/**
 * DELETE /api/appointments/[id]/situations
 * Removes a situation tag from an appointment
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const appointmentId = context.params?.id;

      if (!appointmentId) {
        return NextResponse.json(
          { error: 'Appointment ID is required' },
          { status: 400 }
        );
      }

      const { searchParams } = new URL(request.url);
      const situationId = searchParams.get('situationId');

      if (!situationId) {
        return NextResponse.json(
          { error: 'situationId query parameter is required' },
          { status: 400 }
        );
      }

      // Verify appointment exists
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // Remove situation from appointment
      await prisma.appointmentSituation.delete({
        where: {
          appointmentId_situationId: {
            appointmentId,
            situationId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Situation removed successfully',
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to remove situation' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
    audit: { action: 'DELETE', resource: 'AppointmentSituation' },
  }
);
