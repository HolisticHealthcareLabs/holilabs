/**
 * Portal Lab Results API
 *
 * GET /api/portal/lab-results - Get patient's laboratory results
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const patientId = context.session.patientId;

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

    const transformedResults = labResults.map((result) => {
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

    await createAuditLog({
      action: 'READ',
      resource: 'LabResult',
      resourceId: patientId,
      details: {
        resultCount: transformedResults.length,
        accessType: 'PATIENT_PORTAL_SELF_ACCESS',
        categories: [...new Set(labResults.map(r => r.category).filter(Boolean))],
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      results: transformedResults,
      count: transformedResults.length,
    });
  },
  { audit: { action: 'READ', resource: 'LabResults' } }
);
