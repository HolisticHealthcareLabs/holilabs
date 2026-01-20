/**
 * Message Search API
 *
 * GET /api/messages/search - Search messages with Meilisearch
 *
 * Query Parameters:
 * - q: Search query (required)
 * - patientId: Filter by conversation/patient
 * - isRead: Filter by read status (true/false)
 * - hasAttachments: Filter by attachment presence (true/false)
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { searchMessages } from '@/lib/search/meilisearch';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    const patientId = searchParams.get('patientId') || undefined;
    const isRead = searchParams.get('isRead');
    const hasAttachments = searchParams.get('hasAttachments');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      // Clinician search - can search across all their conversations
      const results = await searchMessages({
        query: query.trim(),
        patientId,
        userId: clinicianSession.user.id,
        isRead: isRead ? isRead === 'true' : undefined,
        hasAttachments: hasAttachments ? hasAttachments === 'true' : undefined,
        limit,
        offset,
      });

      // HIPAA Audit Log: Clinician searched messages
      await createAuditLog({
        action: 'READ',
        resource: 'Message',
        resourceId: 'search',
        details: {
          searchQuery: query,
          patientId,
          resultsCount: results.hits.length,
          accessType: 'MESSAGE_SEARCH',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          messages: results.hits,
          pagination: {
            total: results.estimatedTotalHits,
            limit: results.limit,
            offset: results.offset,
            hasMore: (results.offset || 0) + results.hits.length < (results.estimatedTotalHits || 0),
          },
          meta: {
            query: results.query,
            processingTimeMs: results.processingTimeMs,
          },
        },
      });
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      // Patient search - restricted to their own messages
      const results = await searchMessages({
        query: query.trim(),
        patientId: patientSession.patientId, // Always filter to patient's messages
        isRead: isRead ? isRead === 'true' : undefined,
        hasAttachments: hasAttachments ? hasAttachments === 'true' : undefined,
        limit,
        offset,
      });

      // HIPAA Audit Log: Patient searched their messages
      await createAuditLog({
        action: 'READ',
        resource: 'Message',
        resourceId: patientSession.patientId,
        details: {
          patientId: patientSession.patientId,
          searchQuery: query,
          resultsCount: results.hits.length,
          accessType: 'PATIENT_MESSAGE_SEARCH',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          messages: results.hits,
          pagination: {
            total: results.estimatedTotalHits,
            limit: results.limit,
            offset: results.offset,
            hasMore: (results.offset || 0) + results.hits.length < (results.estimatedTotalHits || 0),
          },
          meta: {
            query: results.query,
            processingTimeMs: results.processingTimeMs,
          },
        },
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error({
      event: 'message_search_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // If Meilisearch is unavailable, return a friendly error
    if (error instanceof Error && error.message.includes('MEILI')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search service temporarily unavailable',
          message: 'Please try again later or contact support',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al buscar mensajes' },
      { status: 500 }
    );
  }
}
