/**
 * Revenue Gap Auditor API
 *
 * Endpoints:
 * - GET /api/auditor/summary - Get revenue gap summary
 * - GET /api/auditor/patient/:id - Get gaps for a specific patient
 * - POST /api/auditor/scan - Trigger a scan for a patient
 *
 * @module api/auditor
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auditorService } from '@/services/auditor/auditor.service';
import type { RevenueGapSummary } from '@/services/auditor/types';
import logger from '@/lib/logger';

/**
 * GET /api/auditor - Get revenue gap summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId') || undefined;
    const patientId = searchParams.get('patientId');
    const lookbackHours = parseInt(searchParams.get('lookbackHours') || '24', 10);

    if (patientId) {
      // Get gaps for specific patient
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

    // Get summary for clinic
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
  } catch (error) {
    logger.error({
      event: 'auditor_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get revenue gap data',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auditor - Trigger a scan for a patient
 */
export async function POST(request: NextRequest) {
  try {
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

    // Scan recent notes
    const scanResults = await auditorService.scanRecentNotes(patientId, { lookbackHours });

    // Find revenue gaps
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
  } catch (error) {
    logger.error({
      event: 'auditor_scan_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scan patient notes',
      },
      { status: 500 }
    );
  }
}

/**
 * Format currency in BRL
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}
