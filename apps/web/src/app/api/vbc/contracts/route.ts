import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

const CreateContractSchema = z.object({
  organizationId: z.string().min(1),
  payerName: z.string().min(1),
  payerCode: z.string().optional(),
  contractType: z.enum(['PAY_FOR_PERFORMANCE', 'SHARED_SAVINGS', 'BUNDLED_PAYMENT', 'CAPITATION', 'GLOBAL_BUDGET']),
  effectiveFrom: z.string().transform((s) => new Date(s)),
  effectiveUntil: z.string().transform((s) => new Date(s)),
  baseBudgetBRL: z.number().positive().optional(),
  savingsSharePct: z.number().min(0).max(100).optional(),
  qualityBonusPct: z.number().min(0).max(100).optional(),
  linkedMeasureCodes: z.array(z.string()).default([]),
});

export const POST = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const parsed = CreateContractSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const contract = await prisma.vBCPayerContract.create({
        data: parsed.data,
      });

      return NextResponse.json({ success: true, data: contract }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create VBC contract' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'VBCPayerContract' },
  },
);

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const isActive = searchParams.get('isActive');

      const contracts = await prisma.vBCPayerContract.findMany({
        where: {
          ...(organizationId ? { organizationId } : {}),
          ...(isActive !== null ? { isActive: isActive !== 'false' } : {}),
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      return NextResponse.json({ success: true, data: contracts });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list VBC contracts' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'READ', resource: 'VBCPayerContract' },
  },
);
