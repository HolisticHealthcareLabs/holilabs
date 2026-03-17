/**
 * POST /api/compliance/audit-chain/verify
 *
 * Verify the integrity of the audit chain for a given time period.
 * Returns whether the chain is valid or indicates where tampering occurred.
 *
 * RUTH gate: Restricted to ADMIN and COMPLIANCE_ADMIN roles.
 * CYRUS gate: Uses createProtectedRoute for RBAC enforcement.
 *
 * Body:
 * - startDate?: string (ISO 8601, optional)
 * - endDate?: string (ISO 8601, optional)
 *
 * Response:
 * - valid: boolean
 * - totalEntries: number
 * - verifiedEntries: number
 * - brokenAt?: { entryId, timestamp, reason }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { verifyAuditChain } from '@/lib/security/audit-chain';

async function handler(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const { startDate, endDate } = body;

  const result = await verifyAuditChain(
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  return NextResponse.json(
    {
      success: true,
      data: result,
    },
    { status: 200 }
  );
}

export const POST = createProtectedRoute(handler, {
  roles: ['ADMIN', 'COMPLIANCE_ADMIN'],
  audit: {
    action: 'AUDIT_VERIFICATION',
    resource: 'audit_chain',
  },
});
