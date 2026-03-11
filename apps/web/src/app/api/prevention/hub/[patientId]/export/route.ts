/**
 * Prevention Export API
 *
 * GET /api/prevention/hub/:patientId/export
 * Generates CSV or HTML/PDF exports of patient prevention data.
 *
 * Query Parameters:
 * - format: 'csv' | 'pdf' (required)
 * - includeRiskScores: boolean (optional, default true)
 * - includeScreenings: boolean (optional, default true)
 * - includePlans: boolean (optional, default true)
 *
 * Phase 5: Hub Actions & Clinical Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportPreventionReport, ExportOptions } from '@/lib/services/prevention-export.service';
import logger from '@/lib/logger';
import { auditExport } from '@/lib/audit';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute, requirePatientAccess } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prevention/hub/:patientId/export
 * Generate and download prevention report
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const rawParams = context.params;
    const patientId = rawParams && typeof (rawParams as Promise<unknown>).then === 'function'
      ? (await (rawParams as Promise<{ patientId: string }>)).patientId
      : (rawParams as { patientId?: string })?.patientId;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const start = performance.now();

    try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format');

    if (!format || (format !== 'csv' && format !== 'pdf')) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "csv" or "pdf"' },
        { status: 400 }
      );
    }

    const options: ExportOptions = {
      format: format as 'csv' | 'pdf',
      includeRiskScores: searchParams.get('includeRiskScores') !== 'false',
      includeScreenings: searchParams.get('includeScreenings') !== 'false',
      includePlans: searchParams.get('includePlans') !== 'false',
    };

    // Generate export
    const result = await exportPreventionReport(patientId, options);

    if (!result) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const elapsed = performance.now() - start;

    logger.info({
      event: 'prevention_export_downloaded',
      patientId,
      format,
      userId: context.user!.id,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit - log the export
    await auditExport('PreventionReport', patientId, request, {
      action: 'prevention_report_exported',
      format,
      exportedBy: context.user!.id,
      includeRiskScores: options.includeRiskScores,
      includeScreenings: options.includeScreenings,
      includePlans: options.includePlans,
    });

    // Return file download response
    const response = new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });

    return response;
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'prevention_export_error',
      patientId,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to generate export',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], customMiddlewares: [requirePatientAccess()] }
);
