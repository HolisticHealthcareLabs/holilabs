/**
 * Revenue Gap Auditor API
 *
 * Endpoints:
 * - GET /api/auditor - Get revenue gap summary
 * - POST /api/auditor - Trigger a scan for a patient
 *
 * @module api/auditor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { auditorService } from '@/services/auditor/auditor.service';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/**
 * GET /api/auditor - Get revenue gap summary
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId') || undefined;
    const patientId = searchParams.get('patientId');
    const lookbackHours = parseInt(searchParams.get('lookbackHours') || '24', 10);

    if (patientId) {
      const gaps = await auditorService.findRevenueGaps(patientId, { lookbackHours });

      return NextResponse.json({
        success: true,
        data: {
          patientId,
          gaps,
          totalGaps: gaps.length,
          totalPotentialValue: gaps.reduce((sum, g) => sum + g.procedure.estimatedValue, 0),
          totalPotentialValueFormatted: formatCurrency(
            gaps.reduce((sum, g) => sum + g.procedure.estimatedValue, 0)
          ),
        },
      });
    }

    const summary = await auditorService.getSummary(clinicId, { lookbackHours });

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        totalPotentialValueFormatted: formatCurrency(summary.totalPotentialValue),
        byCategory: Object.fromEntries(
          (Object.entries(summary.byCategory) as [string, { count: number; value: number }][]).map(
            ([key, categoryData]) => [
              key,
              {
                count: categoryData.count,
                value: categoryData.value,
                valueFormatted: formatCurrency(categoryData.value),
              },
            ]
          )
        ),
        topProcedures: summary.topProcedures.map((p) => ({
          ...p,
          totalValueFormatted: formatCurrency(p.totalValue),
        })),
      },
    });
  },
  { roles: ['ADMIN'] }
);

/**
 * POST /api/auditor - Trigger a scan for a patient
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const { patientId, lookbackHours = 24 } = body;

    if (!patientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'patientId is required',
        },
        { status: 400 }
      );
    }

    const scanResults = await auditorService.scanRecentNotes(patientId, { lookbackHours });
    const gaps = await auditorService.findRevenueGaps(patientId, { lookbackHours });

    logger.info({
      event: 'auditor_scan_complete',
      patientId,
      notesScanned: scanResults.length,
      proceduresDetected: scanResults.reduce((sum, r) => sum + r.detectedProcedures.length, 0),
      gapsFound: gaps.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        patientId,
        scanResults: scanResults.map((r) => ({
          noteId: r.noteId,
          noteDate: r.noteDate.toISOString(),
          proceduresDetected: r.detectedProcedures.length,
          scanTimeMs: r.scanTimeMs,
          procedures: r.detectedProcedures.map((p) => ({
            ...p,
            estimatedValueFormatted: formatCurrency(p.estimatedValue),
          })),
        })),
        gaps: gaps.map((g) => ({
          ...g,
          documentedAt: g.documentedAt.toISOString(),
          procedure: {
            ...g.procedure,
            estimatedValueFormatted: formatCurrency(g.procedure.estimatedValue),
          },
        })),
        summary: {
          notesScanned: scanResults.length,
          totalProceduresDetected: scanResults.reduce(
            (sum, r) => sum + r.detectedProcedures.length,
            0
          ),
          unbilledProcedures: gaps.length,
          totalPotentialValue: gaps.reduce((sum, g) => sum + g.procedure.estimatedValue, 0),
          totalPotentialValueFormatted: formatCurrency(
            gaps.reduce((sum, g) => sum + g.procedure.estimatedValue, 0)
          ),
        },
      },
    });
  },
  { roles: ['ADMIN'] }
);
