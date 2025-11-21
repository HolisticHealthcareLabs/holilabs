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
import { requirePatientSession } from '@/lib/auth/patient-session';
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
export async function GET(request: NextRequest) {
  try {
    const session = await requirePatientSession();

    const patient = await prisma.patient.findUnique({
      where: { id: session.patientId },
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
      patientId: session.patientId,
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    logger.error({
      event: 'whatsapp_consent_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Error fetching consent status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Grant WhatsApp consent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePatientSession();
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
      where: { id: session.patientId },
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
      where: { id: session.patientId },
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
        userId: session.userId,
        userEmail: session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'WhatsAppConsent',
        resourceId: session.patientId,
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
      patientId: session.patientId,
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    logger.error({
      event: 'whatsapp_consent_grant_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Error granting consent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Withdraw WhatsApp consent
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requirePatientSession();

    // Update patient - mark consent as withdrawn
    const updatedPatient = await prisma.patient.update({
      where: { id: session.patientId },
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
        userId: session.userId,
        userEmail: session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'DELETE',
        resource: 'WhatsAppConsent',
        resourceId: session.patientId,
        success: true,
        details: {
          withdrawnAt: updatedPatient.whatsappConsentWithdrawnAt,
          originalConsentDate: updatedPatient.whatsappConsentDate,
        },
      },
    });

    logger.info({
      event: 'whatsapp_consent_withdrawn',
      patientId: session.patientId,
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    logger.error({
      event: 'whatsapp_consent_withdraw_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Error withdrawing consent' },
      { status: 500 }
    );
  }
}
