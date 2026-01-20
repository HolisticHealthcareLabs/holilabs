/**
 * DICOMweb WADO-RS - Retrieve DICOM Objects
 *
 * Supports:
 * - GET /api/dicomweb/wado/studies/{studyInstanceUID}
 * - GET /api/dicomweb/wado/studies/{studyInstanceUID}/metadata
 * - GET /api/dicomweb/wado/studies/{studyInstanceUID}/series/{seriesInstanceUID}
 * - GET /api/dicomweb/wado/studies/{studyInstanceUID}/series/{seriesInstanceUID}/instances/{sopInstanceUID}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { downloadFromR2, generatePresignedUrl } from '@/lib/storage/r2-client';
import { parseDicomFile } from '@/lib/imaging/dicom-parser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute for large DICOM retrieval

// Extract storage key from URL
function extractStorageKey(imageUrl: string): string | null {
  try {
    // Handle full URLs or relative paths
    if (imageUrl.startsWith('http')) {
      const url = new URL(imageUrl);
      // R2 URLs typically have the key after the bucket name
      return url.pathname.replace(/^\//, '');
    }
    // Already a storage key
    return imageUrl;
  } catch {
    return imageUrl;
  }
}

// Parse WADO-RS path
function parseWadoPath(pathParts: string[]): {
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  isMetadata?: boolean;
  frames?: number[];
} {
  const result: ReturnType<typeof parseWadoPath> = {};

  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'studies' && pathParts[i + 1]) {
      result.studyInstanceUID = decodeURIComponent(pathParts[i + 1]);
      i++;
    } else if (pathParts[i] === 'series' && pathParts[i + 1]) {
      result.seriesInstanceUID = decodeURIComponent(pathParts[i + 1]);
      i++;
    } else if (pathParts[i] === 'instances' && pathParts[i + 1]) {
      result.sopInstanceUID = decodeURIComponent(pathParts[i + 1]);
      i++;
    } else if (pathParts[i] === 'metadata') {
      result.isMetadata = true;
    } else if (pathParts[i] === 'frames' && pathParts[i + 1]) {
      result.frames = pathParts[i + 1].split(',').map(Number);
      i++;
    }
  }

  return result;
}

// DICOM date format
function formatDicomDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Convert study to DICOM JSON instance metadata
function toInstanceMetadata(study: any, index: number): Record<string, any> {
  const sopInstanceUID = `${study.studyInstanceUID || study.id}.1.${index + 1}`;
  const seriesInstanceUID = `${study.studyInstanceUID || study.id}.1`;

  return {
    // SOP Class UID - Secondary Capture
    '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.7'] },
    // SOP Instance UID
    '00080018': { vr: 'UI', Value: [sopInstanceUID] },
    // Study Instance UID
    '0020000D': { vr: 'UI', Value: [study.studyInstanceUID || study.id] },
    // Series Instance UID
    '0020000E': { vr: 'UI', Value: [seriesInstanceUID] },
    // Study Date
    '00080020': {
      vr: 'DA',
      Value: study.studyDate ? [formatDicomDate(new Date(study.studyDate))] : [],
    },
    // Modality
    '00080060': { vr: 'CS', Value: [study.modality] },
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
    // Series Number
    '00200011': { vr: 'IS', Value: ['1'] },
    // Instance Number
    '00200013': { vr: 'IS', Value: [String(index + 1)] },
    // Body Part
    '00180015': { vr: 'CS', Value: study.bodyPart ? [study.bodyPart.toUpperCase()] : [] },
    // Rows (placeholder - would be extracted from actual DICOM)
    '00280010': { vr: 'US', Value: [512] },
    // Columns (placeholder)
    '00280011': { vr: 'US', Value: [512] },
  };
}

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const pathParts = (context?.params?.path as string[]) || [];
      const parsedPath = parseWadoPath(pathParts);

      if (!parsedPath.studyInstanceUID) {
        return NextResponse.json(
          { error: 'Study Instance UID is required' },
          { status: 400 }
        );
      }

      // Find study by studyInstanceUID or ID
      const study = await prisma.imagingStudy.findFirst({
        where: {
          OR: [
            { studyInstanceUID: parsedPath.studyInstanceUID },
            { id: parsedPath.studyInstanceUID },
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

      // Handle metadata requests
      if (parsedPath.isMetadata) {
        const instances = (study.imageUrls || []).map((_, idx) =>
          toInstanceMetadata(study, idx)
        );

        return new NextResponse(JSON.stringify(instances.length > 0 ? instances : [toInstanceMetadata(study, 0)]), {
          status: 200,
          headers: {
            'Content-Type': 'application/dicom+json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Handle DICOM object retrieval
      const imageUrls = study.imageUrls || [];

      if (imageUrls.length === 0) {
        return NextResponse.json(
          { error: 'No DICOM images found for this study' },
          { status: 404 }
        );
      }

      // Determine which instance to retrieve (default to first)
      const instanceIndex = parsedPath.sopInstanceUID
        ? imageUrls.findIndex((url) => url.includes(parsedPath.sopInstanceUID!))
        : 0;

      const imageUrl = imageUrls[Math.max(0, instanceIndex)];
      const storageKey = extractStorageKey(imageUrl);

      if (!storageKey) {
        return NextResponse.json(
          { error: 'Invalid image URL' },
          { status: 500 }
        );
      }

      // Check Accept header for response type
      const accept = request.headers.get('Accept') || '';

      // If client wants a presigned URL (for large files)
      if (accept.includes('application/json')) {
        const presignedUrl = await generatePresignedUrl(storageKey, 3600);
        return NextResponse.json({
          url: presignedUrl,
          contentType: 'application/dicom',
        });
      }

      // Download DICOM file from R2
      const buffer = await downloadFromR2(storageKey);

      // Return DICOM file with proper multipart content type
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/dicom',
          'Content-Disposition': `attachment; filename="${study.studyInstanceUID || study.id}.dcm"`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
      });
    } catch (error: any) {
      console.error('WADO-RS retrieval error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve DICOM object', message: error.message },
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    },
  });
}
