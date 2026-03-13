/**
 * CDSS V3 - FHIR Sync API
 *
 * POST /api/fhir/sync - Trigger sync operations
 * GET /api/fhir/sync - Get sync status and statistics
 *
 * Operations:
 * - push: Push local patient data to FHIR server
 * - pull: Pull patient data from FHIR server
 *
 * CRITICAL: All conflicts require human review - NO AUTO-MERGE
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createSyncService } from '@/lib/services/sync.service';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Request schema for sync operations
const SyncRequestSchema = z.object({
  operation: z.enum(['push', 'pull']),
  resourceType: z.enum(['Patient', 'Observation', 'MedicationRequest', 'Condition']).default('Patient'),
  // For push operations
  localId: z.string().optional(),
  // For pull operations
  fhirResourceId: z.string().optional(),
  localPatientId: z.string().optional(),
}).refine(
  (data) => {
    if (data.operation === 'push' && !data.localId) {
      return false;
    }
    if (data.operation === 'pull' && !data.fhirResourceId) {
      return false;
    }
    return true;
  },
  {
    message: 'push requires localId, pull requires fhirResourceId',
  }
);

/**
 * POST /api/fhir/sync
 *
 * Trigger a FHIR sync operation.
 * Returns sync event ID for polling status.
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = SyncRequestSchema.safeParse(body);

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

      const { operation, resourceType, localId, fhirResourceId, localPatientId } = validationResult.data;

      logger.info({
        event: 'fhir_sync_api_request',
        operation,
        resourceType,
        localId,
        fhirResourceId,
        userId: context.user?.id,
      });

      const syncService = createSyncService();
      let syncEventId: string;

      if (operation === 'push') {
        // Push local data to FHIR server
        if (resourceType === 'Patient') {
          syncEventId = await syncService.pushPatient(localId!);
        } else {
          // @todo(fhir-resource-types): Implement push for non-Patient resource types
          return NextResponse.json(
            { success: false, error: `Push for ${resourceType} not yet implemented` },
            { status: 501 }
          );
        }
      } else {
        // Pull data from FHIR server
        if (resourceType === 'Patient') {
          syncEventId = await syncService.pullPatient(fhirResourceId!, localPatientId);
        } else {
          // @todo(fhir-resource-types): Implement pull for non-Patient resource types
          return NextResponse.json(
            { success: false, error: `Pull for ${resourceType} not yet implemented` },
            { status: 501 }
          );
        }
      }

      // HIPAA Audit Log
      await createAuditLog({
        action: 'CREATE',
        resource: 'FHIRSyncEvent',
        resourceId: syncEventId,
        details: {
          operation,
          resourceType,
          localId,
          fhirResourceId,
        },
        success: true,
      });

      logger.info({
        event: 'fhir_sync_api_enqueued',
        syncEventId,
        operation,
        resourceType,
      });

      return NextResponse.json({
        success: true,
        data: {
          syncEventId,
          operation,
          resourceType,
          status: 'PENDING',
          message: 'Sync operation enqueued. Poll /api/fhir/sync/[syncEventId] for status.',
        },
      });
    } catch (error) {
      logger.error({
        event: 'fhir_sync_api_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to initiate sync',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);

/**
 * GET /api/fhir/sync
 *
 * Get sync statistics and status overview.
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      const syncService = createSyncService();
      const stats = await syncService.getSyncStats();

      logger.info({
        event: 'fhir_sync_stats_fetch',
        userId: context.user?.id,
        stats,
      });

      return NextResponse.json({
        success: true,
        data: {
          stats,
          message: stats.conflicts > 0
            ? `${stats.conflicts} conflict(s) require human review`
            : 'No conflicts pending',
        },
      });
    } catch (error) {
      logger.error({
        event: 'fhir_sync_stats_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch sync statistics',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
