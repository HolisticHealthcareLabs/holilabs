import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  generateSchedule,
  createScheduledTimesForDate,
} from '@/lib/mar/schedule-generator';
import { logger } from '@/lib/logger';

/**
 * MAR Schedule Management API
 *
 * Generates and manages medication administration schedules
 * Converts frequency codes (BID, TID, Q4H) into actual scheduled times
 */

// POST: Generate schedules for a medication
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { medicationId, startDate, endDate } = body;

    if (!medicationId) {
      return NextResponse.json({ error: 'Medication ID is required' }, { status: 400 });
    }

    // Fetch medication
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
      include: { patient: true },
    });

    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // Generate schedule from frequency
    const scheduleConfig = generateSchedule(medication.frequency);

    // If PRN, don't create regular schedules
    if (scheduleConfig.isPRN) {
      return NextResponse.json({
        message: 'PRN medication - no regular schedule created',
        frequency: medication.frequency,
        isPRN: true,
        schedules: [],
      });
    }

    // Create schedule records for each time slot
    const start = startDate ? new Date(startDate) : medication.startDate;
    const end = endDate ? new Date(endDate) : medication.endDate;

    const schedules = [];
    for (const time of scheduleConfig.scheduledTimes) {
      const schedule = await prisma.medicationSchedule.create({
        data: {
          medicationId: medication.id,
          patientId: medication.patientId,
          scheduledTime: new Date(`1970-01-01T${time.label}:00`), // Store time only
          frequency: medication.frequency,
          timesPerDay: scheduleConfig.timesPerDay,
          isPRN: false,
          isActive: true,
          startDate: start,
          endDate: end,
        },
      });
      schedules.push(schedule);
    }

    return NextResponse.json({
      message: `Created ${schedules.length} schedules`,
      frequency: medication.frequency,
      timesPerDay: scheduleConfig.timesPerDay,
      schedules,
    });
  } catch (error) {
    logger.error({
      event: 'mar_schedule_generation_failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to generate schedules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Fetch schedules for a patient or medication
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const medicationId = searchParams.get('medicationId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!patientId && !medicationId) {
      return NextResponse.json({ error: 'Patient ID or Medication ID is required' }, { status: 400 });
    }

    const where: any = { isActive: true };
    if (patientId) where.patientId = patientId;
    if (medicationId) where.medicationId = medicationId;

    const schedules = await prisma.medicationSchedule.findMany({
      where,
      include: {
        medication: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
          },
        },
        administrations: {
          where: date
            ? {
                scheduledTime: {
                  gte: new Date(`${date}T00:00:00`),
                  lt: new Date(`${date}T23:59:59`),
                },
              }
            : undefined,
          orderBy: { scheduledTime: 'desc' },
          take: 10,
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    return NextResponse.json({
      schedules,
      count: schedules.length,
    });
  } catch (error) {
    logger.error({
      event: 'mar_schedules_fetch_failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// DELETE: Remove a schedule
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    // Soft delete - mark as inactive
    await prisma.medicationSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Schedule deactivated',
    });
  } catch (error) {
    logger.error({
      event: 'mar_schedule_delete_failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
