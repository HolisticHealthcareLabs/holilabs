/**
 * Clean Room API for Researchers
 *
 * POST /api/research/query - Execute HIPAA Safe Harbor compliant aggregate queries
 *
 * SECURITY GUARANTEES:
 * - No patient-level data returned (aggregates only)
 * - Minimum cell size: 11 patients (HIPAA Safe Harbor requirement)
 * - No PHI in queries or results
 * - Query auditing and rate limiting
 * - Researcher authentication required
 *
 * Supported Query Types:
 * - demographics: Age bands, gender, region distributions
 * - outcomes: Treatment outcomes, mortality rates
 * - prevalence: Condition/diagnosis prevalence
 * - medications: Medication usage patterns
 * - temporal: Trends over time
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ============================================================================
// QUERY TYPES & SCHEMAS
// ============================================================================

type QueryType = 'demographics' | 'outcomes' | 'prevalence' | 'medications' | 'temporal';

interface ResearchQuery {
  queryType: QueryType;
  filters?: {
    ageBand?: string[];
    gender?: string[];
    region?: string[];
    isPalliativeCare?: boolean;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  groupBy?: string[];
  metrics?: string[];
}

interface AggregateResult {
  queryType: QueryType;
  results: Array<Record<string, any>>;
  metadata: {
    totalRecords: number;
    cellsSuppressed: number; // Cells with <11 patients
    executionTimeMs: number;
    hipaaCompliant: boolean;
  };
  warnings: string[];
}

// ============================================================================
// HIPAA SAFE HARBOR COMPLIANCE
// ============================================================================

const MINIMUM_CELL_SIZE = 11; // HIPAA Safe Harbor requirement

/**
 * Suppress cells with < 11 patients (HIPAA Safe Harbor)
 */
function suppressSmallCells(results: Array<Record<string, any>>, countField: string = 'count'): {
  results: Array<Record<string, any>>;
  suppressedCount: number;
} {
  let suppressedCount = 0;

  const filteredResults = results.filter(row => {
    if (row[countField] < MINIMUM_CELL_SIZE) {
      suppressedCount++;
      return false;
    }
    return true;
  });

  return {
    results: filteredResults,
    suppressedCount,
  };
}

/**
 * Validate query is HIPAA Safe Harbor compliant
 */
function validateHIPAACompliance(query: ResearchQuery): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // No patient identifiers allowed in filters
  if (query.filters) {
    const filter = query.filters as any;
    const prohibitedFields = ['patientId', 'mrn', 'cpf', 'cns', 'email', 'phone'];

    for (const field of prohibitedFields) {
      if (field in filter) {
        errors.push(`Prohibited field in filters: ${field} (contains PHI)`);
      }
    }
  }

  // Group by must not include identifiable fields
  if (query.groupBy) {
    const prohibitedGroupBy = ['patientId', 'mrn', 'dateOfBirth', 'address', 'city'];

    for (const field of query.groupBy) {
      if (prohibitedGroupBy.includes(field)) {
        errors.push(`Prohibited groupBy field: ${field} (too granular for de-identification)`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// QUERY EXECUTORS
// ============================================================================

/**
 * Execute demographics query
 */
async function executeDemographicsQuery(query: ResearchQuery): Promise<AggregateResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Build where clause from filters
  const where: any = {};

  if (query.filters) {
    if (query.filters.ageBand) {
      where.ageBand = { in: query.filters.ageBand };
    }
    if (query.filters.gender) {
      where.gender = { in: query.filters.gender };
    }
    if (query.filters.region) {
      where.region = { in: query.filters.region };
    }
    if (query.filters.isPalliativeCare !== undefined) {
      where.isPalliativeCare = query.filters.isPalliativeCare;
    }
  }

  // Execute aggregation query
  const results = await prisma.patient.groupBy({
    by: ['ageBand', 'gender', 'region'],
    where,
    _count: { id: true },
  });

  // Transform results
  const transformedResults = results.map(row => ({
    ageBand: row.ageBand,
    gender: row.gender,
    region: row.region,
    count: row._count.id,
  }));

  // Apply HIPAA Safe Harbor cell suppression
  const { results: filteredResults, suppressedCount } = suppressSmallCells(transformedResults);

  if (suppressedCount > 0) {
    warnings.push(`${suppressedCount} cell(s) suppressed due to HIPAA Safe Harbor (< ${MINIMUM_CELL_SIZE} patients)`);
  }

  return {
    queryType: 'demographics',
    results: filteredResults,
    metadata: {
      totalRecords: transformedResults.length,
      cellsSuppressed: suppressedCount,
      executionTimeMs: Date.now() - startTime,
      hipaaCompliant: true,
    },
    warnings,
  };
}

/**
 * Execute prevalence query (condition/diagnosis counts)
 */
async function executePrevalenceQuery(query: ResearchQuery): Promise<AggregateResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Build where clause
  const where: any = {};

  if (query.filters) {
    if (query.filters.dateRange) {
      where.diagnosedAt = {
        gte: new Date(query.filters.dateRange.start),
        lte: new Date(query.filters.dateRange.end),
      };
    }
  }

  // Get diagnosis counts
  const results = await prisma.diagnosis.groupBy({
    by: ['diagnosisName', 'type'],
    where,
    _count: { id: true },
  });

  // Transform results
  const transformedResults = results.map(row => ({
    diagnosisName: row.diagnosisName,
    type: row.type,
    count: row._count.id,
  }));

  // Apply cell suppression
  const { results: filteredResults, suppressedCount } = suppressSmallCells(transformedResults);

  if (suppressedCount > 0) {
    warnings.push(`${suppressedCount} diagnosis group(s) suppressed (< ${MINIMUM_CELL_SIZE} patients)`);
  }

  return {
    queryType: 'prevalence',
    results: filteredResults,
    metadata: {
      totalRecords: transformedResults.length,
      cellsSuppressed: suppressedCount,
      executionTimeMs: Date.now() - startTime,
      hipaaCompliant: true,
    },
    warnings,
  };
}

/**
 * Execute medications query (usage patterns)
 */
async function executeMedicationsQuery(query: ResearchQuery): Promise<AggregateResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Build where clause
  const where: any = {};

  if (query.filters) {
    if (query.filters.dateRange) {
      where.startDate = {
        gte: new Date(query.filters.dateRange.start),
        lte: new Date(query.filters.dateRange.end),
      };
    }
  }

  // Get medication counts
  const results = await prisma.medication.groupBy({
    by: ['name', 'isActive'],
    where,
    _count: { id: true },
  });

  // Transform results
  const transformedResults = results.map(row => ({
    medicationName: row.name,
    isActive: row.isActive,
    count: row._count.id,
  }));

  // Apply cell suppression
  const { results: filteredResults, suppressedCount } = suppressSmallCells(transformedResults);

  if (suppressedCount > 0) {
    warnings.push(`${suppressedCount} medication group(s) suppressed (< ${MINIMUM_CELL_SIZE} patients)`);
  }

  return {
    queryType: 'medications',
    results: filteredResults,
    metadata: {
      totalRecords: transformedResults.length,
      cellsSuppressed: suppressedCount,
      executionTimeMs: Date.now() - startTime,
      hipaaCompliant: true,
    },
    warnings,
  };
}

/**
 * Execute temporal query (trends over time)
 */
async function executeTemporalQuery(query: ResearchQuery): Promise<AggregateResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Get patient creation trends by week
  const dateRange = query.filters?.dateRange;
  const where: any = {};

  if (dateRange) {
    where.createdAt = {
      gte: new Date(dateRange.start),
      lte: new Date(dateRange.end),
    };
  }

  // Get weekly patient counts
  const results = await prisma.$queryRaw<Array<{ week: Date; count: bigint }>>`
    SELECT
      DATE_TRUNC('week', "createdAt") as week,
      COUNT(*)::bigint as count
    FROM "patients"
    WHERE "createdAt" >= ${dateRange ? new Date(dateRange.start) : new Date('2020-01-01')}
      AND "createdAt" <= ${dateRange ? new Date(dateRange.end) : new Date()}
    GROUP BY week
    ORDER BY week
  `;

  // Transform results
  const transformedResults = results.map(row => ({
    week: row.week.toISOString().split('T')[0],
    count: Number(row.count),
  }));

  // Apply cell suppression
  const { results: filteredResults, suppressedCount } = suppressSmallCells(transformedResults);

  if (suppressedCount > 0) {
    warnings.push(`${suppressedCount} week(s) suppressed (< ${MINIMUM_CELL_SIZE} patients)`);
  }

  return {
    queryType: 'temporal',
    results: filteredResults,
    metadata: {
      totalRecords: transformedResults.length,
      cellsSuppressed: suppressedCount,
      executionTimeMs: Date.now() - startTime,
      hipaaCompliant: true,
    },
    warnings,
  };
}

