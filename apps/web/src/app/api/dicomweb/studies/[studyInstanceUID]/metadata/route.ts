/**
 * DICOMweb WADO-RS - Study Metadata
 *
 * GET /api/dicomweb/studies/{studyInstanceUID}/metadata
 * Returns DICOM JSON metadata for all instances in a study
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

function generateInstanceMetadata(study: any, instanceIndex: number): Record<string, any> {
  const studyUID = study.studyInstanceUID || study.id;
  const seriesUID = `${studyUID}.1`;
  const sopInstanceUID = `${studyUID}.1.${instanceIndex + 1}`;

  return {
    // SOP Class UID - Secondary Capture Image Storage
    '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.7'] },
    // SOP Instance UID
    '00080018': { vr: 'UI', Value: [sopInstanceUID] },
    // Study Instance UID
    '0020000D': { vr: 'UI', Value: [studyUID] },
    // Series Instance UID
    '0020000E': { vr: 'UI', Value: [seriesUID] },
    // Study Date
    '00080020': {
      vr: 'DA',
      Value: study.studyDate ? [formatDicomDate(new Date(study.studyDate))] : [],
    },
    // Series Date
    '00080021': {
      vr: 'DA',
      Value: study.studyDate ? [formatDicomDate(new Date(study.studyDate))] : [],
    },
    // Modality
    '00080060': { vr: 'CS', Value: [study.modality] },
    // Manufacturer
    '00080070': { vr: 'LO', Value: ['Holi Labs'] },
    // Patient Name
    '00100010': {
      vr: 'PN',
      Value: study.patient
        ? [{ Alphabetic: `${study.patient.lastName}^${study.patient.firstName}` }]
        : [],
    },
    // Patient ID
    '00100020': {
      vr: 'LO',
      Value: study.patient?.mrn ? [study.patient.mrn] : [study.patientId],
    },
    // Study Description
    '00081030': { vr: 'LO', Value: study.description ? [study.description] : [] },
    // Series Description
    '0008103E': { vr: 'LO', Value: study.description ? [study.description] : [] },
    // Body Part
    '00180015': { vr: 'CS', Value: study.bodyPart ? [study.bodyPart.toUpperCase()] : [] },
    // Series Number
    '00200011': { vr: 'IS', Value: ['1'] },
    // Instance Number
    '00200013': { vr: 'IS', Value: [String(instanceIndex + 1)] },
    // Rows
    '00280010': { vr: 'US', Value: [512] },
    // Columns
    '00280011': { vr: 'US', Value: [512] },
    // Bits Allocated
    '00280100': { vr: 'US', Value: [16] },
    // Bits Stored
    '00280101': { vr: 'US', Value: [12] },
    // High Bit
    '00280102': { vr: 'US', Value: [11] },
    // Pixel Representation
    '00280103': { vr: 'US', Value: [0] },
    // Photometric Interpretation
    '00280004': { vr: 'CS', Value: ['MONOCHROME2'] },
    // Samples Per Pixel
    '00280002': { vr: 'US', Value: [1] },
  };
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
              mrn: true,
            },
          },
        },
      });

      if (!study) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
      }

      // Generate metadata for each instance
      const imageCount = Math.max(study.imageCount || 1, (study.imageUrls || []).length, 1);
      const instances = Array.from({ length: imageCount }, (_, i) =>
        generateInstanceMetadata(study, i)
      );

      return new NextResponse(JSON.stringify(instances), {
        status: 200,
        headers: {
          'Content-Type': 'application/dicom+json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error: any) {
      console.error('WADO-RS metadata error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve metadata', message: error.message },
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
