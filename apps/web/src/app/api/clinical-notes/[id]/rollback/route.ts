/**
 * Clinical Note Rollback API
 * Admin-only: Rollback note to a previous version
 *
 * POST /api/clinical-notes/[id]/rollback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { rollbackToVersion } from '@/lib/clinical-notes/version-control';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const RollbackSchema = z.object({
  versionId: z.string().cuid(),
  reason: z.string().optional(), // Why the rollback is being performed
});

// ============================================================================
// POST /api/clinical-notes/[id]/rollback
// ============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;
    const body = await request.json();
    const validated = RollbackSchema.parse(body);

    // Verify note exists
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        authorId: true,
      },
    });

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: 'Clinical note not found',
        },
        { status: 404 }
      );
    }

    // Get user ID from request (should be set by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not authenticated',
        },
        { status: 401 }
      );
    }

    // Get IP and user agent for audit
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      // Perform rollback
      const updatedNote = await rollbackToVersion({
        noteId: id,
        versionId: validated.versionId,
        rolledBackBy: userId,
        ipAddress,
        userAgent,
      });

      // Log in audit trail
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ROLLBACK',
          resource: 'ClinicalNote',
          resourceId: id,
          changes: {
            versionId: validated.versionId,
            reason: validated.reason,
          },
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedNote,
        message: 'Note successfully rolled back to previous version',
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Rollback failed',
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN'], // Only admins can rollback notes
    rateLimit: { windowMs: 60000, maxRequests: 10 },
    audit: { action: 'ROLLBACK', resource: 'ClinicalNote' },
  }
);
