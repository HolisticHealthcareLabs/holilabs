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
        referenceMin: true,
        referenceMax: true,
        status: true,
        resultDate: true,
        category: true,
        notes: true,
        clinician: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
    });

    // Transform results to match frontend interface
    const transformedResults = labResults.map((result) => ({
      id: result.id,
      testName: result.testName,
      testCode: result.testCode || 'N/A',
      value: parseFloat(result.value || '0'),
      unit: result.unit || '',
      referenceMin: parseFloat(result.referenceMin || '0'),
      referenceMax: parseFloat(result.referenceMax || '100'),
      date: result.resultDate.toISOString(),
      status: result.status as 'normal' | 'high' | 'low' | 'critical',
      doctorNotes: result.notes || undefined,
      category: result.category || 'General',
      doctor: result.clinician
        ? `Dr. ${result.clinician.firstName} ${result.clinician.lastName}`
        : undefined,
    }));

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
