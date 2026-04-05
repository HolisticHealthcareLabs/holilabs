import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

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

const ReportConflictSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(10000),
  scope: z.enum(VALID_SCOPES),
  structuredData: z.any().optional(),
  sourceEncounterId: z.string().optional(),
  fhirResourceType: z.string().optional(),
  fhirResourceId: z.string().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const planId = context.params?.id;
      if (!planId) {
        return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = ReportConflictSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const plan = await prisma.sharedCarePlan.findUnique({
        where: { id: planId },
        include: {
          careTeam: {
            select: { id: true, owningOrgId: true, sharingAgreementId: true },
          },
        },
      });

      if (!plan) {
        return NextResponse.json({ error: 'Shared care plan not found' }, { status: 404 });
      }

      if (!plan.careTeam.sharingAgreementId) {
        return NextResponse.json(
          { error: 'Care team has no sharing agreement — cannot create shared records' },
          { status: 409 },
        );
      }

      const record = await prisma.sharedCareRecord.create({
        data: {
          patientId: plan.patientId,
          agreementId: plan.careTeam.sharingAgreementId,
          sharedPlanId: planId,
          recordType: 'TASK_UPDATE',
          scope: parsed.data.scope as any,
          title: parsed.data.title,
          content: parsed.data.content,
          structuredData: parsed.data.structuredData ?? undefined,
          sourceOrgId: context.user.organizationId,
          sourceUserId: context.user.id,
          sourceEncounterId: parsed.data.sourceEncounterId,
          fhirResourceType: parsed.data.fhirResourceType,
          fhirResourceId: parsed.data.fhirResourceId,
        },
      });

      return NextResponse.json({ data: record }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to report conflict' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'SharedCareRecord' },
  },
);
