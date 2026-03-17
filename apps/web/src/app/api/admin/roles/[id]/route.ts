/**
 * Role Assignment Revocation Route
 *
 * DELETE /api/admin/roles/[id] - Revoke role assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

// =============================================================================
// DELETE: Revoke role assignment
// =============================================================================

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    // Get ID from route params
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    // Find assignment
    const assignment: any = await prisma.roleAssignment.findUnique({
      where: { id },
      include: {
        grantee: { select: { id: true, email: true, name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: `Role assignment not found: ${id}` },
        { status: 404 }
      );
    }

    // Verify not already revoked
    if (assignment.revokedAt) {
      return NextResponse.json(
        {
          error: `Role assignment already revoked at ${assignment.revokedAt.toISOString()}`,
        },
        { status: 409 }
      );
    }

    // Revoke
    const revoked: any = await prisma.roleAssignment.update({
      where: { id },
      data: {
        revokedAt: new Date(),
      },
      include: {
        grantee: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({
      assignmentId: revoked.id,
      granteeId: revoked.granteeId,
      granteeName: revoked.grantee.name || revoked.grantee.email,
      role: revoked.role,
      revokedAt: revoked.revokedAt.toISOString(),
      message: `Role ${revoked.role} revoked from ${revoked.grantee.email}`,
    });
  },
  { roles: ['ADMIN'] }
);
