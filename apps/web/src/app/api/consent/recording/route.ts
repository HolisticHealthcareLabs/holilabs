import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { recordConsent } from '@/lib/consent/recording-consent';

export const dynamic = 'force-dynamic';

/**
 * POST /api/consent/recording
 * Record patient consent for audio recording (used by AI Scribe).
 *
 * This writes to the patient record fields used by verifyRecordingConsent().
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json().catch(() => ({}));
    const { patientId } = body || {};

    if (!patientId || typeof patientId !== 'string') {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    // Verify clinician can access this patient
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, assignedClinicianId: context.user.id },
      select: { id: true, state: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
    }

    const result = await recordConsent(patientId, {
      consentMethod: 'Verbal',
      consentState: patient.state || 'UNKNOWN',
      consentLanguage: 'en',
      consentVersion: '1.0',
      consentSignature: 'VERBAL_ACKNOWLEDGED',
      clinicianId: context.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    // UX: called from the consent modal; keep simple in local dev
    skipCsrf: true,
  }
);


