/**
 * Clinical Note Version History API
 * HIPAA-compliant audit trail
 *
 * GET /api/clinical-notes/[id]/versions - Get all versions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { getNoteVersions } from '@/lib/clinical-notes/version-control';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/clinical-notes/[id]/versions
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // Verify note exists
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
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

    // Get all versions
    const versions = await getNoteVersions(id);

    return NextResponse.json({
      success: true,
      data: {
        noteId: id,
        patientId: note.patientId,
        versions,
        totalVersions: versions.length,
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
    audit: {
      action: 'READ',
      resource: 'ClinicalNoteVersions',
      details: (req, context) => ({
        noteId: context.params.id,
        accessType: 'VERSION_HISTORY_VIEW',
      }),
    },
  }
);
