import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';
import { createAgreement } from '@/lib/care-coordination/cross-org.service';

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

const CreateAgreementSchema = z.object({
  requestingOrgId: z.string().min(1),
  receivingOrgId: z.string().min(1),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1),
  legalBasis: z.string().min(1),
  lgpdArticle: z.string().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
  autoRenew: z.boolean().default(false),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = CreateAgreementSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const agreement = await createAgreement(
        prisma,
        {
          ...parsed.data,
          effectiveFrom: new Date(parsed.data.effectiveFrom),
          effectiveUntil: parsed.data.effectiveUntil
            ? new Date(parsed.data.effectiveUntil)
            : undefined,
          scopes: parsed.data.scopes as any[],
        },
        context.user.id,
      );

      return NextResponse.json({ data: agreement }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create agreement' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'DataSharingAgreement' },
  },
);

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
      const skip = (page - 1) * limit;

      const orgId = context.user.organizationId;
      const where: any = {
        OR: [
          { requestingOrgId: orgId },
          { receivingOrgId: orgId },
        ],
      };
      if (status) where.status = status;

      const [agreements, total] = await Promise.all([
        prisma.dataSharingAgreement.findMany({
          where,
          include: {
            _count: { select: { patientConsents: true, sharedRecords: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.dataSharingAgreement.count({ where }),
      ]);

      return NextResponse.json({
        data: agreements,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list agreements' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'READ', resource: 'DataSharingAgreement' },
  },
);
