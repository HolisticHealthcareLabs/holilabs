/**
 * Doctor Preferences API Routes
 * GET /api/doctors/[id]/preferences - Get doctor scheduling preferences
 * PATCH /api/doctors/[id]/preferences - Update doctor preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

/**
 * GET /api/doctors/[id]/preferences
 * Fetches doctor scheduling preferences
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await limiter.check(request, 60, 'DOCTOR_PREFERENCES_GET');

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const doctorId = params.id;

    // Verify doctor exists
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

    if (doctor.role !== 'DOCTOR' && doctor.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'User is not a doctor' },
        { status: 400 }
      );
    }

    // Fetch preferences
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

    // If no preferences exist, return default values
    if (!preferences) {
      return NextResponse.json({
        success: true,
        data: {
          preferences: {
            doctorId,
            workingDays: [1, 2, 3, 4, 5], // Monday-Friday
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
  } catch (error: any) {
    console.error('Error fetching doctor preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/doctors/[id]/preferences
 * Updates or creates doctor scheduling preferences
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await limiter.check(request, 30, 'DOCTOR_PREFERENCES_PATCH');

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const doctorId = params.id;
    const body = await request.json();

    // Verify doctor exists
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

    if (doctor.role !== 'DOCTOR' && doctor.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'User is not a doctor' },
        { status: 400 }
      );
    }

    // Authorization: Only the doctor themselves or admin can update preferences
    if (session.user.role !== 'ADMIN' && session.user.id !== doctorId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own preferences' },
        { status: 403 }
      );
    }

    // Validation
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

    // Upsert preferences (create if not exists, update if exists)
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

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
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
  } catch (error: any) {
    console.error('Error updating doctor preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
