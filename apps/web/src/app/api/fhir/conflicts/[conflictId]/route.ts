/**
 * CDSS V3 - FHIR Conflict Resolution API
 *
 * GET /api/fhir/conflicts/[conflictId] - Get conflict details for review
 * POST /api/fhir/conflicts/[conflictId] - Resolve a conflict
 *
 * CRITICAL: This is the ONLY way to resolve FHIR sync conflicts.
 * No auto-merge is allowed. Human must explicitly choose:
 * - KEEP_LOCAL: Overwrite remote with local data
 * - KEEP_REMOTE: Overwrite local with remote data
 * - MANUAL_MERGE: Apply manually edited merged data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { createSyncService } from '@/lib/services/sync.service';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Resolution request schema
const ResolutionRequestSchema = z.object({
  resolution: z.enum(['KEEP_LOCAL', 'KEEP_REMOTE', 'MANUAL_MERGE']),
  // Required for MANUAL_MERGE - the edited merged data
  mergedData: z.record(z.unknown()).optional(),
  // Optional comment explaining the resolution decision
  comment: z.string().max(500).optional(),
}).refine(
  (data) => {
    // MANUAL_MERGE requires mergedData
    if (data.resolution === 'MANUAL_MERGE' && !data.mergedData) {
      return false;
    }
    return true;
  },
  {
    message: 'MANUAL_MERGE resolution requires mergedData',
  }
);

/**
 * GET /api/fhir/conflicts/[conflictId]
 *
 * Get detailed conflict data for human review.
 * Shows both local and remote versions side by side.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conflictId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { conflictId } = params;

    if (!conflictId) {
      return NextResponse.json(
        { success: false, error: 'Conflict ID is required' },
        { status: 400 }
      );
    }

    // Fetch conflict
    const conflict = await prisma.fHIRSyncEvent.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      return NextResponse.json(
        { success: false, error: 'Conflict not found' },
        { status: 404 }
      );
    }

    if (conflict.status !== 'CONFLICT') {
      return NextResponse.json(
        { success: false, error: 'This sync event is not in CONFLICT status' },
        { status: 400 }
      );
    }

    logger.info({
      event: 'fhir_conflict_detail_fetch',
      conflictId,
      resourceType: conflict.resourceType,
      userId: session.user.id,
    });

    // Get resource details
    let resourceDetails: Record<string, unknown> = {};
    if (conflict.resourceType === 'Patient') {
      const patient = await prisma.patient.findUnique({
        where: { id: conflict.resourceId },
      });

      if (patient) {
        resourceDetails = {
          currentLocalData: patient,
        };
      }
    }

    // Parse conflict data
    const conflictData = conflict.conflictData as {
      local?: unknown;
      remote?: unknown;
      detectedAt?: string;
    } | null;

    // HIPAA Audit Log
    await createAuditLog({
      action: 'READ',
      resource: 'FHIRSyncConflict',
      resourceId: conflictId,
      details: {
        resourceType: conflict.resourceType,
        resourceId: conflict.resourceId,
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: conflict.id,
        direction: conflict.direction,
        resourceType: conflict.resourceType,
        resourceId: conflict.resourceId,
        operation: conflict.operation,
        status: conflict.status,
        localVersion: conflict.localVersion,
        remoteVersion: conflict.remoteVersion,
        createdAt: conflict.createdAt,
        conflictData: {
          local: conflictData?.local,
          remote: conflictData?.remote,
          detectedAt: conflictData?.detectedAt,
        },
        ...resourceDetails,
        instructions: {
          KEEP_LOCAL: 'Your local changes will overwrite the remote data.',
          KEEP_REMOTE: 'Remote data will overwrite your local changes.',
          MANUAL_MERGE: 'You must provide the merged data that combines both versions.',
        },
        warning: 'CRITICAL: Review both versions carefully before resolving. This action cannot be undone.',
      },
    });
  } catch (error) {
    logger.error({
      event: 'fhir_conflict_detail_error',
      conflictId: params.conflictId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch conflict details',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fhir/conflicts/[conflictId]
 *
 * Resolve a FHIR sync conflict.
 * This is the ONLY way to resolve conflicts - no auto-merge.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { conflictId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { conflictId } = params;

    if (!conflictId) {
      return NextResponse.json(
        { success: false, error: 'Conflict ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ResolutionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { resolution, mergedData, comment } = validationResult.data;

    logger.info({
      event: 'fhir_conflict_resolve_start',
      conflictId,
      resolution,
      hasManualMerge: !!mergedData,
      userId: session.user.id,
    });

    // Verify conflict exists and is in CONFLICT status
    const conflict = await prisma.fHIRSyncEvent.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      return NextResponse.json(
        { success: false, error: 'Conflict not found' },
        { status: 404 }
      );
    }

    if (conflict.status !== 'CONFLICT') {
      return NextResponse.json(
        {
          success: false,
          error: 'This sync event is not in CONFLICT status',
          currentStatus: conflict.status,
        },
        { status: 400 }
      );
    }

    // Resolve the conflict
    const syncService = createSyncService();
    const resolved = await syncService.resolveConflict({
      syncEventId: conflictId,
      resolution,
      resolvedBy: session.user.id,
      mergedData,
    });

    // HIPAA Audit Log - Conflict resolution
    await createAuditLog({
      action: 'UPDATE',
      resource: 'FHIRSyncConflict',
      resourceId: conflictId,
      details: {
        resolution,
        resourceType: conflict.resourceType,
        resourceId: conflict.resourceId,
        comment,
        hasManualMerge: !!mergedData,
      },
      success: true,
    });

    logger.info({
      event: 'fhir_conflict_resolved',
      conflictId,
      resolution,
      resolvedBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: resolved.id,
        status: resolved.status,
        resolution: resolved.resolution,
        resolvedBy: resolved.resolvedBy,
        resolvedAt: resolved.resolvedAt,
        message: `Conflict resolved with ${resolution}. ${
          resolution === 'KEEP_LOCAL'
            ? 'Local data will be pushed to remote.'
            : resolution === 'KEEP_REMOTE'
            ? 'Remote data has been applied to local record.'
            : 'Merged data has been applied.'
        }`,
      },
    });
  } catch (error) {
    logger.error({
      event: 'fhir_conflict_resolve_error',
      conflictId: params.conflictId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // HIPAA Audit Log - Failed resolution
    await createAuditLog({
      action: 'UPDATE',
      resource: 'FHIRSyncConflict',
      resourceId: params.conflictId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      success: false,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resolve conflict',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
