/**
 * DICOMweb QIDO-RS - Series Query
 *
 * GET /api/dicomweb/studies/{studyInstanceUID}/series
 * Returns DICOM JSON metadata for series in a study
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function formatDicomDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const studyInstanceUID = context?.params?.studyInstanceUID as string;

      const study = await prisma.imagingStudy.findFirst({
        where: {
          OR: [
            { studyInstanceUID },
            { id: studyInstanceUID },
          ],
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!study) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
      }

      // Generate series UID (simplified: 1 series per study)
      const seriesInstanceUID = `${study.studyInstanceUID || study.id}.1`;

      const seriesJson = {
        // Series Instance UID (0020,000E)
        '0020000E': { vr: 'UI', Value: [seriesInstanceUID] },
        // Modality (0008,0060)
        '00080060': { vr: 'CS', Value: [study.modality] },
        // Series Number (0020,0011)
        '00200011': { vr: 'IS', Value: ['1'] },
        // Series Date (0008,0021)
        '00080021': {
          vr: 'DA',
          Value: study.studyDate ? [formatDicomDate(new Date(study.studyDate))] : [],
        },
        // Series Description (0008,103E)
        '0008103E': { vr: 'LO', Value: study.description ? [study.description] : [] },
        // Body Part Examined (0018,0015)
        '00180015': { vr: 'CS', Value: study.bodyPart ? [study.bodyPart.toUpperCase()] : [] },
        // Number of Series Related Instances (0020,1209)
        '00201209': { vr: 'IS', Value: [String(study.imageCount || 1)] },
      };

      return new NextResponse(JSON.stringify([seriesJson]), {
        status: 200,
        headers: {
          'Content-Type': 'application/dicom+json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error: any) {
      console.error('QIDO-RS series query error:', error);
      return NextResponse.json(
        { error: 'Failed to query series', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    audit: { action: 'READ', resource: 'ImagingStudy' },
  }
);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
