/**
 * DICOM Upload API
 * Automatic metadata extraction from DICOM medical imaging files
 *
 * POST /api/imaging/upload-dicom
 * Uploads DICOM file, extracts metadata, creates imaging study
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';
import {
  parseDicomFile,
  isDicomFile,
  generateStudyDescription,
  sanitizeDicomMetadata,
  normalizeBodyPart,
} from '@/lib/imaging/dicom-parser';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large DICOM uploads

/**
 * POST /api/imaging/upload-dicom
 * Upload DICOM file with automatic metadata extraction
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const patientId = formData.get('patientId') as string | null;
      const indication = formData.get('indication') as string | null; // Why study was ordered

      // Validate required fields
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      if (!patientId) {
        return NextResponse.json(
          { error: 'patientId is required' },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Validate it's a DICOM file
      if (!isDicomFile(buffer)) {
        return NextResponse.json(
          {
            error: 'Invalid DICOM file',
            message: 'The uploaded file does not appear to be a valid DICOM file. DICOM files must start with the "DICM" marker.',
          },
          { status: 400 }
        );
      }

      // Parse DICOM metadata
      let dicomMetadata;
      try {
        dicomMetadata = await parseDicomFile(buffer);
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Failed to parse DICOM file',
            message: error instanceof Error ? error.message : 'Unknown parsing error',
          },
          { status: 400 }
        );
      }

      // Sanitize metadata to remove PHI (HIPAA compliance)
      const sanitizedMetadata = sanitizeDicomMetadata(dicomMetadata);

      // Upload DICOM file to R2 storage
      const uploadResult = await uploadFile({
        file: buffer,
        filename: file.name,
        contentType: 'application/dicom',
        folder: 'imaging/dicom',
        metadata: {
          studyInstanceUID: dicomMetadata.study.studyInstanceUID,
          modality: dicomMetadata.series.modality,
          patientId,
        },
      });

      // Generate description from metadata
      const autoDescription = generateStudyDescription(dicomMetadata);

      // Extract date from DICOM (format: YYYYMMDD)
      let studyDate = new Date();
      if (dicomMetadata.study.studyDate) {
        const dateStr = dicomMetadata.study.studyDate;
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
        const day = parseInt(dateStr.substring(6, 8));
        studyDate = new Date(year, month, day);
      }

      // Calculate hash for blockchain integrity
      const studyData = JSON.stringify({
        patientId,
        studyInstanceUID: dicomMetadata.study.studyInstanceUID,
        modality: dicomMetadata.series.modality,
        bodyPart: dicomMetadata.series.bodyPartExamined,
        studyDate: studyDate.toISOString(),
      });
      const studyHash = crypto.createHash('sha256').update(studyData).digest('hex');

      // Create imaging study record
      const imagingStudy = await prisma.imagingStudy.create({
        data: {
          // Patient
          patientId,

          // Blockchain
          studyHash,

          // Study identification (from DICOM)
          studyInstanceUID: dicomMetadata.study.studyInstanceUID,
          accessionNumber: dicomMetadata.study.accessionNumber || null,

          // Study details (from DICOM)
          modality: dicomMetadata.series.modality,
          bodyPart: normalizeBodyPart(dicomMetadata.series.bodyPartExamined),
          description: dicomMetadata.study.studyDescription || autoDescription,
          indication: indication || null,

          // Status
          status: 'COMPLETED', // DICOM upload means study is already done

          // Images
          imageCount: 1, // Single DICOM file (may contain multiple frames)
          imageUrls: [uploadResult.url],
          thumbnailUrl: null, // TODO: Generate thumbnail from DICOM

          // Dates
          studyDate,
          scheduledDate: null,
          reportDate: null,

          // Findings (empty - to be filled by radiologist)
          findings: null,
          impression: null,
          isAbnormal: false,

          // Additional info (from DICOM if available)
          technician: null,
          radiologist: null,
          notes: null,

          // Ordering (from DICOM if available)
          orderingDoctor: null,
          referringDoctor: null,
          performingFacility: dicomMetadata.equipment?.institutionName || null,
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

      return NextResponse.json({
        success: true,
        data: imagingStudy,
        message: 'DICOM file uploaded and metadata extracted successfully',
        metadata: {
          modality: dicomMetadata.series.modality,
          bodyPart: normalizeBodyPart(dicomMetadata.series.bodyPartExamined),
          studyDate: studyDate.toISOString(),
          seriesDescription: dicomMetadata.series.seriesDescription,
        },
      });
    } catch (error: any) {
      console.error('Error uploading DICOM file:', error);
      return NextResponse.json(
        {
          error: 'Failed to upload DICOM file',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 10 }, // 10 DICOM uploads per minute
    audit: { action: 'CREATE', resource: 'ImagingStudy' },
  }
);
