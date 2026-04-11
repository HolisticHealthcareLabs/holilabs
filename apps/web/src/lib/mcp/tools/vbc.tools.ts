/**
 * VBC MCP Tools — Agent-callable value-based care operations
 *
 * Tools: get_quality_measures, evaluate_quality_measure, get_measure_gaps, get_population_dashboard
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

const GetMeasuresSchema = z.object({
  category: z.enum(['PROCESS', 'OUTCOME', 'PATIENT_REPORTED', 'COST', 'EFFICIENCY']).optional(),
  jurisdiction: z.string().default('BR'),
  isActive: z.boolean().default(true),
});

const EvaluateMeasureSchema = z.object({
  measureCode: z.string().describe('Quality measure code'),
  organizationId: z.string().describe('Organization ID to evaluate for'),
  periodStart: z.string().describe('Period start date ISO-8601'),
  periodEnd: z.string().describe('Period end date ISO-8601'),
});

const GetGapsSchema = z.object({
  measureCode: z.string().describe('Quality measure code'),
  organizationId: z.string().describe('Organization ID'),
});

const GetDashboardSchema = z.object({
  organizationId: z.string().describe('Organization ID'),
  periodStart: z.string().optional().describe('Period start date ISO-8601'),
  periodEnd: z.string().optional().describe('Period end date ISO-8601'),
});

async function getMeasuresHandler(input: z.infer<typeof GetMeasuresSchema>, context: MCPContext): Promise<MCPResult> {
  const measures = await prisma.qualityMeasure.findMany({
    where: {
      ...(input.category ? { category: input.category } : {}),
      jurisdiction: input.jurisdiction,
      isActive: input.isActive,
    },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      targetRate: true,
      sourceAuthority: true,
      period: true,
    },
    orderBy: { code: 'asc' },
  });

  return {
    success: true,
    data: { measures, count: measures.length },
  };
}

async function evaluateMeasureHandler(input: z.infer<typeof EvaluateMeasureSchema>, context: MCPContext): Promise<MCPResult> {
  const measure = await prisma.qualityMeasure.findUnique({
    where: { code: input.measureCode },
  });

  if (!measure) {
    return {
      success: false,
      data: null,
      error: `Quality measure "${input.measureCode}" not found`,
    };
  }

  const latestResult = await prisma.qualityMeasureResult.findFirst({
    where: {
      measureId: measure.id,
      organizationId: input.organizationId,
    },
    orderBy: { calculatedAt: 'desc' },
  });

  return {
    success: true,
    data: {
      measureCode: measure.code,
      measureName: measure.name,
      targetRate: measure.targetRate,
      latestResult: latestResult ? {
        rate: latestResult.rate,
        numerator: latestResult.numerator,
        denominator: latestResult.denominator,
        meetsTarget: latestResult.meetsTarget,
        gapCount: latestResult.gapPatientIds.length,
        calculatedAt: latestResult.calculatedAt,
      } : null,
    },
  };
}

async function getGapsHandler(input: z.infer<typeof GetGapsSchema>, context: MCPContext): Promise<MCPResult> {
  const measure = await prisma.qualityMeasure.findUnique({
    where: { code: input.measureCode },
  });

  if (!measure) {
    return { success: false, data: null, error: `Measure "${input.measureCode}" not found` };
  }

  const latestResult = await prisma.qualityMeasureResult.findFirst({
    where: { measureId: measure.id, organizationId: input.organizationId },
    orderBy: { calculatedAt: 'desc' },
  });

  if (!latestResult) {
    return { success: true, data: { gapPatientIds: [], gapCount: 0 } };
  }

  return {
    success: true,
    data: {
      measureCode: measure.code,
      gapPatientIds: latestResult.gapPatientIds,
      gapCount: latestResult.gapPatientIds.length,
      rate: latestResult.rate,
      targetRate: measure.targetRate,
    },
  };
}

async function getDashboardHandler(input: z.infer<typeof GetDashboardSchema>, context: MCPContext): Promise<MCPResult> {
  try {
    const { getPopulationDashboard } = require('@/lib/vbc/population-health.service');
    const now = new Date();
    const periodStart = input.periodStart ? new Date(input.periodStart) : new Date(now.getFullYear(), 0, 1);
    const periodEnd = input.periodEnd ? new Date(input.periodEnd) : now;

    const dashboard = await getPopulationDashboard(
      prisma,
      input.organizationId,
      periodStart,
      periodEnd,
    );

    return {
      success: true,
      data: dashboard,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `Dashboard error: ${(err as Error).message}`,
    };
  }
}

export const vbcTools: MCPTool[] = [
  {
    name: 'get_quality_measures',
    description: 'List available quality measures with optional category and jurisdiction filters',
    category: 'vbc',
    inputSchema: GetMeasuresSchema,
    requiredPermissions: ['vbc:read'],
    handler: getMeasuresHandler,
  },
  {
    name: 'evaluate_quality_measure',
    description: 'Get the latest evaluation result for a quality measure at an organization',
    category: 'vbc',
    inputSchema: EvaluateMeasureSchema,
    requiredPermissions: ['vbc:read'],
    handler: evaluateMeasureHandler,
  },
  {
    name: 'get_measure_gaps',
    description: 'Get patient gap list for a quality measure — patients not meeting the measure',
    category: 'vbc',
    inputSchema: GetGapsSchema,
    requiredPermissions: ['vbc:read'],
    handler: getGapsHandler,
  },
  {
    name: 'get_population_dashboard',
    description: 'Get comprehensive population health dashboard including risk distribution, quality summary, and outcomes',
    category: 'vbc',
    inputSchema: GetDashboardSchema,
    requiredPermissions: ['vbc:read'],
    handler: getDashboardHandler,
  },
];
