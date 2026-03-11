/**
 * Search API
 *
 * GET /api/search?q=query&types=patient,appointment
 * Universal search across all data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { search } from '@/lib/search';
import logger from '@/lib/logger';
import type { SearchResult } from '@/lib/search';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      // Rate limiting for search
      const rateLimitError = await checkRateLimit(request, 'search');
      if (rateLimitError) return rateLimitError;

      const searchParams = request.nextUrl.searchParams;
      const query = searchParams.get('q');
      const types = searchParams.get('types')?.split(',') as
        | SearchResult['type'][]
        | undefined;
      const limit = parseInt(searchParams.get('limit') || '20');

      if (!query) {
        return NextResponse.json(
          {
            success: false,
            error: 'Query parameter "q" is required',
          },
          { status: 400 }
        );
      }

      const userId = context.user?.id ?? '';
      const results = await search({
        userId,
        userType: 'clinician',
        query,
        limit,
        types,
      });

      logger.info({
        event: 'search_performed',
        userId,
        userType: 'clinician',
        query,
        resultsCount: results.length,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            results,
            query,
            count: results.length,
          },
        },
        { status: 200 }
      );
    } catch (error) {
    logger.error({
      event: 'search_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al realizar la búsqueda.',
      },
      { status: 500 }
    );
  }
},
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], skipCsrf: true }
);
