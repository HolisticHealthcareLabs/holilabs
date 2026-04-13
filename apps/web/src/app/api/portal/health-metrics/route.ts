export const dynamic = "force-dynamic";
/**
 * Health Metrics API
 *
 * GET /api/portal/health-metrics - Fetch patient's health metrics
 * POST /api/portal/health-metrics - Add a new health metric
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

// Query parameters schema
const MetricsQuerySchema = z.object({
  metricType: z.enum(['WEIGHT', 'BLOOD_PRESSURE', 'GLUCOSE', 'TEMPERATURE', 'HEART_RATE', 'OXYGEN_SATURATION', 'OTHER']).optional(),
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(), // ISO date
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

// Create metric schema
const CreateMetricSchema = z.object({
  metricType: z.enum(['WEIGHT', 'BLOOD_PRESSURE', 'GLUCOSE', 'TEMPERATURE', 'HEART_RATE', 'OXYGEN_SATURATION', 'OTHER']),
  value: z.number(),
  unit: z.string(),
  notes: z.string().optional(),
  recordedAt: z.string().optional(), // ISO date
  // For blood pressure
  systolic: z.number().optional(),
  diastolic: z.number().optional(),
});

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const patientId = context.session.patientId;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = MetricsQuerySchema.safeParse({
      metricType: searchParams.get('metricType'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const { metricType, startDate, endDate, limit } = queryValidation.data;

    // Build filter conditions
    const where: any = {
      patientId,
    };

    if (metricType) {
      where.metricType = metricType;
    }

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) {
        where.recordedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.recordedAt.lte = new Date(endDate);
      }
    }

    // Fetch metrics
    const metrics = await prisma.healthMetric.findMany({
      where,
      orderBy: {
        recordedAt: 'desc',
      },
      take: limit,
    });

    // Group by metric type
    const metricsByType = metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.metricType]) {
          acc[metric.metricType] = [];
        }
        acc[metric.metricType].push(metric);
        return acc;
      },
      {} as Record<string, typeof metrics>
    );

    // Calculate latest values for each type
    const latestMetrics: Record<string, any> = {};
    Object.keys(metricsByType).forEach((type) => {
      latestMetrics[type] = metricsByType[type][0]; // First item is most recent
    });

    logger.info({
      event: 'patient_health_metrics_fetched',
      patientId,
      count: metrics.length,
      types: Object.keys(metricsByType),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          metrics,
          metricsByType,
          latestMetrics,
          summary: {
            total: metrics.length,
            types: Object.keys(metricsByType).length,
          },
        },
      },
      { status: 200 }
    );
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'HealthMetrics' },
  }
);

export const POST = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const body = await request.json();
    const validation = CreateMetricSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { metricType, value, unit, notes, recordedAt, systolic, diastolic } = validation.data;

    // For blood pressure, use systolic/diastolic if provided
    const finalValue = metricType === 'BLOOD_PRESSURE' && systolic
      ? systolic
      : value;

    // Create health metric
    const metric = await prisma.healthMetric.create({
      data: {
        patientId: context.session.patientId,
        metricType,
        value: finalValue,
        unit,
        notes,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        // Store additional BP data in notes if needed
        ...(metricType === 'BLOOD_PRESSURE' && systolic && diastolic
          ? { notes: `${systolic}/${diastolic} ${unit}${notes ? ' - ' + notes : ''}` }
          : {}),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        userEmail: context.session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'HealthMetric',
        resourceId: metric.id,
        success: true,
        details: {
          metricType,
          value: finalValue,
          unit,
        },
      },
    });

    logger.info({
      event: 'health_metric_added',
      patientId: context.session.patientId,
      metricId: metric.id,
      metricType,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Métrica de salud registrada correctamente.',
        data: metric,
      },
      { status: 201 }
    );
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'HealthMetrics' },
  }
);
