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
import { createProtectedRoute } from '@/lib/api/middleware';
import { searchMessages } from '@/lib/search/meilisearch';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    const queryPatientId = searchParams.get('patientId') || undefined;
    const isRead = searchParams.get('isRead');
    const hasAttachments = searchParams.get('hasAttachments');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const userId = context.user?.id;
    const isPatient = context.user?.role === 'PATIENT';

    let results;
    try {
      results = await searchMessages({
        query: query.trim(),
        patientId: isPatient ? userId : queryPatientId,
        userId: isPatient ? undefined : userId,
        isRead: isRead ? isRead === 'true' : undefined,
        hasAttachments: hasAttachments ? hasAttachments === 'true' : undefined,
        limit,
        offset,
      });
    } catch (searchError) {
      logger.error({
        event: 'message_search_error',
        error: searchError instanceof Error ? searchError.message : 'Unknown error',
      });
      if (searchError instanceof Error && searchError.message.includes('MEILI')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Search service temporarily unavailable',
            message: 'Please try again later or contact support',
          },
          { status: 503 }
        );
      }
      throw searchError;
    }

    await createAuditLog({
      action: 'READ',
      resource: 'Message',
      resourceId: isPatient ? userId : 'search',
      details: {
        patientId: isPatient ? userId : queryPatientId,
        searchQuery: query,
        resultsCount: results.hits.length,
        accessType: isPatient ? 'PATIENT_MESSAGE_SEARCH' : 'MESSAGE_SEARCH',
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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'NURSE', 'STAFF'],
    allowPatientAuth: true,
    skipCsrf: true,
  }
);
