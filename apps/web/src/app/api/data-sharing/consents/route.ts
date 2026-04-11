import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';
import {
  validateConsentGranularity,
  computeConsentHash,
  grantConsent,
} from '@/lib/care-coordination/cross-org.service';

export const dynamic = 'force-dynamic';

const VALID_SCOPES = [
  'DEMOGRAPHICS',
  'DIAGNOSES',
  'MEDICATIONS',
  'LAB_RESULTS',
  'IMAGING',
  'CARE_PLANS',
  'ENCOUNTERS',
  'VITAL_SIGNS',
  'ALLERGIES',
  'PRESCRIPTIONS',
] as const;

const GrantConsentSchema = z.object({
  patientId: z.string().min(1),
  agreementId: z.string().min(1),
  consentedScopes: z.array(z.enum(VALID_SCOPES)).min(1),
  deniedScopes: z.array(z.enum(VALID_SCOPES)).default([]),
  consentText: z.string().min(1),
  signatureData: z.string().optional(),
  consentVersion: z.string().default('1.0'),
  expiresAt: z.string().datetime().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = GrantConsentSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const { consentedScopes, deniedScopes } = parsed.data;

      const granularity = validateConsentGranularity(
        consentedScopes as any[],
        deniedScopes as any[],
      );

      if (!granularity.valid) {
        return NextResponse.json(
          {
            error: 'Consent granularity validation failed',
            violations: granularity.violations,
          },
          { status: 422 },
        );
      }

      const agreement = await prisma.dataSharingAgreement.findUnique({
        where: { id: parsed.data.agreementId },
        select: { id: true, status: true },
      });

      if (!agreement) {
        return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
      }

      if (agreement.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `Cannot grant consent on an agreement with status "${agreement.status}"` },
          { status: 409 },
        );
      }

      const patient = await prisma.patient.findUnique({
        where: { id: parsed.data.patientId },
        select: { id: true },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      const existingConsent = await prisma.patientSharingConsent.findUnique({
        where: {
          patientId_agreementId: {
            patientId: parsed.data.patientId,
            agreementId: parsed.data.agreementId,
          },
        },
      });

      if (existingConsent && !existingConsent.revokedAt) {
        return NextResponse.json(
          { error: 'Active consent already exists for this patient and agreement' },
          { status: 409 },
        );
      }

      const _consentHash = computeConsentHash(
        parsed.data.patientId,
        parsed.data.agreementId,
        consentedScopes as any[],
        deniedScopes as any[],
      );

      const consent = await grantConsent(prisma, {
        patientId: parsed.data.patientId,
        agreementId: parsed.data.agreementId,
        consentedScopes: consentedScopes as any[],
        deniedScopes: deniedScopes as any[],
        consentText: parsed.data.consentText,
        signatureData: parsed.data.signatureData,
        consentVersion: parsed.data.consentVersion,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
        userId: context.user.id,
      });

      return NextResponse.json({ data: consent }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('RUTH:')) {
        return NextResponse.json(
          { error: error.message },
          { status: 422 },
        );
      }
      return safeErrorResponse(error, { userMessage: 'Failed to grant consent' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN'] as any,
    audit: { action: 'CREATE', resource: 'PatientSharingConsent' },
  },
);
