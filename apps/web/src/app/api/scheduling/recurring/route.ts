/**
 * Recurring Appointments API
 * Industry-grade recurring appointment series management
 *
 * POST /api/scheduling/recurring - Create recurring appointment series
 * GET /api/scheduling/recurring - List recurring series
 *
 * @module api/scheduling/recurring
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { CreateRecurringAppointmentSchema } from '@/lib/api/schemas/scheduling';
import {
  generateRecurringAppointments,
  validateRecurringPattern,
  calculateRecurringStats,
} from '@/lib/scheduling/recurring-generator';
import { addMonths } from 'date-fns';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// POST /api/scheduling/recurring - Create Recurring Appointment Series
// ============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const validated = context.validatedBody;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: validated.patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Patient not found',
        },
        { status: 404 }
      );
    }

    // Verify clinician exists
    const clinician = await prisma.user.findUnique({
      where: { id: validated.clinicianId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!clinician) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Clinician not found',
        },
        { status: 404 }
      );
    }

    if (clinician.role !== 'CLINICIAN' && clinician.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_ROLE',
          message: 'User is not a clinician',
        },
        { status: 400 }
      );
    }

    // Authorization: Only clinician themselves or admin can create appointments
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== validated.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only create appointments for yourself',
        },
        { status: 403 }
      );
    }

    // Validate recurring pattern
    const patternValidation = validateRecurringPattern({
      frequency: validated.frequency,
      interval: validated.interval,
      daysOfWeek: validated.daysOfWeek,
      dayOfMonth: validated.dayOfMonth,
      startTime: validated.startTime,
      duration: validated.duration,
      seriesStart: validated.seriesStart,
      seriesEnd: validated.seriesEnd,
      maxOccurrences: validated.maxOccurrences,
    });

    if (!patternValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PATTERN',
          message: 'Invalid recurrence pattern',
          errors: patternValidation.errors,
        },
        { status: 400 }
      );
    }

    // Calculate statistics
    const stats = calculateRecurringStats({
      frequency: validated.frequency,
      interval: validated.interval,
      daysOfWeek: validated.daysOfWeek,
      dayOfMonth: validated.dayOfMonth,
      startTime: validated.startTime,
      duration: validated.duration,
      seriesStart: validated.seriesStart,
      seriesEnd: validated.seriesEnd,
      maxOccurrences: validated.maxOccurrences,
    });

    // Create recurring appointment series
    const recurringSeries = await prisma.recurringAppointment.create({
      data: {
        patientId: validated.patientId,
        clinicianId: validated.clinicianId,
        frequency: validated.frequency,
        interval: validated.interval,
        daysOfWeek: validated.daysOfWeek || [],
        dayOfMonth: validated.dayOfMonth,
        startTime: validated.startTime,
        duration: validated.duration,
        seriesStart: validated.seriesStart,
        seriesEnd: validated.seriesEnd,
        maxOccurrences: validated.maxOccurrences,
        title: validated.title,
        description: validated.description,
        type: validated.type,
        meetingUrl: validated.meetingUrl,
        isActive: true,
        isPaused: false,
        generatedCount: 0,
        createdBy: context.user?.id,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tokenId: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
          },
        },
      },
    });

    // Generate first batch of appointments (next 90 days)
    const generateUpTo = addMonths(new Date(), 3);
    const generatedSlots = generateRecurringAppointments(
      {
        frequency: validated.frequency,
        interval: validated.interval,
        daysOfWeek: validated.daysOfWeek,
        dayOfMonth: validated.dayOfMonth,
        startTime: validated.startTime,
        duration: validated.duration,
        seriesStart: validated.seriesStart,
        seriesEnd: validated.seriesEnd,
        maxOccurrences: validated.maxOccurrences,
      },
      generateUpTo,
      100 // Max 100 appointments in first batch
    );

    // Create appointment instances
    const createdAppointments = await Promise.all(
      generatedSlots.map((slot) =>
        prisma.appointment.create({
          data: {
            patientId: validated.patientId,
            clinicianId: validated.clinicianId,
            title: validated.title,
            description: validated.description,
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: 'America/Mexico_City', // TODO: Get from clinician preferences
            type: validated.type,
            meetingUrl: validated.meetingUrl,
            status: 'SCHEDULED',
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        })
      )
    );

    // Update recurring series with generation tracking
    await prisma.recurringAppointment.update({
      where: { id: recurringSeries.id },
      data: {
        generatedCount: createdAppointments.length,
        lastGeneratedDate: createdAppointments[createdAppointments.length - 1]?.endTime,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          series: recurringSeries,
          stats,
          appointments: createdAppointments,
        },
        message: `Recurring appointment series created with ${createdAppointments.length} appointments`,
      },
      { status: 201 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 }, // Lower limit for resource-intensive operation
    audit: { action: 'CREATE', resource: 'RecurringAppointment' },
  }
);

// ============================================================================
// GET /api/scheduling/recurring - List Recurring Series
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);

    // Build where clause
    const where: any = {};

    const patientId = searchParams.get('patientId');
    const clinicianId = searchParams.get('clinicianId');
    const isActive = searchParams.get('isActive');
    const isPaused = searchParams.get('isPaused');

    if (patientId) where.patientId = patientId;
    if (clinicianId) where.clinicianId = clinicianId;
    if (isActive !== null) where.isActive = isActive === 'true';
    if (isPaused !== null) where.isPaused = isPaused === 'true';

    // Authorization: Non-admins can only see their own series
    if (context.user?.role !== 'ADMIN') {
      where.clinicianId = context.user?.id;
    }

    const recurringSeries = await prisma.recurringAppointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tokenId: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats for each series
    const seriesWithStats = recurringSeries.map((series) => {
      const stats = calculateRecurringStats({
        frequency: series.frequency,
        interval: series.interval,
        daysOfWeek: series.daysOfWeek,
        dayOfMonth: series.dayOfMonth ?? undefined,
        startTime: series.startTime,
        duration: series.duration,
        seriesStart: series.seriesStart,
        seriesEnd: series.seriesEnd,
        maxOccurrences: series.maxOccurrences,
      });

      return {
        ...series,
        stats,
      };
    });

    return NextResponse.json({
      success: true,
      data: seriesWithStats,
      count: seriesWithStats.length,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'RecurringAppointment' },
    skipCsrf: true,
  }
);
