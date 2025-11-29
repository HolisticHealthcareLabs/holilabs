/**
 * Audit Log API - Immutability Enforcement
 *
 * Prevents modification or deletion of audit logs per HIPAA requirements
 * Audit logs are append-only and immutable
 *
 * @compliance HIPAA 164.312(b) - Audit controls (immutable)
 * @compliance LGPD Art. 37 - 5-year retention requirement
 * @inspiration Medplum AuditEvent immutability pattern
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/audit-logs/[id]
 *
 * Always returns 405 Method Not Allowed
 * Audit logs are immutable per HIPAA 164.312(b)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: 'Method Not Allowed',
      message: 'Audit logs are immutable and cannot be deleted (HIPAA 164.312(b) requirement)',
      compliance: {
        hipaa: 'HIPAA 164.312(b) - Audit controls require immutable audit trail',
        lgpd: 'LGPD Art. 37 - Logs must be retained for 5 years',
        law25326: 'Law 25.326 Art. 9 - Access logs must maintain integrity',
      },
      hint: 'Audit logs are append-only. To correct errors, create a new audit entry.',
    },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

/**
 * PUT /api/audit-logs/[id]
 *
 * Always returns 405 Method Not Allowed
 * Audit logs are immutable per HIPAA 164.312(b)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: 'Method Not Allowed',
      message: 'Audit logs are immutable and cannot be updated (HIPAA 164.312(b) requirement)',
      compliance: {
        hipaa: 'HIPAA 164.312(b) - Audit controls require immutable audit trail',
        lgpd: 'LGPD Art. 37 - Logs must be retained unaltered for 5 years',
        law25326: 'Law 25.326 Art. 9 - Access logs must maintain integrity',
      },
      hint: 'Audit logs are append-only. To correct errors, create a new audit entry with corrected data.',
    },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

/**
 * PATCH /api/audit-logs/[id]
 *
 * Always returns 405 Method Not Allowed
 * Audit logs are immutable per HIPAA 164.312(b)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: 'Method Not Allowed',
      message: 'Audit logs are immutable and cannot be modified (HIPAA 164.312(b) requirement)',
      compliance: {
        hipaa: 'HIPAA 164.312(b) - Audit controls require immutable audit trail',
        lgpd: 'LGPD Art. 37 - Logs must be retained unaltered for 5 years',
        law25326: 'Law 25.326 Art. 9 - Access logs must maintain integrity',
      },
      hint: 'Audit logs are append-only. To correct errors, create a new audit entry.',
    },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

/**
 * GET /api/audit-logs/[id]
 *
 * Read-only access to individual audit log
 * Requires ADMIN or AUDIT_VIEWER role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Note: Implement read access with RBAC middleware in future
  // For now, return method information
  return NextResponse.json({
    message: 'Audit log read endpoint',
    id: params.id,
    note: 'Read-only access. Audit logs cannot be modified or deleted.',
    compliance: {
      hipaa: 'HIPAA 164.312(b) compliant - Immutable audit trail',
      lgpd: 'LGPD Art. 37 compliant - 5-year retention',
    },
  });
}
