/**
 * Portal Lab Results API
 *
 * GET /api/portal/lab-results - Get patient's laboratory results
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();
    const patientId = session.patientId;

    // Fetch lab results
    const labResults = await prisma.labResult.findMany({
      where: {
        patientId,
      },
      orderBy: {
        resultDate: 'desc',
      },
      select: {
        id: true,
        testName: true,
        testCode: true,
        value: true,
        unit: true,
        referenceRange: true,
        status: true,
        resultDate: true,
        category: true,
        notes: true,
      },
    });

    // Transform results to match frontend interface
    const transformedResults = labResults.map((result) => {
      // Parse referenceRange to extract min/max
      let referenceMin = 0;
      let referenceMax = 100;
      if (result.referenceRange) {
        const match = result.referenceRange.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
        if (match) {
          referenceMin = parseFloat(match[1]);
          referenceMax = parseFloat(match[2]);
        }
      }

      return {
        id: result.id,
        testName: result.testName,
        testCode: result.testCode || 'N/A',
        value: parseFloat(result.value || '0'),
        unit: result.unit || '',
        referenceMin,
        referenceMax,
        date: result.resultDate.toISOString(),
        status: result.status as 'normal' | 'high' | 'low' | 'critical',
        doctorNotes: result.notes || undefined,
        category: result.category || 'General',
        doctor: undefined,
      };
    });

    return NextResponse.json({
      success: true,
      results: transformedResults,
      count: transformedResults.length,
    });
  } catch (error) {
    logger.error({
      event: 'portal_lab_results_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar los resultados de laboratorio.',
        results: [],
      },
      { status: 500 }
    );
  }
}
