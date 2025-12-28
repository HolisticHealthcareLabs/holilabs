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
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

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
 * Requires ADMIN role
 *
 * @compliance HIPAA 164.308(a)(4) - Access Controls
 * @compliance HIPAA 164.312(b) - Audit Controls
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { params } = context;

    try {
      // Fetch audit log from database
      const auditLog = await prisma.auditLog.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          userId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          success: true,
          errorMessage: true,
          createdAt: true,
        },
      });

      if (!auditLog) {
        return NextResponse.json(
          { error: 'Audit log not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        auditLog,
        note: 'Read-only access. Audit logs cannot be modified or deleted.',
        compliance: {
          hipaa: 'HIPAA 164.312(b) compliant - Immutable audit trail',
          lgpd: 'LGPD Art. 37 compliant - 5-year retention',
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to retrieve audit log',
          ...(process.env.NODE_ENV === 'development' && {
            details: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN'], // Only admins can read audit logs
    audit: { action: 'READ', resource: 'AuditLog' },
    skipCsrf: true, // GET requests don't need CSRF protection
  }
);
