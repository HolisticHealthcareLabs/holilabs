export const dynamic = "force-dynamic";
/**
 * Role Management API Routes
 *
 * GET  /api/admin/roles  - List role assignments
 * POST /api/admin/roles  - Grant role to user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { CyrusVetoError } from '@/lib/mcp/tools/role-admin.tools';

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const ListRoleAssignmentsQuerySchema = z.object({
  userId: z.string().optional(),
  role: z.string().optional(),
  includeRevoked: z.string().transform(v => v === 'true').optional(),
});

const GrantRoleBodySchema = z.object({
  granteeId: z.string().uuid('Invalid user ID format'),
  role: z.string().min(1, 'Role is required'),
  scope: z.string().optional(),
});

type GrantRoleInput = z.infer<typeof GrantRoleBodySchema>;

// =============================================================================
// GET: List role assignments
// =============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParse = ListRoleAssignmentsQuerySchema.safeParse({
      userId: searchParams.get('userId') || undefined,
      role: searchParams.get('role') || undefined,
      includeRevoked: searchParams.get('includeRevoked') || undefined,
    });

    if (!queryParse.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryParse.error.errors },
        { status: 400 }
      );
    }

    const { userId, role, includeRevoked = false } = queryParse.data;

    // Build where clause
    const where: any = {};
    if (userId) {
      where.granteeId = userId;
    }
    if (role) {
      where.role = role;
    }
    if (!includeRevoked) {
      where.revokedAt = null;
    }

    // Fetch assignments
    const assignments: any = await prisma.roleAssignment.findMany({
      where,
      include: {
        grantee: { select: { id: true, email: true, firstName: true, lastName: true } },
        grantor: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });

    return NextResponse.json({
      assignments: assignments.map((a: any) => ({
        id: a.id,
        granteeId: a.granteeId,
        granteeName: a.grantee.firstName && a.grantee.lastName
          ? `${a.grantee.firstName} ${a.grantee.lastName}`
          : a.grantee.email,
        role: a.role,
        scope: a.scope,
        grantedAt: a.grantedAt.toISOString(),
        revokedAt: a.revokedAt?.toISOString() || null,
        grantorEmail: a.grantor.email,
      })),
      total: assignments.length,
    });
  },
  { roles: ['ADMIN'] }
);

// =============================================================================
// POST: Grant role to user
// =============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    let body: GrantRoleInput;

    try {
      const json = await request.json();
      const bodyParse = GrantRoleBodySchema.safeParse(json);

      if (!bodyParse.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: bodyParse.error.errors },
          { status: 400 }
        );
      }

      body = bodyParse.data;
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // CYRUS VETO: Deny LICENSE_OWNER and COMPLIANCE_ADMIN
    if (body.role === 'LICENSE_OWNER' || body.role === 'COMPLIANCE_ADMIN') {
      return NextResponse.json(
        {
          error: `[VETO — CYRUS] ${body.role} role cannot be granted via API`,
          invariantViolated: `${body.role} role requires human-only approval`,
          proposedAction: `Attempting to grant ${body.role} to ${body.granteeId}`,
          requiredChange: 'Only human administrators may grant restricted roles',
        },
        { status: 403 }
      );
    }

    // Check if grantee exists
    const grantee = await prisma.user.findUnique({
      where: { id: body.granteeId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!grantee) {
      return NextResponse.json(
        { error: `User not found: ${body.granteeId}` },
        { status: 404 }
      );
    }

    // Create role assignment
    const assignment: any = await prisma.roleAssignment.create({
      data: {
        granteeId: body.granteeId,
        grantorId: context.user.id,
        role: body.role as UserRole,
        scope: body.scope,
        grantedAt: new Date(),
      },
      include: {
        grantee: { select: { id: true, email: true, firstName: true, lastName: true } },
        grantor: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(
      {
        assignmentId: assignment.id,
        granteeId: assignment.granteeId,
        granteeName: assignment.grantee.firstName && assignment.grantee.lastName
          ? `${assignment.grantee.firstName} ${assignment.grantee.lastName}`
          : assignment.grantee.email,
        role: assignment.role,
        scope: assignment.scope,
        grantedAt: assignment.grantedAt.toISOString(),
        grantorEmail: assignment.grantor.email,
        message: `Role ${assignment.role} granted to ${assignment.grantee.email}`,
      },
      { status: 201 }
    );
  },
  { roles: ['ADMIN'] }
);
