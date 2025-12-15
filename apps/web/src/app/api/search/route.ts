/**
 * Search API
 *
 * GET /api/search?q=query&types=patient,appointment
 * Universal search across all data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { search } from '@/lib/search';
import logger from '@/lib/logger';
import type { SearchResult } from '@/lib/search';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
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

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      // Clinician search
      const results = await search({
        userId: clinicianSession.user.id,
        userType: 'clinician',
        query,
        limit,
        types,
      });

      logger.info({
        event: 'search_performed',
        userId: clinicianSession.user.id,
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
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      // Patient search
      const results = await search({
        userId: patientSession.patientId,
        userType: 'patient',
        query,
        limit,
        types,
      });

      logger.info({
        event: 'search_performed',
        patientId: patientSession.patientId,
        userType: 'patient',
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
      // Not a patient either
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }
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
}
