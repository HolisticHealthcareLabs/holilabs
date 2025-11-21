/**
 * Waiting List Management API
 * Industry-grade patient waiting list with intelligent matching
 *
 * POST /api/scheduling/waiting-list - Add patient to waiting list
 * GET /api/scheduling/waiting-list - List waiting list entries with priority
 *
 * @module api/scheduling/waiting-list
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { AddToWaitingListSchema } from '@/lib/api/schemas/scheduling';
import { addDays } from 'date-fns';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// POST /api/scheduling/waiting-list - Add Patient to Waiting List
// ============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const validated = context.validatedBody;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: validated.patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
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
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
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

    // Check for existing active waiting list entry
    const existingEntry = await prisma.waitingList.findFirst({
      where: {
        patientId: validated.patientId,
        clinicianId: validated.clinicianId,
        status: {
          in: ['WAITING', 'NOTIFIED'],
        },
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        {
          success: false,
          error: 'DUPLICATE',
          message: 'Patient is already on the waiting list for this clinician',
          existingId: existingEntry.id,
        },
        { status: 409 }
      );
    }

    // Set default expiration if not provided (30 days from now)
    const expiresAt = validated.expiresAt || addDays(new Date(), 30);

    // Create waiting list entry
    const waitingListEntry = await prisma.waitingList.create({
      data: {
        patientId: validated.patientId,
        clinicianId: validated.clinicianId,
        preferredDate: validated.preferredDate,
        preferredTimeStart: validated.preferredTimeStart,
        preferredTimeEnd: validated.preferredTimeEnd,
        appointmentType: validated.appointmentType,
        priority: validated.priority,
        reason: validated.reason,
        expiresAt,
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
      },
    });

    // Get position in queue
    const position = await prisma.waitingList.count({
      where: {
        clinicianId: validated.clinicianId,
        status: 'WAITING',
        createdAt: { lte: waitingListEntry.createdAt },
      },
    });

    // TODO: Send notification to patient about being added to waiting list
    // TODO: If URGENT priority, notify administrative staff immediately

    return NextResponse.json(
      {
        success: true,
        data: waitingListEntry,
        queuePosition: position,
        message: 'Patient added to waiting list',
      },
      { status: 201 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'WaitingList' },
  }
);

// ============================================================================
// GET /api/scheduling/waiting-list - List Waiting List Entries
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);

    // Build where clause
    const where: any = {};

    const patientId = searchParams.get('patientId');
    const clinicianId = searchParams.get('clinicianId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const appointmentType = searchParams.get('appointmentType');

    if (patientId) where.patientId = patientId;
    if (clinicianId) where.clinicianId = clinicianId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (appointmentType) where.appointmentType = appointmentType;

    // Authorization: Non-admins can only see their own waiting list
    if (context.user?.role !== 'ADMIN') {
      where.clinicianId = context.user?.id;
    }

    // Fetch waiting list entries
    const waitingListEntries = await prisma.waitingList.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tokenId: true,
            dateOfBirth: true,
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
      },
      orderBy: [
        { priority: 'desc' }, // URGENT > HIGH > NORMAL > LOW
        { createdAt: 'asc' }, // FIFO within same priority
      ],
    });

    // Calculate statistics
    const stats = {
      total: waitingListEntries.length,
      waiting: waitingListEntries.filter((e) => e.status === 'WAITING').length,
      notified: waitingListEntries.filter((e) => e.status === 'NOTIFIED').length,
      accepted: waitingListEntries.filter((e) => e.status === 'ACCEPTED').length,
      declined: waitingListEntries.filter((e) => e.status === 'DECLINED').length,
      expired: waitingListEntries.filter((e) => e.status === 'EXPIRED').length,
      converted: waitingListEntries.filter((e) => e.status === 'CONVERTED').length,
      urgent: waitingListEntries.filter((e) => e.priority === 'URGENT').length,
      high: waitingListEntries.filter((e) => e.priority === 'HIGH').length,
      normal: waitingListEntries.filter((e) => e.priority === 'NORMAL').length,
      low: waitingListEntries.filter((e) => e.priority === 'LOW').length,
    };

    // Average wait time for converted entries (in days)
    const convertedEntries = waitingListEntries.filter(
      (e) => e.status === 'CONVERTED' && e.convertedAt
    );
    const avgWaitTime =
      convertedEntries.length > 0
        ? Math.round(
            convertedEntries.reduce((sum, e) => {
              const waitDays = Math.floor(
                (e.convertedAt!.getTime() - e.createdAt.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return sum + waitDays;
            }, 0) / convertedEntries.length
          )
        : 0;

    // Identify expired entries that need status update
    const now = new Date();
    const expiredCount = waitingListEntries.filter(
      (e) =>
        e.expiresAt &&
        e.expiresAt < now &&
        ['WAITING', 'NOTIFIED'].includes(e.status)
    ).length;

    // Group by clinician
    const byClinician = waitingListEntries.reduce((acc, entry) => {
      const key = entry.clinicianId;
      if (!acc[key]) {
        acc[key] = {
          clinicianId: entry.clinicianId,
          clinician: entry.clinician,
          count: 0,
          waiting: 0,
          urgent: 0,
        };
      }
      acc[key].count++;
      if (entry.status === 'WAITING') acc[key].waiting++;
      if (entry.priority === 'URGENT') acc[key].urgent++;
      return acc;
    }, {} as Record<string, any>);

    const waitingListByClinician = Object.values(byClinician).sort(
      (a: any, b: any) => b.urgent - a.urgent || b.waiting - a.waiting
    );

    return NextResponse.json({
      success: true,
      data: waitingListEntries,
      count: waitingListEntries.length,
      stats,
      analytics: {
        avgWaitTimeDays: avgWaitTime,
        conversionRate:
          stats.total > 0
            ? Math.round((stats.converted / stats.total) * 100)
            : 0,
        expiredNeedingUpdate: expiredCount,
        waitingListByClinician,
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'WaitingList' },
    skipCsrf: true,
  }
);
