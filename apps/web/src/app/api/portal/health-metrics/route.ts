/**
 * Health Metrics API
 *
 * GET /api/portal/health-metrics - Fetch patient's health metrics
 * POST /api/portal/health-metrics - Add a new health metric
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
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

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

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
      patientId: session.patientId,
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
      patientId: session.patientId,
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
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'patient_health_metrics_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar métricas de salud.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse and validate request body
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
        patientId: session.patientId,
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
        userId: session.userId,
        userEmail: session.email,
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
      patientId: session.patientId,
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
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'health_metric_add_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al registrar métrica de salud.',
      },
      { status: 500 }
    );
  }
}
