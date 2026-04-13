export const dynamic = "force-dynamic";
/**
 * Patient Health Metrics API
 *
 * GET /api/portal/metrics
 * Fetch health metrics for authenticated patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const patientId = context.session.patientId;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch clinical notes with vital signs
    const clinicalNotes = await prisma.clinicalNote.findMany({
      where: {
        patientId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        // @todo(vital-signs-schema): Add vitalSigns relation to ClinicalNote model
        createdAt: true,
      },
    });

    // @todo(vital-signs-schema): Query vitalSigns once schema supports it
    logger.warn({ event: 'unimplemented_feature', feature: 'vital_signs_metrics', patientId });
    const metrics: any[] = [];

    // Calculate latest values and trends
    const latestMetric = metrics[0];
    const previousMetric = metrics[1];

    const calculateTrend = (current: number | null, previous: number | null): string => {
      if (!current || !previous) return 'stable';
      if (current > previous) return 'up';
      if (current < previous) return 'down';
      return 'stable';
    };

    const summary = {
      bloodPressure: {
        systolic: latestMetric?.bloodPressureSystolic || null,
        diastolic: latestMetric?.bloodPressureDiastolic || null,
        trend: calculateTrend(
          latestMetric?.bloodPressureSystolic || null,
          previousMetric?.bloodPressureSystolic || null
        ),
        unit: 'mmHg',
      },
      heartRate: {
        value: latestMetric?.heartRate || null,
        trend: calculateTrend(
          latestMetric?.heartRate || null,
          previousMetric?.heartRate || null
        ),
        unit: 'bpm',
      },
      temperature: {
        value: latestMetric?.temperature || null,
        trend: calculateTrend(
          latestMetric?.temperature || null,
          previousMetric?.temperature || null
        ),
        unit: '°C',
      },
      respiratoryRate: {
        value: latestMetric?.respiratoryRate || null,
        trend: calculateTrend(
          latestMetric?.respiratoryRate || null,
          previousMetric?.respiratoryRate || null
        ),
        unit: 'resp/min',
      },
      oxygenSaturation: {
        value: latestMetric?.oxygenSaturation || null,
        trend: calculateTrend(
          latestMetric?.oxygenSaturation || null,
          previousMetric?.oxygenSaturation || null
        ),
        unit: '%',
      },
      weight: {
        value: latestMetric?.weight || null,
        trend: calculateTrend(
          latestMetric?.weight || null,
          previousMetric?.weight || null
        ),
        unit: 'kg',
      },
    };

    logger.info({
      event: 'patient_metrics_fetched',
      patientId,
      metricsCount: metrics.length,
      days,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          metrics,
          summary,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            days,
          },
        },
      },
      { status: 200 }
    );
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'Metrics' },
  }
);
