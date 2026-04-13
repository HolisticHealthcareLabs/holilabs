export const dynamic = "force-dynamic";
/**
 * WhatsApp Consent API
 * HIPAA/LGPD compliant consent management for WhatsApp adherence monitoring
 *
 * GET /api/portal/consent/whatsapp
 * Fetch current WhatsApp consent status
 *
 * POST /api/portal/consent/whatsapp
 * Grant WhatsApp consent with preferences
 *
 * DELETE /api/portal/consent/whatsapp
 * Withdraw WhatsApp consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

// Grant consent schema
const GrantConsentSchema = z.object({
  consentMethod: z.enum(['Portal', 'In-Person', 'Verbal', 'Phone']),
  language: z.enum(['en', 'es', 'pt']),
  medicationReminders: z.boolean().default(true),
  appointmentReminders: z.boolean().default(true),
  labResultsAlerts: z.boolean().default(true),
  preventiveCareAlerts: z.boolean().default(true),
  preferredContactTimeStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
  preferredContactTimeEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  doNotDisturb: z.boolean().default(false),
});

/**
 * GET - Fetch current WhatsApp consent status
 */
export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const patient = await prisma.patient.findUnique({
      where: { id: context.session.patientId },
      select: {
        id: true,
        whatsappConsentGiven: true,
        whatsappConsentDate: true,
        whatsappConsentMethod: true,
        whatsappConsentWithdrawnAt: true,
        whatsappConsentLanguage: true,
        medicationRemindersEnabled: true,
        appointmentRemindersEnabled: true,
        labResultsAlertsEnabled: true,
        preventiveCareAlertsEnabled: true,
        preferredContactTimeStart: true,
        preferredContactTimeEnd: true,
        doNotDisturbEnabled: true,
        phone: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    logger.info({
      event: 'whatsapp_consent_status_fetched',
      patientId: context.session.patientId,
      consentGiven: patient.whatsappConsentGiven,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          consentGiven: patient.whatsappConsentGiven,
          consentDate: patient.whatsappConsentDate,
          consentMethod: patient.whatsappConsentMethod,
          withdrawnAt: patient.whatsappConsentWithdrawnAt,
          language: patient.whatsappConsentLanguage || 'en',
          phoneNumber: patient.phone,
          preferences: {
            medicationReminders: patient.medicationRemindersEnabled,
            appointmentReminders: patient.appointmentRemindersEnabled,
            labResultsAlerts: patient.labResultsAlertsEnabled,
            preventiveCareAlerts: patient.preventiveCareAlertsEnabled,
            preferredContactTimeStart: patient.preferredContactTimeStart,
            preferredContactTimeEnd: patient.preferredContactTimeEnd,
            doNotDisturb: patient.doNotDisturbEnabled,
          },
        },
      },
      { status: 200 }
    );
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'WhatsAppConsent' },
  }
);

/**
 * POST - Grant WhatsApp consent
 */
export const POST = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const body = await request.json();
    const validation = GrantConsentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if patient has phone number
    const patient = await prisma.patient.findUnique({
      where: { id: context.session.patientId },
      select: { phone: true },
    });

    if (!patient?.phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number required. Please update your profile first.',
        },
        { status: 400 }
      );
    }

    // Update patient with consent
    const updatedPatient = await prisma.patient.update({
      where: { id: context.session.patientId },
      data: {
        whatsappConsentGiven: true,
        whatsappConsentDate: new Date(),
        whatsappConsentMethod: data.consentMethod,
        whatsappConsentWithdrawnAt: null, // Clear withdrawal if previously withdrawn
        whatsappConsentLanguage: data.language,
        medicationRemindersEnabled: data.medicationReminders,
        appointmentRemindersEnabled: data.appointmentReminders,
        labResultsAlertsEnabled: data.labResultsAlerts,
        preventiveCareAlertsEnabled: data.preventiveCareAlerts,
        preferredContactTimeStart: data.preferredContactTimeStart,
        preferredContactTimeEnd: data.preferredContactTimeEnd,
        doNotDisturbEnabled: data.doNotDisturb,
      },
    });

    // Create audit log (HIPAA requirement)
    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        userEmail: context.session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'WhatsAppConsent',
        resourceId: context.session.patientId,
        success: true,
        details: {
          consentMethod: data.consentMethod,
          language: data.language,
          preferences: {
            medicationReminders: data.medicationReminders,
            appointmentReminders: data.appointmentReminders,
            labResultsAlerts: data.labResultsAlerts,
            preventiveCareAlerts: data.preventiveCareAlerts,
          },
        },
      },
    });

    logger.info({
      event: 'whatsapp_consent_granted',
      patientId: context.session.patientId,
      consentMethod: data.consentMethod,
      language: data.language,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'WhatsApp consent granted successfully',
        data: {
          consentGiven: true,
          consentDate: updatedPatient.whatsappConsentDate,
        },
      },
      { status: 200 }
    );
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'WhatsAppConsent' },
  }
);

/**
 * DELETE - Withdraw WhatsApp consent
 */
export const DELETE = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    // Update patient - mark consent as withdrawn
    const updatedPatient = await prisma.patient.update({
      where: { id: context.session.patientId },
      data: {
        whatsappConsentGiven: false,
        whatsappConsentWithdrawnAt: new Date(),
        // Disable all reminders when consent is withdrawn
        medicationRemindersEnabled: false,
        appointmentRemindersEnabled: false,
        labResultsAlertsEnabled: false,
        preventiveCareAlertsEnabled: false,
      },
    });

    // Create audit log (LGPD right to withdraw consent)
    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        userEmail: context.session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'DELETE',
        resource: 'WhatsAppConsent',
        resourceId: context.session.patientId,
        success: true,
        details: {
          withdrawnAt: updatedPatient.whatsappConsentWithdrawnAt,
          originalConsentDate: updatedPatient.whatsappConsentDate,
        },
      },
    });

    logger.info({
      event: 'whatsapp_consent_withdrawn',
      patientId: context.session.patientId,
      withdrawnAt: updatedPatient.whatsappConsentWithdrawnAt,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'WhatsApp consent withdrawn successfully',
        data: {
          consentGiven: false,
          withdrawnAt: updatedPatient.whatsappConsentWithdrawnAt,
        },
      },
      { status: 200 }
    );
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'DELETE', resource: 'WhatsAppConsent' },
  }
);