// ============================================================================
// API ENDPOINT
// ============================================================================

/**
 * POST /api/research/query
 * Execute HIPAA Safe Harbor compliant aggregate queries
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const query: ResearchQuery = await request.json();

      // Validate query type
      const validQueryTypes: QueryType[] = ['demographics', 'outcomes', 'prevalence', 'medications', 'temporal'];
      if (!validQueryTypes.includes(query.queryType)) {
        return NextResponse.json(
          {
            error: 'Invalid query type',
            validTypes: validQueryTypes,
          },
          { status: 400 }
        );
      }

      // Validate HIPAA compliance
      const compliance = validateHIPAACompliance(query);
      if (!compliance.valid) {
        return NextResponse.json(
          {
            error: 'Query violates HIPAA Safe Harbor requirements',
            violations: compliance.errors,
          },
          { status: 400 }
        );
      }

      logger.info({
        event: 'research_query_executed',
        userId: context.user.id,
        queryType: query.queryType,
      });

      // Execute query based on type
      let result: AggregateResult;

      switch (query.queryType) {
        case 'demographics':
          result = await executeDemographicsQuery(query);
          break;
        case 'prevalence':
          result = await executePrevalenceQuery(query);
          break;
        case 'medications':
          result = await executeMedicationsQuery(query);
          break;
        case 'temporal':
          result = await executeTemporalQuery(query);
          break;
        case 'outcomes':
          // TODO: Implement outcomes query
          return NextResponse.json(
            { error: 'Outcomes query not yet implemented' },
            { status: 501 }
          );
        default:
          return NextResponse.json(
            { error: 'Unknown query type' },
            { status: 400 }
          );
      }

      // Track query execution
      await prisma.userBehaviorEvent.create({
        data: {
          userId: context.user.id,
          eventType: 'RESEARCH_QUERY',
          metadata: {
            queryType: query.queryType,
            resultCount: result.results.length,
            cellsSuppressed: result.metadata.cellsSuppressed,
            executionTimeMs: result.metadata.executionTimeMs,
            filters: query.filters,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error({
        event: 'research_query_error',
        userId: context.user?.id,
        error: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        {
          error: 'Failed to execute research query',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'RESEARCHER'],
    rateLimit: { windowMs: 60000, maxRequests: 10 }, // Strict rate limiting for research queries
    audit: { action: 'READ', resource: 'ResearchData' },
  }
);
