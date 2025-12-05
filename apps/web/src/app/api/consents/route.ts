/**
 * Consent Management API
 * GET  /api/consents?patientId={id} - List patient consents
 * POST /api/consents - Create/update consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { checkPatientConsentExpiration, findExpiredConsents, expireConsent } from '@/lib/consent/expiration-checker';

// Consent type metadata (matches ConsentManagementPanel expectations)
const CONSENT_METADATA: Record<string, any> = {
  GENERAL_CONSULTATION: {
    id: 'GENERAL_CONSULTATION',
    name: 'Treatment & General Consultation',
    description: 'Consent to receive medical treatment and healthcare services from your assigned clinician',
    required: true,
    category: 'Essential',
    icon: '🏥',
  },
  TELEHEALTH: {
    id: 'TELEHEALTH',
    name: 'Telemedicine Services',
    description: 'Consent to receive healthcare via video/phone consultations',
    required: false,
    category: 'Care Delivery',
    icon: '📱',
  },
  RECORDING: {
    id: 'RECORDING',
    name: 'Consultation Recording',
    description: 'Allow recording of consultations for AI transcription and quality improvement',
    required: false,
    category: 'Technology',
    icon: '🎙️',
  },
  DATA_RESEARCH: {
    id: 'DATA_RESEARCH',
    name: 'Anonymous Research',
    description: 'Allow anonymized data for medical research and platform improvement',
    required: false,
    category: 'Research',
    icon: '🔬',
  },
  APPOINTMENT_REMINDERS: {
    id: 'APPOINTMENT_REMINDERS',
    name: 'Appointment Reminders',
    description: 'Receive automated appointment reminders via email/SMS',
    required: false,
    category: 'Communication',
    icon: '📅',
  },
  MEDICATION_REMINDERS: {
    id: 'MEDICATION_REMINDERS',
    name: 'Medication Reminders',
    description: 'Receive medication reminders via WhatsApp/SMS',
    required: false,
    category: 'Communication',
    icon: '💊',
  },
  WELLNESS_TIPS: {
    id: 'WELLNESS_TIPS',
    name: 'Wellness & Health Tips',
    description: 'Receive personalized health tips and preventive care recommendations',
    required: false,
    category: 'Communication',
    icon: '🌱',
  },
};

function getConsentMetadata(type: string) {
  return CONSENT_METADATA[type] || {
    id: type,
    name: type,
    description: '',
    required: false,
    category: 'Other',
    icon: '📋',
  };
}

/**
 * GET /api/consents?patientId={id}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'patientId required' }, { status: 400 });
    }

    // Check for and expire any expired consents for this patient
    const hasExpired = await checkPatientConsentExpiration(patientId);
    if (hasExpired) {
      const expiredConsents = await findExpiredConsents();
      const patientExpiredConsents = expiredConsents.filter(c => c.patientId === patientId);
      for (const consent of patientExpiredConsents) {
        await expireConsent(consent.id);
      }
    }

    // Fetch all consents
    const consents = await prisma.consent.findMany({
      where: { patientId },
      orderBy: { signedAt: 'desc' },
    });

    // Get latest consent for each type
    const latestConsents = new Map();
    for (const consent of consents) {
      if (!latestConsents.has(consent.type)) {
        latestConsents.set(consent.type, consent);
      }
    }

    // Map to format expected by ConsentManagementPanel
    const consentStatuses = Array.from(latestConsents.values()).map((consent: any) => ({
      consentType: getConsentMetadata(consent.type),
      granted: consent.isActive,
      grantedAt: consent.signedAt.toISOString(),
      revokedAt: consent.revokedAt?.toISOString() || null,
      version: consent.version,
    }));

    // Ensure all consent types are represented
    for (const type of Object.values(CONSENT_METADATA)) {
      if (!consentStatuses.find(c => c.consentType.id === type.id)) {
        consentStatuses.push({
          consentType: type,
          granted: false,
          grantedAt: null,
          revokedAt: null,
          version: '1.0',
        });
      }
    }

    return NextResponse.json({ success: true, consents: consentStatuses });
  } catch (error) {
    console.error('Error fetching consents:', error);
    return NextResponse.json({ error: 'Failed to fetch consents' }, { status: 500 });
  }
}

/**
 * POST /api/consents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, consentTypeId, granted, version } = body;

    if (!patientId || !consentTypeId || typeof granted !== 'boolean') {
      return NextResponse.json(
        { error: 'patientId, consentTypeId, and granted are required' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const consentMetadata = getConsentMetadata(consentTypeId);

    // Find existing consent
    const existingConsent = await prisma.consent.findFirst({
      where: { patientId, type: consentTypeId },
      orderBy: { signedAt: 'desc' },
    });

    let result;

    if (existingConsent && granted) {
      // Reactivate
      result = await prisma.consent.update({
        where: { id: existingConsent.id },
        data: { isActive: true, revokedAt: null, revokedReason: null },
      });

      // If reactivating GENERAL_CONSULTATION, reactivate data access grants
      if (consentTypeId === 'GENERAL_CONSULTATION') {
        // Get patient's assigned clinician
        const patientData = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { assignedClinicianId: true },
        });

        if (patientData?.assignedClinicianId) {
          // Check if there's a revoked grant for the assigned clinician
          const existingGrant = await prisma.dataAccessGrant.findFirst({
            where: {
              patientId,
              grantedToId: patientData.assignedClinicianId,
              grantedToType: 'USER',
            },
          });

          if (existingGrant) {
            // Reactivate existing grant
            await prisma.dataAccessGrant.update({
              where: { id: existingGrant.id },
              data: {
                revokedAt: null,
                revokedReason: null,
              },
            });
          } else {
            // Create new grant if none exists
            await prisma.dataAccessGrant.create({
              data: {
                patientId,
                grantedToType: 'USER',
                grantedToId: patientData.assignedClinicianId,
                resourceType: 'ALL',
                canView: true,
                canDownload: false,
                canShare: false,
                purpose: 'Primary care physician - re-granted after consent reactivation',
                grantedAt: new Date(),
              },
            });
          }

          console.log(`✅ Reactivated data access grant for patient ${patientId}`);
        }
      }
    } else if (existingConsent && !granted) {
      // Revoke
      result = await prisma.consent.update({
        where: { id: existingConsent.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'Revoked by patient via portal',
        },
      });

      // If revoking GENERAL_CONSULTATION, revoke all active data access grants
      if (consentTypeId === 'GENERAL_CONSULTATION') {
        await prisma.dataAccessGrant.updateMany({
          where: {
            patientId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            revokedReason: 'Patient revoked general consultation consent',
          },
        });

        console.log(`🔒 Revoked all data access grants for patient ${patientId} due to consent revocation`);
      }
    } else if (!existingConsent && granted) {
      // Create new
      const consentContent = `
Consent for: ${consentMetadata.name}
Description: ${consentMetadata.description}

By granting this consent, you agree to the terms above.
You may revoke this consent anytime through the patient portal.

Patient: ${patient.firstName} ${patient.lastName}
Date: ${new Date().toLocaleDateString()}
      `.trim();

      const consentHash = crypto
        .createHash('sha256')
        .update(consentContent + patientId + new Date().toISOString())
        .digest('hex');

      result = await prisma.consent.create({
        data: {
          patientId,
          type: consentTypeId,
          title: consentMetadata.name,
          content: consentContent,
          version: version || '1.0',
          signatureData: 'PORTAL_CONSENT_CLICK',
          signedAt: new Date(),
          isActive: true,
          consentHash,
        },
      });
    } else {
      return NextResponse.json({ success: true, message: 'No action needed' });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: patientId,
        userEmail: 'patient',
        action: granted ? 'SIGN' : 'REVOKE',
        resource: 'Consent',
        resourceId: result.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        details: { consentType: consentTypeId, consentName: consentMetadata.name },
        success: true,
      },
    });

    // Update patient flags
    const updates: any = {};
    if (consentTypeId === 'RECORDING') {
      updates.recordingConsentGiven = granted;
      updates.recordingConsentDate = granted ? new Date() : null;
      updates.recordingConsentWithdrawnAt = granted ? null : new Date();
    }
    if (Object.keys(updates).length > 0) {
      await prisma.patient.update({ where: { id: patientId }, data: updates });
    }

    return NextResponse.json({
      success: true,
      consent: {
        id: result.id,
        type: result.type,
        isActive: result.isActive,
        signedAt: result.signedAt,
      },
    });
  } catch (error) {
    console.error('Error updating consent:', error);
    return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 });
  }
}
