/**
 * Patient Search API using Meilisearch
 *
 * GET /api/patients/search?q=john&limit=20&offset=0
 *
 * Features:
 * - Sub-50ms search responses
 * - Typo-tolerant (finds "Jhon" when searching for "John")
 * - Filters by clinician, status, gender
 * - Highlighting and snippeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { searchPatients, initializeMeilisearch } from '@/lib/search/meilisearch';

export const dynamic = 'force-dynamic';

/**
 * GET /api/patients/search
 * Fast patient search using Meilisearch
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);

      // Get query parameters
      const query = searchParams.get('q') || '';
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');
      const isActive = searchParams.get('isActive');
      const isPalliativeCare = searchParams.get('isPalliativeCare');
      const gender = searchParams.get('gender');
      const sort = searchParams.get('sort');

      // Validate limit
      if (limit > 100) {
        return NextResponse.json(
          { error: 'Limit cannot exceed 100' },
          { status: 400 }
        );
      }

      // Initialize Meilisearch if not already done
      await initializeMeilisearch();

      // Search patients
      const results = await searchPatients({
        query,
        clinicianId: context.user.id, // Only search user's patients
        isActive: isActive !== null ? isActive === 'true' : undefined,
        isPalliativeCare: isPalliativeCare !== null ? isPalliativeCare === 'true' : undefined,
        gender: gender || undefined,
        limit,
        offset,
        sort: sort ? [sort] : undefined,
      });

      return NextResponse.json({
        success: true,
        data: results.hits,
        meta: {
          query: results.query,
          estimatedTotalHits: results.estimatedTotalHits,
          limit: results.limit,
          offset: results.offset,
          processingTimeMs: results.processingTimeMs,
        },
      });
    } catch (error: any) {
      console.error('Error searching patients:', error);

      // If Meilisearch is not available, return helpful error
      if (error.code === 'ECONNREFUSED') {
        return NextResponse.json(
          {
            error: 'Search service unavailable',
            message: 'Meilisearch is not running. Start it with: docker compose up meilisearch',
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to search patients',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
     // GET requests don't need CSRF protection
    audit: { action: 'READ', resource: 'Patient' },
  }
);
