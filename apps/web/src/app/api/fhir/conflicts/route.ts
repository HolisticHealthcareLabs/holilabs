/**
 * CDSS V3 - FHIR Conflicts API
 *
 * GET /api/fhir/conflicts - List all pending conflicts requiring human review
 *
 * CRITICAL: This endpoint surfaces conflicts that MUST be resolved manually.
 * There is NO auto-merge functionality. All conflicts require explicit
 * human decision: KEEP_LOCAL, KEEP_REMOTE, or MANUAL_MERGE.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createSyncService } from '@/lib/services/sync.service';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/fhir/conflicts
 *
 * List all pending FHIR sync conflicts.
 * Supports filtering by resourceType and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('resourceType');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    logger.info({
      event: 'fhir_conflicts_list_request',
      resourceType,
      page,
      limit,
      userId: session.user.id,
    });

    // Build query
    const where: Record<string, unknown> = {
      status: 'CONFLICT',
    };

    if (resourceType) {
      where.resourceType = resourceType;
    }

    // Fetch conflicts with pagination
    const [conflicts, totalCount] = await Promise.all([
      prisma.fHIRSyncEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.fHIRSyncEvent.count({ where }),
    ]);

    // Enrich conflicts with patient/resource details
    const enrichedConflicts = await Promise.all(
      conflicts.map(async (conflict) => {
        let resourceDetails: Record<string, unknown> = {};

        if (conflict.resourceType === 'Patient') {
          const patient = await prisma.patient.findUnique({
            where: { id: conflict.resourceId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              dateOfBirth: true,
            },
          });

          if (patient) {
            resourceDetails = {
              patientName: `${patient.firstName} ${patient.lastName}`,
              mrn: patient.mrn,
              dateOfBirth: patient.dateOfBirth,
            };
          }
        }

        // Parse conflict data to show diff
        let conflictSummary: Record<string, unknown> = {};
        if (conflict.conflictData) {
          const data = conflict.conflictData as { local?: unknown; remote?: unknown; detectedAt?: string };
          conflictSummary = {
            hasLocalData: !!data.local,
            hasRemoteData: !!data.remote,
            detectedAt: data.detectedAt,
          };
        }

        return {
          id: conflict.id,
          direction: conflict.direction,
          resourceType: conflict.resourceType,
          resourceId: conflict.resourceId,
          operation: conflict.operation,
          status: conflict.status,
          localVersion: conflict.localVersion,
          remoteVersion: conflict.remoteVersion,
          retryCount: conflict.retryCount,
          createdAt: conflict.createdAt,
          ...resourceDetails,
          conflictSummary,
        };
      })
    );

    // HIPAA Audit Log - Conflict list access
    await createAuditLog({
      action: 'READ',
      resource: 'FHIRSyncConflicts',
      resourceId: 'list',
      details: {
        resourceType,
        totalConflicts: totalCount,
        page,
        limit,
      },
      success: true,
    });

    logger.info({
      event: 'fhir_conflicts_list_success',
      totalConflicts: totalCount,
      returnedCount: enrichedConflicts.length,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        conflicts: enrichedConflicts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + conflicts.length < totalCount,
        },
        warning: totalCount > 0
          ? 'CRITICAL: These conflicts require human review. Auto-merge is disabled for patient safety.'
          : undefined,
      },
    });
  } catch (error) {
    logger.error({
      event: 'fhir_conflicts_list_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch conflicts',
      },
      { status: 500 }
    );
  }
}
