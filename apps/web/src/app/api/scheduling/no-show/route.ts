/**
 * No-Show Tracking API
 * Industry-grade patient attendance tracking and no-show management
 *
 * POST /api/scheduling/no-show - Mark appointment as no-show
 * GET /api/scheduling/no-show - List no-show records with analytics
 *
 * @module api/scheduling/no-show
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { MarkNoShowSchema } from '@/lib/api/schemas/scheduling';
import { subDays, startOfDay, endOfDay } from 'date-fns';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// POST /api/scheduling/no-show - Mark Appointment as No-Show
// ============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const validated = context.validatedBody;

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: validated.appointmentId },
      select: {
        id: true,
        patientId: true,
        clinicianId: true,
        startTime: true,
        endTime: true,
        status: true,
        title: true,
        type: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Appointment not found',
        },
        { status: 404 }
      );
    }

    // Authorization: Only clinician assigned to appointment or admin
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== appointment.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only mark no-shows for your own appointments',
        },
        { status: 403 }
      );
    }

    // Validate appointment status - can only mark scheduled/confirmed as no-show
    if (!['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'].includes(appointment.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: `Cannot mark ${appointment.status} appointment as no-show`,
        },
        { status: 400 }
      );
    }

    // Check if no-show record already exists
    const existingNoShow = await prisma.noShowHistory.findFirst({
      where: { appointmentId: validated.appointmentId },
    });

    if (existingNoShow) {
      return NextResponse.json(
        {
          success: false,
          error: 'DUPLICATE',
          message: 'No-show record already exists for this appointment',
          existingId: existingNoShow.id,
        },
        { status: 409 }
      );
    }

    // Count previous no-shows for this patient
    const previousNoShows = await prisma.noShowHistory.count({
      where: {
        patientId: appointment.patientId,
      },
    });

    // Calculate no-show rate for this patient (last 12 months)
    const oneYearAgo = subDays(new Date(), 365);
    const totalAppointments = await prisma.appointment.count({
      where: {
        patientId: appointment.patientId,
        startTime: { gte: oneYearAgo },
        status: {
          in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
        },
      },
    });

    const noShowRate =
      totalAppointments > 0
        ? Math.round((previousNoShows / totalAppointments) * 100)
        : 0;

    // Create transaction: Update appointment + Create no-show record
    const [updatedAppointment, noShowRecord] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: validated.appointmentId },
        data: { status: 'NO_SHOW' },
      }),
      prisma.noShowHistory.create({
        data: {
          appointmentId: validated.appointmentId,
          patientId: appointment.patientId,
          clinicianId: appointment.clinicianId,
          appointmentDate: appointment.startTime,
          markedAt: new Date(),
          markedBy: context.user?.id,
          notes: validated.notes,
          contacted: validated.contacted,
          contactMethod: validated.contactMethod,
          contactNotes: validated.contactNotes,
          patientReason: validated.patientReason,
          feeCharged: validated.feeCharged,
          feeAmount: validated.feeAmount,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
              email: true,
              phone: true,
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
          appointment: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              title: true,
              type: true,
            },
          },
        },
      }),
    ]);

    // TODO: Send notification to patient about no-show and any fees
    // TODO: Check policy for automatic restrictions (e.g., 3 strikes rule)
    // TODO: Add to patient's record/profile

    return NextResponse.json(
      {
        success: true,
        data: noShowRecord,
        analytics: {
          totalNoShows: previousNoShows + 1,
          noShowRate,
          totalAppointments,
        },
        message: 'Appointment marked as no-show',
      },
      { status: 201 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'NoShowHistory' },
    bodySchema: MarkNoShowSchema,
  }
);

// ============================================================================
// GET /api/scheduling/no-show - List No-Show Records with Analytics
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);

    // Build where clause
    const where: any = {};

    const patientId = searchParams.get('patientId');
    const clinicianId = searchParams.get('clinicianId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const contacted = searchParams.get('contacted');
    const feeCharged = searchParams.get('feeCharged');
    const feePaid = searchParams.get('feePaid');

    if (patientId) where.patientId = patientId;
    if (clinicianId) where.clinicianId = clinicianId;

    if (contacted !== null) {
      where.contacted = contacted === 'true';
    }

    if (feeCharged !== null) {
      where.feeCharged = feeCharged === 'true';
    }

    if (feePaid !== null) {
      where.feePaid = feePaid === 'true';
    }

    // Date range filter
    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) {
        where.appointmentDate.gte = startOfDay(new Date(startDate));
      }
      if (endDate) {
        where.appointmentDate.lte = endOfDay(new Date(endDate));
      }
    }

    // Authorization: Non-admins can only see their own appointments
    if (context.user?.role !== 'ADMIN') {
      where.clinicianId = context.user?.id;
    }

    // Fetch no-show records
    const noShowRecords = await prisma.noShowHistory.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tokenId: true,
            email: true,
            phone: true,
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
        appointment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    // Calculate analytics
    const totalNoShows = noShowRecords.length;
    const contactedCount = noShowRecords.filter((r) => r.contacted).length;
    const notContacted = totalNoShows - contactedCount;
    const feesCharged = noShowRecords.filter((r) => r.feeCharged).length;
    const feesPaid = noShowRecords.filter((r) => r.feePaid).length;
    const totalFeeAmount = noShowRecords.reduce(
      (sum, r) => sum + (r.feeAmount || 0),
      0
    );
    const paidFeeAmount = noShowRecords
      .filter((r) => r.feePaid)
      .reduce((sum, r) => sum + (r.feeAmount || 0), 0);

    // Top offenders (patients with most no-shows)
    const patientNoShowCounts = noShowRecords.reduce((acc, record) => {
      const key = record.patientId;
      if (!acc[key]) {
        acc[key] = {
          patientId: record.patientId,
          patient: record.patient,
          count: 0,
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, any>);

    const topOffenders = Object.values(patientNoShowCounts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // No-show rate by clinician
    const clinicianNoShowCounts = noShowRecords.reduce((acc, record) => {
      const key = record.clinicianId;
      if (!acc[key]) {
        acc[key] = {
          clinicianId: record.clinicianId,
          clinician: record.clinician,
          count: 0,
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, any>);

    const noShowsByClinician = Object.values(clinicianNoShowCounts).sort(
      (a: any, b: any) => b.count - a.count
    );

    return NextResponse.json({
      success: true,
      data: noShowRecords,
      count: totalNoShows,
      analytics: {
        totalNoShows,
        contacted: contactedCount,
        notContacted,
        contactRate:
          totalNoShows > 0
            ? Math.round((contactedCount / totalNoShows) * 100)
            : 0,
        feesCharged,
        feesPaid,
        totalFeeAmount: totalFeeAmount.toFixed(2),
        paidFeeAmount: paidFeeAmount.toFixed(2),
        outstandingFees: (totalFeeAmount - paidFeeAmount).toFixed(2),
        collectionRate:
          feesCharged > 0
            ? Math.round((feesPaid / feesCharged) * 100)
            : 0,
        topOffenders,
        noShowsByClinician,
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'NoShowHistory' },
    skipCsrf: true,
  }
);
