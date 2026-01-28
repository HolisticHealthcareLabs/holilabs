/**
 * Appointments API
 * Industry-grade endpoint with full middleware stack
 *
 * POST /api/appointments - Create appointment
 * GET /api/appointments - List appointments with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { validateBody, validateQuery } from '@/lib/api/middleware';
import { consentGuard } from '@/lib/consent/consent-guard';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';

import {
  CreateAppointmentSchema,
  AppointmentQuerySchema,
} from '@/lib/api/schemas';
import { emitAppointmentEvent } from '@/lib/socket-server';

// ============================================================================
// POST /api/appointments - Create appointment
// ============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const validated = context.validatedBody;

    // ============================================================================
    // CONSENT-GATED ACCESS: Check patient consent before booking
    // ============================================================================
    const consentCheck = await consentGuard.canBookAppointment(validated.patientId);

    if (!consentCheck.allowed) {
      // Log consent check for audit trail
      await consentGuard.logConsentCheck(
        validated.patientId,
        'BOOK_APPOINTMENT',
        consentCheck,
        {
          clinicianId: validated.clinicianId,
          requestedBy: context.user?.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'CONSENT_REQUIRED',
          message: 'Patient has not granted consent for appointment booking.',
          missingConsents: consentCheck.missingConsents,
          requiredActions: [
            {
              action: 'GRANT_CONSENT',
              consentType: 'appointment_booking',
              description: 'Allow doctors to view medical history when booking appointments',
              url: '/portal/dashboard/privacy',
            },
            {
              action: 'GRANT_CONSENT',
              consentType: 'treatment_access',
              description: 'Allow doctors to access medical records for treatment',
              url: '/portal/dashboard/privacy',
            },
          ],
        },
        { status: 403 }
      );
    }

    // Log successful consent check
    await consentGuard.logConsentCheck(
      validated.patientId,
      'BOOK_APPOINTMENT',
      consentCheck,
      {
        clinicianId: validated.clinicianId,
        requestedBy: context.user?.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      }
    );

    // Create appointment
    const appointment = await prisma!.appointment.create({
      data: {
        patientId: validated.patientId,
        clinicianId: validated.clinicianId,
        title: validated.title,
        description: validated.description,
        startTime: new Date(validated.startTime),
        endTime: new Date(validated.endTime),
        timezone: validated.timezone,
        type: validated.type,
        meetingUrl: validated.meetingUrl,
        status: 'SCHEDULED',
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

    // Emit Socket.IO event for real-time UI updates
    emitAppointmentEvent({
      id: appointment.id,
      action: 'created',
      patientId: appointment.patientId,
      patientName: appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : undefined,
      clinicianId: appointment.clinicianId,
      clinicianName: appointment.clinician
        ? `${appointment.clinician.firstName} ${appointment.clinician.lastName}`
        : undefined,
      appointmentType: appointment.type || undefined,
      startTime: appointment.startTime,
      userId: context.user?.id || validated.clinicianId,
      userName: context.user?.name || context.user?.email,
    });

    // TODO: Send calendar invites (Google Calendar/Outlook integration)
    // TODO: Send SMS/Email reminders

    return NextResponse.json(
      {
        success: true,
        data: appointment,
        message: 'Appointment created successfully',
      },
      { status: 201 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'], // Only clinicians can create appointments
    rateLimit: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
    audit: { action: 'CREATE', resource: 'Appointment' },
  }
);

// Note: Validation already applied via createProtectedRoute
// No need for additional wrapper

// ============================================================================
// GET /api/appointments - List appointments
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const query = context.validatedQuery || {};

    // Build where clause
    const where: any = {};

    if (query.patientId) where.patientId = query.patientId;
    if (query.clinicianId) where.clinicianId = query.clinicianId;
    if (query.status) where.status = query.status;

    // Date range filter
    if (query.startDate || query.endDate) {
      where.startTime = {};
      if (query.startDate) where.startTime.gte = new Date(query.startDate);
      if (query.endDate) where.startTime.lte = new Date(query.endDate);
    }

    // If user is not admin, only show their appointments
    if (context.user?.role !== 'ADMIN') {
      where.clinicianId = context.user?.id;
    }

    const appointments = await prisma.appointment.findMany({
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
            specialty: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: query.limit || 50,
    });

    return NextResponse.json({
      success: true,
      data: appointments,
      count: appointments.length,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'Appointment' },
    skipCsrf: true, // GET requests don't need CSRF protection
  }
);

// Note: Validation already applied via createProtectedRoute
// No need for additional wrapper
