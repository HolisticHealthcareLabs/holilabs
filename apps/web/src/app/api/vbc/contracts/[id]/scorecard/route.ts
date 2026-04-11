import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const contractId = context.params?.id;

      const contract = await prisma.vBCPayerContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 },
        );
      }

      // Fetch latest results for each linked measure
      const measureResults = await Promise.all(
        contract.linkedMeasureCodes.map(async (code) => {
          const measure = await prisma.qualityMeasure.findUnique({
            where: { code },
          });
          if (!measure) return null;

          const latestResult = await prisma.qualityMeasureResult.findFirst({
            where: {
              measureId: measure.id,
              organizationId: contract.organizationId,
            },
            orderBy: { calculatedAt: 'desc' },
          });

          return {
            measureCode: code,
            measureName: measure.name,
            targetRate: measure.targetRate,
            currentRate: latestResult?.rate ?? null,
            meetsTarget: latestResult?.meetsTarget ?? null,
            gapCount: latestResult?.gapPatientIds?.length ?? 0,
            lastEvaluated: latestResult?.calculatedAt ?? null,
          };
        }),
      );

      const validResults = measureResults.filter(Boolean);
      const meetingCount = validResults.filter((r) => r?.meetsTarget).length;

      return NextResponse.json({
        success: true,
        data: {
          contract: {
            id: contract.id,
            payerName: contract.payerName,
            contractType: contract.contractType,
            effectiveFrom: contract.effectiveFrom,
            effectiveUntil: contract.effectiveUntil,
            baseBudgetBRL: contract.baseBudgetBRL,
            savingsSharePct: contract.savingsSharePct,
            qualityBonusPct: contract.qualityBonusPct,
          },
          measures: validResults,
          summary: {
            totalMeasures: validResults.length,
            meetingTarget: meetingCount,
            complianceRate: validResults.length > 0
              ? meetingCount / validResults.length
              : 0,
          },
        },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch contract scorecard' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'] as any,
    audit: { action: 'READ', resource: 'VBCPayerContract.Scorecard' },
  },
);
