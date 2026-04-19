export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().optional(),
  riskCategory: z.enum([
    'BLEEDING', 'CARDIOVASCULAR', 'HEPATOTOXICITY', 'CNS_SEDATION',
    'CYP_INTERACTION', 'GLYCEMIC', 'ELECTROLYTE', 'SEROTONIN_SYNDROME',
    'WITHDRAWAL', 'OTHER',
  ]).optional(),
  minHoldDays: z.coerce.number().int().min(0).max(30).optional(),
  evidenceLevel: z.enum(['A', 'B', 'C', 'D']).optional(),
  systemType: z.enum(['CONVENTIONAL', 'INTEGRATIVE', 'TRADITIONAL', 'COMPLEMENTARY']).optional(),
  medClass: z.string().optional(),
});

/**
 * GET /api/herbals — browse and filter the perioperative herbal contraindication list
 * Public endpoint. Data is sourced from SPAQI 2020 consensus + NCCIH.
 */
export const GET = createPublicRoute(async (request: Request) => {
  try {
    const url = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(url.searchParams));

    const where: Record<string, unknown> = {};

    if (params.q) {
      where.OR = [
        { commonName:     { contains: params.q, mode: 'insensitive' } },
        { scientificName: { contains: params.q, mode: 'insensitive' } },
        { commonNamePt:   { contains: params.q, mode: 'insensitive' } },
        { commonNameEs:   { contains: params.q, mode: 'insensitive' } },
        { aliases:        { has: params.q.toLowerCase() } },
      ];
    }
    if (params.riskCategory) where.primaryRiskCategory = params.riskCategory;
    if (params.minHoldDays !== undefined) where.holdDaysPreOp = { gte: params.minHoldDays };
    if (params.evidenceLevel) where.evidenceLevel = params.evidenceLevel;
    if (params.systemType) where.commonInSystemTypes = { has: params.systemType };
    if (params.medClass) where.interactingMedClasses = { has: params.medClass.toUpperCase() };

    const herbals = await prisma.herbalContraindication.findMany({
      where,
      select: {
        id: true,
        slug: true,
        commonName: true,
        scientificName: true,
        commonNamePt: true,
        commonNameEs: true,
        aliases: true,
        holdDaysPreOp: true,
        clinicalConcern: true,
        primaryRiskCategory: true,
        riskCategories: true,
        evidenceLevel: true,
        interactingMedClasses: true,
        commonInSystemTypes: true,
        mustDiscloseToAnesthesia: true,
      },
      orderBy: [{ holdDaysPreOp: 'desc' }, { commonName: 'asc' }],
    });

    return NextResponse.json({
      data: herbals,
      total: herbals.length,
      meta: {
        source: 'SPAQI 2020 Consensus — Mayo Clin Proc 95(6):1344-1360',
        citationPmid: '32540015',
      },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
