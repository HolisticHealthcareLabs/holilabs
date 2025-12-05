/**
 * Patient Communication Preferences API
 * TCPA & CAN-SPAM Compliant
 *
 * GET /api/patients/[id]/preferences - Get preferences
 * PUT /api/patients/[id]/preferences - Update preferences
 *
 * @compliance Phase 2.4: Security Hardening - IDOR Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const UpdatePreferencesSchema = z.object({
  // SMS Preferences
  smsEnabled: z.boolean().optional(),
  smsAppointments: z.boolean().optional(),
  smsPrescriptions: z.boolean().optional(),
  smsResults: z.boolean().optional(),
  smsReminders: z.boolean().optional(),
  smsMarketing: z.boolean().optional(),

  // Email Preferences
  emailEnabled: z.boolean().optional(),
  emailAppointments: z.boolean().optional(),
  emailPrescriptions: z.boolean().optional(),
  emailResults: z.boolean().optional(),
  emailReminders: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),

  // Push Preferences
  pushEnabled: z.boolean().optional(),
  pushAppointments: z.boolean().optional(),
  pushPrescriptions: z.boolean().optional(),
  pushResults: z.boolean().optional(),
  pushMessages: z.boolean().optional(),

  // WhatsApp Preferences
  whatsappEnabled: z.boolean().optional(),
  whatsappConsented: z.boolean().optional(),

  // Global Settings
  allowEmergencyOverride: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  timezone: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

// ============================================================================
// GET /api/patients/[id]/preferences
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get or create preferences
    let preferences = await prisma.patientPreferences.findUnique({
      where: { patientId: id },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.patientPreferences.create({
        data: {
          patientId: id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
  }
);

// ============================================================================
// PUT /api/patients/[id]/preferences
// ============================================================================

export const PUT = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdatePreferencesSchema.parse(body);

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get IP address for consent tracking
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    // Prepare update data
    const updateData: any = { ...validated };

    // Track SMS consent if SMS is being enabled
    if (validated.smsEnabled && !validated.smsEnabled) {
      updateData.smsConsentedAt = new Date();
      updateData.smsConsentIp = ipAddress;
      updateData.smsConsentMethod = 'web';
      updateData.smsOptedOutAt = null;
    }

    // Track SMS opt-out
    if (validated.smsEnabled === false) {
      updateData.smsOptedOutAt = new Date();
    }

    // Track email consent
    if (validated.emailEnabled && !validated.emailEnabled) {
      updateData.emailConsentedAt = new Date();
      updateData.emailConsentIp = ipAddress;
      updateData.emailConsentMethod = 'web';
      updateData.emailOptedOutAt = null;
    }

    // Track email opt-out
    if (validated.emailEnabled === false) {
      updateData.emailOptedOutAt = new Date();
    }

    // Track WhatsApp consent
    if (validated.whatsappConsented) {
      updateData.whatsappConsentedAt = new Date();
    }

    // Upsert preferences
    const preferences = await prisma.patientPreferences.upsert({
      where: { patientId: id },
      update: updateData,
      create: {
        patientId: id,
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'PatientPreferences' },
  }
);
