/**
 * DICOMweb QIDO-RS - Query for Studies
 *
 * GET /api/dicomweb/studies
 * Returns DICOM JSON metadata for studies
 *
 * Supports query parameters:
 * - PatientID: Filter by patient ID
 * - StudyInstanceUID: Filter by study UID
 * - StudyDate: Filter by study date
 * - ModalitiesInStudy: Filter by modality
 * - limit: Maximum number of results
 * - offset: Pagination offset
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

// DICOM time format: HHMMSS
function formatDicomTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

// Convert ImagingStudy to DICOM JSON format
function toDicomJson(study: any): Record<string, any> {
  return {
    // Study Instance UID (0020,000D)
    '0020000D': {
      vr: 'UI',
      Value: [study.studyInstanceUID || study.id],
    },
    // Study Date (0008,0020)
    '00080020': {
      vr: 'DA',
      Value: study.studyDate ? [formatDicomDate(new Date(study.studyDate))] : [],
    },
    // Study Time (0008,0030)
    '00080030': {
      vr: 'TM',
      Value: study.studyDate ? [formatDicomTime(new Date(study.studyDate))] : [],
    },
    // Accession Number (0008,0050)
    '00080050': {
      vr: 'SH',
      Value: study.accessionNumber ? [study.accessionNumber] : [],
    },
    // Modalities in Study (0008,0061)
    '00080061': {
      vr: 'CS',
      Value: [study.modality],
    },
    // Referring Physician's Name (0008,0090)
    '00080090': {
      vr: 'PN',
      Value: study.referringDoctor ? [{ Alphabetic: study.referringDoctor }] : [],
    },
    // Patient's Name (0010,0010)
    '00100010': {
      vr: 'PN',
      Value: study.patient
        ? [{ Alphabetic: `${study.patient.lastName}^${study.patient.firstName}` }]
        : [],
    },
    // Patient ID (0010,0020)
    '00100020': {
      vr: 'LO',
      Value: study.patient?.mrn ? [study.patient.mrn] : [study.patientId],
    },
    // Study Description (0008,1030)
    '00081030': {
      vr: 'LO',
      Value: study.description ? [study.description] : [],
    },
    // Body Part Examined (0018,0015)
    '00180015': {
      vr: 'CS',
      Value: study.bodyPart ? [study.bodyPart.toUpperCase()] : [],
    },
    // Number of Study Related Series (0020,1206)
    '00201206': {
      vr: 'IS',
      Value: ['1'], // Simplified: 1 series per study
    },
    // Number of Study Related Instances (0020,1208)
    '00201208': {
      vr: 'IS',
      Value: [String(study.imageCount || 1)],
    },
  };
}

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);

      // QIDO-RS query parameters
      const patientId = searchParams.get('PatientID') || searchParams.get('patientId');
      const studyInstanceUID = searchParams.get('StudyInstanceUID') || searchParams.get('studyInstanceUID');
      const studyDate = searchParams.get('StudyDate');
      const modality = searchParams.get('ModalitiesInStudy') || searchParams.get('modality');
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      // Build Prisma where clause
      const where: any = {
        status: 'COMPLETED', // Only return completed studies with images
      };

      if (patientId) {
        where.patientId = patientId;
      }

      if (studyInstanceUID) {
        where.studyInstanceUID = studyInstanceUID;
      }

      if (modality) {
        where.modality = modality;
      }

      if (studyDate) {
        // Parse DICOM date format (YYYYMMDD or YYYYMMDD-YYYYMMDD for range)
        if (studyDate.includes('-')) {
          const [start, end] = studyDate.split('-');
          where.studyDate = {
            gte: new Date(
              parseInt(start.substring(0, 4)),
              parseInt(start.substring(4, 6)) - 1,
              parseInt(start.substring(6, 8))
            ),
            lte: new Date(
              parseInt(end.substring(0, 4)),
              parseInt(end.substring(4, 6)) - 1,
              parseInt(end.substring(6, 8))
            ),
          };
        } else if (studyDate.length === 8) {
          const dateStart = new Date(
            parseInt(studyDate.substring(0, 4)),
            parseInt(studyDate.substring(4, 6)) - 1,
            parseInt(studyDate.substring(6, 8))
          );
          const dateEnd = new Date(dateStart);
          dateEnd.setDate(dateEnd.getDate() + 1);
          where.studyDate = {
            gte: dateStart,
            lt: dateEnd,
          };
        }
      }

      // Query studies
      const studies = await prisma.imagingStudy.findMany({
        where,
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
        orderBy: { studyDate: 'desc' },
        take: limit,
        skip: offset,
      });

      // Convert to DICOM JSON format
      const dicomJsonResponse = studies.map(toDicomJson);

      // Return with proper DICOMweb headers
      return new NextResponse(JSON.stringify(dicomJsonResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/dicom+json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (error: any) {
      console.error('QIDO-RS studies query error:', error);
      return NextResponse.json(
        { error: 'Failed to query studies', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    audit: { action: 'READ', resource: 'ImagingStudy' },
  }
);

// Handle CORS preflight
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
