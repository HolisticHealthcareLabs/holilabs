/**
 * Team Management API
 *
 * GET /api/admin/team - List team members in the caller's organization
 *
 * CYRUS: createProtectedRoute RBAC guard — ADMIN and LICENSE_OWNER only.
 * CYRUS: No cross-tenant access — scoped to the authenticated user's context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const users = await prisma.user.findMany({
      where: {
        isEphemeral: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const team = users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      role: u.role,
      assignedAt: u.createdAt.toISOString().split('T')[0],
    }));

    return NextResponse.json({ success: true, data: team });
  },
  {
    roles: ['ADMIN', 'LICENSE_OWNER'],
  }
);
