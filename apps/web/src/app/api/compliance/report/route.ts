/**
 * GET /api/compliance/report?startDate=...&endDate=...
 *
 * Generate a compliance report including audit chain verification and statistics.
 * Returns a comprehensive view of audit log integrity and metadata for the given period.
 *
 * RUTH gate: Restricted to ADMIN and COMPLIANCE_ADMIN roles.
 * CYRUS gate: Uses createProtectedRoute for RBAC enforcement.
 *
 * Query params:
 * - startDate: string (ISO 8601, required)
 * - endDate: string (ISO 8601, required)
 *
 * Response:
 * - period: { start: Date, end: Date }
 * - verification: ChainVerificationResult
 * - stats: { totalEntries, chainedEntries, unchainedEntries, oldestChainedEntry, latestChainedEntry }
 * - generatedAt: Date
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { generateComplianceReport } from '@/lib/security/audit-chain';

async function handler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  if (!startDateStr || !endDateStr) {
    return NextResponse.json(
      {
        success: false,
        error: 'startDate and endDate query parameters are required (ISO 8601 format)',
      },
      { status: 400 }
    );
  }

  try {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use ISO 8601 (e.g., 2026-03-01T00:00:00Z)',
        },
        { status: 400 }
      );
    }

    const report = await generateComplianceReport(startDate, endDate);

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate compliance report',
      },
      { status: 500 }
    );
  }
}

export const GET = createProtectedRoute(handler, {
  roles: ['ADMIN', 'COMPLIANCE_ADMIN'],
  audit: {
    action: 'COMPLIANCE_REPORT_GENERATED',
    resource: 'compliance_report',
  },
});
