/**
 * Clinical Note Version Detail API
 *
 * GET /api/clinical-notes/[id]/versions/[versionId] - Get specific version
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { getNoteVersion } from '@/lib/clinical-notes/version-control';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/clinical-notes/[id]/versions/[versionId]
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id, versionId } = context.params;

    // Verify note exists
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      select: { id: true, patientId: true },
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

    // Get specific version
    const version = await getNoteVersion(id, versionId);

    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: 'Version not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        noteId: id,
        patientId: note.patientId,
        version,
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
    audit: {
      action: 'READ',
      resource: 'ClinicalNoteVersion',
    },
  }
);
