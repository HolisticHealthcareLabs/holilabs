/**
 * DICOMweb QIDO-RS - Single Study Query
 *
 * GET /api/dicomweb/studies/{studyInstanceUID}
 * Returns DICOM JSON metadata for a specific study
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// DICOM date format: YYYYMMDD
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

      // Find study by UID or ID
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
              mrn: true,
            },
          },
        },
      });

      if (!study) {
        return NextResponse.json(
          { error: 'Study not found' },
          { status: 404 }
        );
      }

      // Convert to DICOM JSON
      const dicomJson = {
        '0020000D': { vr: 'UI', Value: [study.studyInstanceUID || study.id] },
        '00080020': {
          vr: 'DA',
          Value: study.studyDate ? [formatDicomDate(new Date(study.studyDate))] : [],
        },
        '00080050': { vr: 'SH', Value: study.accessionNumber ? [study.accessionNumber] : [] },
        '00080061': { vr: 'CS', Value: [study.modality] },
        '00100010': {
          vr: 'PN',
          Value: study.patient
            ? [{ Alphabetic: `${study.patient.lastName}^${study.patient.firstName}` }]
            : [],
        },
        '00100020': {
          vr: 'LO',
          Value: study.patient?.mrn ? [study.patient.mrn] : [study.patientId],
        },
        '00081030': { vr: 'LO', Value: study.description ? [study.description] : [] },
        '00180015': { vr: 'CS', Value: study.bodyPart ? [study.bodyPart.toUpperCase()] : [] },
        '00201206': { vr: 'IS', Value: ['1'] },
        '00201208': { vr: 'IS', Value: [String(study.imageCount || 1)] },
      };

      return new NextResponse(JSON.stringify([dicomJson]), {
        status: 200,
        headers: {
          'Content-Type': 'application/dicom+json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error: any) {
      console.error('QIDO-RS study query error:', error);
      return NextResponse.json(
        { error: 'Failed to query study', message: error.message },
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
