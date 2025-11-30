/**
 * Consent Management API
 *
 * Handles patient consent CRUD operations with full audit logging
 *
 * Standards:
 * - HIPAA 45 CFR § 164.508 (Authorization)
 * - GDPR Article 7 (Conditions for consent)
 * - LGPD Article 8 (Consent)
 *
 * @route GET /api/consents - Fetch patient consents
 * @route POST /api/consents - Grant or revoke consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schemas
const createConsentSchema = z.object({
  patientId: z.string().uuid(),
  consentTypeId: z.string(),
  granted: z.boolean(),
  version: z.string().default('1.0'),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/consents
 * Fetch all consents for a patient
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Authorization: User must be the patient or their doctor
    const canAccess = await verifyConsentAccess(session.user.id, patientId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch consents
    const consents = await prisma.patientConsent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Map to response format
    const consentStatuses = consents.map((consent) => ({
      consentType: {
        id: consent.consentTypeId,
        name: getConsentTypeName(consent.consentTypeId),
        category: getConsentTypeCategory(consent.consentTypeId),
      },
      granted: consent.granted,
      grantedAt: consent.grantedAt?.toISOString(),
      revokedAt: consent.revokedAt?.toISOString(),
      expiresAt: consent.expiresAt?.toISOString(),
      version: consent.version,
    }));

    return NextResponse.json({
      consents: consentStatuses,
      patientId,
    });
  } catch (error) {
    console.error('Error fetching consents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consents
 * Grant or revoke patient consent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createConsentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error },
        { status: 400 }
      );
    }

    const { patientId, consentTypeId, granted, version, expiresAt, metadata } = validation.data;

    // Authorization: Only the patient can grant/revoke their own consents
    if (session.user.id !== patientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if consent already exists
    const existingConsent = await prisma.patientConsent.findFirst({
      where: {
        patientId,
        consentTypeId,
      },
    });

    let consent;

    if (existingConsent) {
      // Update existing consent
      consent = await prisma.patientConsent.update({
        where: { id: existingConsent.id },
        data: {
          granted,
          grantedAt: granted ? new Date() : existingConsent.grantedAt,
          revokedAt: !granted ? new Date() : null,
          version,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          metadata: metadata || {},
        },
      });
    } else {
      // Create new consent
      consent = await prisma.patientConsent.create({
        data: {
          patientId,
          consentTypeId,
          granted,
          grantedAt: granted ? new Date() : null,
          revokedAt: !granted ? new Date() : null,
          version,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          metadata: metadata || {},
        },
      });
    }

    // Log consent change for audit trail
    await prisma.consentAuditLog.create({
      data: {
        patientId,
        operation: granted ? 'GRANT_CONSENT' : 'REVOKE_CONSENT',
        allowed: true,
        missingConsents: [],
        metadata: {
          consentTypeId,
          version,
          changedBy: session.user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      consent: {
        id: consent.id,
        consentTypeId: consent.consentTypeId,
        granted: consent.granted,
        grantedAt: consent.grantedAt?.toISOString(),
        revokedAt: consent.revokedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating consent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function verifyConsentAccess(userId: string, patientId: string): Promise<boolean> {
  // User is the patient themselves
  if (userId === patientId) {
    return true;
  }

  // User is a doctor with active access grant from the patient
  const activeGrant = await prisma.accessGrant.findFirst({
    where: {
      patientId,
      grantedToId: userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
      canView: true,
    },
  });

  return !!activeGrant;
}

function getConsentTypeName(consentTypeId: string): string {
  const names: Record<string, string> = {
    treatment_access: 'Treatment & Medical Care',
    appointment_booking: 'Appointment Booking',
    clinical_recording: 'Clinical Consultation Recording',
    data_sharing_specialists: 'Data Sharing with Specialists',
    anonymous_research: 'Anonymous Research Participation',
    health_reminders: 'Health Reminders & Notifications',
    wellness_programs: 'Wellness Programs',
  };

  return names[consentTypeId] || consentTypeId;
}

function getConsentTypeCategory(consentTypeId: string): string {
  const categories: Record<string, string> = {
    treatment_access: 'TREATMENT',
    appointment_booking: 'TREATMENT',
    clinical_recording: 'RECORDING',
    data_sharing_specialists: 'DATA_SHARING',
    anonymous_research: 'RESEARCH',
    health_reminders: 'MARKETING',
    wellness_programs: 'MARKETING',
  };

  return categories[consentTypeId] || 'OTHER';
}
