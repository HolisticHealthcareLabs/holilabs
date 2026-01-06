/**
 * Semantic Search API using pgvector
 *
 * POST /api/search/semantic - Search clinical data using natural language
 *
 * Request body:
 * {
 *   "query": "patients with diabetes and heart failure",
 *   "searchType": "clinical_notes" | "diagnoses" | "patients",
 *   "patientId": "optional-patient-id", // For patient-scoped search
 *   "limit": 10,
 *   "threshold": 0.7  // Minimum similarity score (0-1)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "results": [
 *     {
 *       "id": "string",
 *       "sourceType": "NOTE" | "DIAGNOSIS" | "PATIENT",
 *       "sourceId": "string",
 *       "similarity": 0.95,
 *       "preview": "First 200 chars of content...",
 *       "metadata": { ... }
 *     }
 *   ],
 *   "meta": {
 *     "queryEmbeddingTime": 150,
 *     "searchTime": 25,
 *     "totalTime": 175
 *   }
 * }
 *
 * IMPORTANT: Requires pgvector extension in PostgreSQL
 * Run: CREATE EXTENSION IF NOT EXISTS vector;
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES
// ============================================================================

type SearchType = 'clinical_notes' | 'diagnoses' | 'patients';

interface SemanticSearchRequest {
  query: string;
  searchType: SearchType;
  patientId?: string;
  limit?: number;
  threshold?: number;
}

interface SearchResult {
  id: string;
  sourceType: string;
  sourceId: string;
  patientId?: string;
  similarity: number;
  preview: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search clinical notes/embeddings
 */
async function searchClinicalNotes(
  queryEmbedding: number[],
  patientId: string | undefined,
  limit: number,
  threshold: number
): Promise<SearchResult[]> {
  // Convert embedding to pgvector format
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Build WHERE clause
  const whereClause = patientId ? `WHERE "patientId" = '${patientId}'` : '';

  // Perform vector similarity search
  // Uses pgvector's <-> operator (L2 distance, lower = more similar)
  // We convert to similarity score: 1 / (1 + distance)
  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    patientId: string;
    contentPreview: string;
    distance: number;
  }>>(`
    SELECT
      id,
      "sourceType",
      "sourceId",
      "patientId",
      "contentPreview",
      embedding <-> $1::vector AS distance
    FROM clinical_embeddings
    ${whereClause}
    ORDER BY embedding <-> $1::vector
    LIMIT ${limit}
  `, embeddingStr);

  // Convert distance to similarity score and filter by threshold
  return results
    .map(row => ({
      id: row.id,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      patientId: row.patientId,
      similarity: 1 / (1 + row.distance), // Convert distance to similarity
      preview: row.contentPreview || '',
      metadata: {},
    }))
    .filter(result => result.similarity >= threshold);
}

/**
 * Search similar patients
 */
async function searchSimilarPatients(
  queryEmbedding: number[],
  limit: number,
  threshold: number,
  excludePatientId?: string
): Promise<SearchResult[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Build WHERE clause
  const whereClause = excludePatientId
    ? `WHERE "patientId" != '${excludePatientId}'`
    : '';

  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    patientId: string;
    ageBand: string | null;
    gender: string | null;
    isPalliativeCare: boolean;
    medicationCount: number;
    distance: number;
  }>>(`
    SELECT
      id,
      "patientId",
      "ageBand",
      gender,
      "isPalliativeCare",
      "medicationCount",
      embedding <-> $1::vector AS distance
    FROM patient_summary_embeddings
    ${whereClause}
    ORDER BY embedding <-> $1::vector
    LIMIT ${limit}
  `, embeddingStr);

  return results
    .map(row => ({
      id: row.id,
      sourceType: 'PATIENT',
      sourceId: row.patientId,
      patientId: row.patientId,
      similarity: 1 / (1 + row.distance),
      preview: `${row.ageBand || 'Unknown age'}, ${row.gender || 'Unknown gender'}`,
      metadata: {
        ageBand: row.ageBand,
        gender: row.gender,
        isPalliativeCare: row.isPalliativeCare,
        medicationCount: row.medicationCount,
      },
    }))
    .filter(result => result.similarity >= threshold);
}

/**
 * Search similar diagnoses
 */
