/**
 * Doctor Preferences API Routes
 * GET /api/doctors/[id]/preferences - Get doctor scheduling preferences
 * PATCH /api/doctors/[id]/preferences - Update doctor preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/doctors/[id]/preferences
 * Fetches doctor scheduling preferences
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const doctorId = params.id;

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: 'Doctor ID required' },
        { status: 400 }
      );
    }

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    if (doctor.role !== 'CLINICIAN' && doctor.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'User is not a clinician' },
        { status: 400 }
      );
    }

    const preferences = await prisma.doctorPreferences.findUnique({
      where: { doctorId },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!preferences) {
      return NextResponse.json({
        success: true,
        data: {
          preferences: {
            doctorId,
            workingDays: [1, 2, 3, 4, 5],
            workingHoursStart: '09:00',
            workingHoursEnd: '17:00',
            minimumAdvanceNotice: 24,
            appointmentDuration: 30,
            bufferBetweenSlots: 0,
            allowSameDayBooking: false,
            allowWeekendBooking: false,
            autoApproveReschedule: false,
            allowPatientReschedule: true,
            rescheduleMinNotice: 12,
            requireConfirmation: true,
            confirmationDeadline: 24,
            weeklyViewDays: [1, 2, 3, 4, 5],
            notifyOnNewBooking: true,
            notifyOnReschedule: true,
            notifyOnCancellation: true,
          },
        },
        message: 'Using default preferences (not yet saved)',
      });
    }

    return NextResponse.json({
      success: true,
      data: { preferences },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);

/**
 * PATCH /api/doctors/[id]/preferences
 * Updates or creates doctor scheduling preferences
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const doctorId = params.id;

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: 'Doctor ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const userId = context.user!.id;
    const userRole = context.user!.role;

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    if (doctor.role !== 'CLINICIAN' && doctor.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'User is not a clinician' },
        { status: 400 }
      );
    }

    if (userRole !== 'ADMIN' && userId !== doctorId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own preferences' },
        { status: 403 }
      );
    }

    if (body.workingDays && !Array.isArray(body.workingDays)) {
      return NextResponse.json(
        { success: false, error: 'workingDays must be an array' },
        { status: 400 }
      );
    }

    if (body.weeklyViewDays && !Array.isArray(body.weeklyViewDays)) {
      return NextResponse.json(
        { success: false, error: 'weeklyViewDays must be an array' },
        { status: 400 }
      );
    }

    const preferences = await prisma.doctorPreferences.upsert({
      where: { doctorId },
      create: {
        doctorId,
        ...body,
      },
      update: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'DoctorPreferences',
        resourceId: preferences.id,
        details: {
          doctorId,
          changes: body,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: { preferences },
      message: 'Preferences updated successfully',
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
