/**
 * CDSS V3 - FHIR Sync Event Status API
 *
 * GET /api/fhir/sync/[syncEventId] - Get status of a specific sync event
 *
 * Used by frontend to poll for sync completion or conflict detection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createSyncService } from '@/lib/services/sync.service';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/fhir/sync/[syncEventId]
 *
 * Get the status of a specific sync event.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { syncEventId: string } }
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

    const { syncEventId } = params;

    if (!syncEventId) {
      return NextResponse.json(
        { success: false, error: 'Sync event ID is required' },
        { status: 400 }
      );
    }

    const syncService = createSyncService();
    const syncEvent = await syncService.getSyncStatus(syncEventId);

    if (!syncEvent) {
      return NextResponse.json(
        { success: false, error: 'Sync event not found' },
        { status: 404 }
      );
    }

    logger.info({
      event: 'fhir_sync_status_fetch',
      syncEventId,
      status: syncEvent.status,
      userId: session.user.id,
    });

    // Build response based on status
    const response: Record<string, unknown> = {
      id: syncEvent.id,
      direction: syncEvent.direction,
      resourceType: syncEvent.resourceType,
      resourceId: syncEvent.resourceId,
      operation: syncEvent.operation,
      status: syncEvent.status,
      createdAt: syncEvent.createdAt,
      syncedAt: syncEvent.syncedAt,
    };

    // Add error message if failed
    if (syncEvent.status === 'FAILED' && syncEvent.errorMessage) {
      response.errorMessage = syncEvent.errorMessage;
    }

    // Add conflict data if in conflict (for review)
    if (syncEvent.status === 'CONFLICT' && syncEvent.conflictData) {
      response.conflictData = syncEvent.conflictData;
      response.message = 'CRITICAL: Human review required. No auto-merge allowed.';
    }

    // Add resolution details if resolved
    if (syncEvent.status === 'SYNCED' && syncEvent.resolution) {
      response.resolution = syncEvent.resolution;
      response.resolvedBy = syncEvent.resolvedBy;
      response.resolvedAt = syncEvent.resolvedAt;
    }

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error({
      event: 'fhir_sync_status_error',
      syncEventId: params.syncEventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sync status',
      },
      { status: 500 }
    );
  }
}
