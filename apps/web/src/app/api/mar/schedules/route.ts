import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import {
  generateSchedule,
} from '@/lib/mar/schedule-generator';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

/**
 * MAR Schedule Management API
 *
 * Generates and manages medication administration schedules
 */

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const { medicationId, startDate, endDate } = body;
      const userId = context.user!.id;
      const userEmail = context.user!.email;

      if (!medicationId) {
        return NextResponse.json(
          { error: 'Medication ID is required' },
          { status: 400 }
        );
      }

      const medication = await prisma.medication.findUnique({
        where: { id: medicationId },
        include: { patient: true },
      });

      if (!medication) {
        return NextResponse.json(
          { error: 'Medication not found' },
          { status: 404 }
        );
      }

      // CYRUS: tenant isolation — verify clinician has access to this patient (CVI-002)
      const hasAccess = await verifyPatientAccess(context.user!.id, medication.patientId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this patient record' }, { status: 403 });
      }

      const scheduleConfig = generateSchedule(medication.frequency);

      if (scheduleConfig.isPRN) {
        return NextResponse.json({
          message: 'PRN medication - no regular schedule created',
          frequency: medication.frequency,
          isPRN: true,
          schedules: [],
        });
      }

      const start = startDate ? new Date(startDate) : medication.startDate;
      const end = endDate ? new Date(endDate) : medication.endDate;

      const schedules = [];
      for (const time of scheduleConfig.scheduledTimes) {
        const schedule = await prisma.medicationSchedule.create({
          data: {
            medicationId: medication.id,
            patientId: medication.patientId,
            scheduledTime: new Date(`1970-01-01T${time.label}:00`),
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

      await logAuditEvent(
        {
          action: 'CREATE',
          resource: 'MedicationSchedule',
          resourceId: medicationId,
          details: {
            medicationId,
            medicationName: medication.name,
            patientId: medication.patientId,
            frequency: medication.frequency,
            schedulesCreated: schedules.length,
            startDate: start.toISOString(),
            endDate: end?.toISOString(),
            accessType: 'MAR_SCHEDULE_CREATE',
          },
        },
        request,
        userId,
        userEmail || undefined
      );

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
      });
      return safeErrorResponse(error, { userMessage: 'Failed to generate schedules' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const userId = context.user!.id;
      const userEmail = context.user!.email;

      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');
      const medicationId = searchParams.get('medicationId');
      const date = searchParams.get('date');

      if (!patientId && !medicationId) {
        return NextResponse.json(
          { error: 'Patient ID or Medication ID is required' },
          { status: 400 }
        );
      }

      // CYRUS: tenant isolation — verify clinician has access to this patient (CVI-002)
      if (patientId) {
        const hasAccess = await verifyPatientAccess(context.user!.id, patientId);
        if (!hasAccess) {
          return NextResponse.json({ error: 'Access denied to this patient record' }, { status: 403 });
        }
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

      await logAuditEvent(
        {
          action: 'READ',
          resource: 'MedicationSchedule',
          resourceId: patientId || medicationId || 'schedules',
          details: {
            patientId,
            medicationId,
            date,
            schedulesAccessed: schedules.length,
            accessType: 'MAR_SCHEDULE_ACCESS',
          },
        },
        request,
        userId,
        userEmail || undefined
      );

      return NextResponse.json({
        schedules,
        count: schedules.length,
      });
    } catch (error) {
      logger.error({
        event: 'mar_schedules_fetch_failed',
        error: error instanceof Error ? error.message : String(error),
      });
      return safeErrorResponse(error, { userMessage: 'Failed to fetch schedules' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const userId = context.user!.id;
      const userEmail = context.user!.email;

      const { searchParams } = new URL(request.url);
      const scheduleId = searchParams.get('scheduleId');

      if (!scheduleId) {
        return NextResponse.json(
          { error: 'Schedule ID is required' },
          { status: 400 }
        );
      }

      // First look up the schedule to verify tenant access before mutating
      const existing = await prisma.medicationSchedule.findUnique({
        where: { id: scheduleId },
        select: { patientId: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
      }

      // CYRUS: tenant isolation — verify clinician has access to this patient (CVI-002)
      const hasAccess = await verifyPatientAccess(context.user!.id, existing.patientId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this patient record' }, { status: 403 });
      }

      const schedule = await prisma.medicationSchedule.update({
        where: { id: scheduleId },
        data: { isActive: false },
        include: {
          patient: { select: { id: true } },
          medication: { select: { name: true } },
        },
      });

      await logAuditEvent(
        {
          action: 'DELETE',
          resource: 'MedicationSchedule',
          resourceId: scheduleId,
          details: {
            scheduleId,
            patientId: schedule.patientId,
            medicationName: schedule.medication.name,
            accessType: 'MAR_SCHEDULE_DELETE',
          },
        },
        request,
        userId,
        userEmail || undefined
      );

      return NextResponse.json({
        success: true,
        message: 'Schedule deactivated',
      });
    } catch (error) {
      logger.error({
        event: 'mar_schedule_delete_failed',
        error: error instanceof Error ? error.message : String(error),
      });
      return safeErrorResponse(error, { userMessage: 'Failed to delete schedule' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