async function searchSimilarDiagnoses(
  queryEmbedding: number[],
  patientId: string | undefined,
  limit: number,
  threshold: number
): Promise<SearchResult[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const whereClause = patientId ? `WHERE "patientId" = '${patientId}'` : '';

  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    diagnosisId: string;
    patientId: string;
    icdCode: string | null;
    snomedCode: string | null;
    severity: string | null;
    distance: number;
  }>>(`
    SELECT
      id,
      "diagnosisId",
      "patientId",
      "icdCode",
      "snomedCode",
      severity,
      embedding <-> $1::vector AS distance
    FROM diagnosis_embeddings
    ${whereClause}
    ORDER BY embedding <-> $1::vector
    LIMIT ${limit}
  `, embeddingStr);

  return results
    .map(row => ({
      id: row.id,
      sourceType: 'DIAGNOSIS',
      sourceId: row.diagnosisId,
      patientId: row.patientId,
      similarity: 1 / (1 + row.distance),
      preview: `${row.icdCode || 'No ICD'} - ${row.severity || 'Unknown severity'}`,
      metadata: {
        icdCode: row.icdCode,
        snomedCode: row.snomedCode,
        severity: row.severity,
      },
    }))
    .filter(result => result.similarity >= threshold);
}

// ============================================================================
// API ENDPOINT
// ============================================================================

/**
 * POST /api/search/semantic
 * Semantic search using natural language queries
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const startTime = Date.now();

    try {
      const body: SemanticSearchRequest = await request.json();

      // Validate request
      if (!body.query || body.query.trim().length === 0) {
        return NextResponse.json(
          { error: 'Query is required' },
          { status: 400 }
        );
      }

      const searchType = body.searchType || 'clinical_notes';
      const limit = Math.min(body.limit || 10, 50); // Max 50 results
      const threshold = body.threshold || 0.7;

      // IDOR Protection: If patientId provided, verify access
      if (body.patientId) {
        const hasAccess = await verifyPatientAccess(context.user!.id, body.patientId);
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'You do not have permission to access this patient record' },
            { status: 403 }
          );
        }
      }

      // Generate embedding for query
      const embeddingStartTime = Date.now();
      const queryEmbedding = await generateEmbedding(body.query);
      const embeddingTime = Date.now() - embeddingStartTime;

      // Execute search based on type
      const searchStartTime = Date.now();
      let results: SearchResult[] = [];

      switch (searchType) {
        case 'clinical_notes':
          results = await searchClinicalNotes(
            queryEmbedding,
            body.patientId,
            limit,
            threshold
          );
          break;

        case 'patients':
          results = await searchSimilarPatients(
            queryEmbedding,
            limit,
            threshold,
            body.patientId
          );
          break;

        case 'diagnoses':
          results = await searchSimilarDiagnoses(
            queryEmbedding,
            body.patientId,
            limit,
            threshold
          );
          break;

        default:
          return NextResponse.json(
            { error: `Invalid search type: ${searchType}` },
            { status: 400 }
          );
      }

      const searchTime = Date.now() - searchStartTime;
      const totalTime = Date.now() - startTime;

      logger.info({
        event: 'semantic_search_executed',
        userId: context.user.id,
        searchType,
        queryLength: body.query.length,
        resultCount: results.length,
        embeddingTime,
        searchTime,
        totalTime,
      });

      // Track search event
      // @ts-ignore - userBehaviorEvent model not yet in Prisma schema
      await prisma.userBehaviorEvent.create({
        data: {
          userId: context.user.id,
          eventType: 'SEMANTIC_SEARCH',
          metadata: {
            searchType,
            queryLength: body.query.length,
            resultCount: results.length,
            threshold,
            embeddingTimeMs: embeddingTime,
            searchTimeMs: searchTime,
            totalTimeMs: totalTime,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        results,
        meta: {
          queryEmbeddingTime: embeddingTime,
          searchTime,
          totalTime,
          resultCount: results.length,
        },
      });
    } catch (error: any) {
      logger.error({
        event: 'semantic_search_error',
        userId: context.user?.id,
        error: error.message,
        stack: error.stack,
      });

      // Check for pgvector extension missing
      if (error.message?.includes('operator does not exist') || error.message?.includes('vector')) {
        return NextResponse.json(
          {
            error: 'Vector search not available',
            message: 'pgvector extension is not installed. Please run: CREATE EXTENSION IF NOT EXISTS vector;',
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to execute semantic search',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['CLINICIAN', 'ADMIN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'SemanticSearch' },
  }
);
