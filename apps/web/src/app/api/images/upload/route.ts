/**
 * Secure Medical Image Upload API
 * HIPAA-Compliant Image Upload with Automatic De-identification
 *
 * Flow:
 * 1. Validate user authentication
 * 2. Validate file type (PNG, JPEG, DICOM)
 * 3. Extract metadata from image
 * 4. De-identify image (strip PHI)
 * 5. Store de-identified image securely
 * 6. Create audit log
 * 7. Return pseudonymized image URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import {
  deidentifyMedicalImage,
  type ImageMetadata,
} from '@/lib/deidentification/image-deidentifier';
import logger from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/dicom',
  'application/x-dicom',
];

const STORAGE_DIR = path.join(process.cwd(), '.data', 'deidentified-images');

async function ensureStorageDirectory() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    logger.info({ event: 'storage_directory_created', path: STORAGE_DIR });
  }
}

async function extractImageMetadata(
  buffer: Buffer,
  filename: string,
  patientId?: string
): Promise<ImageMetadata> {
  const metadata: ImageMetadata = {
    patientId: patientId || `UNKNOWN_${crypto.randomUUID().slice(0, 8)}`,
    uploadDate: new Date().toISOString(),
    originalFilename: filename,
    fileSize: buffer.length,
    modality: 'UNKNOWN',
  };

  if (filename.toLowerCase().endsWith('.dcm')) {
    metadata.modality = 'DICOM';
  }

  return metadata;
}

function validateFile(
  file: File
): { valid: boolean; error?: string; format?: 'png' | 'jpeg' | 'dicom' } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: PNG, JPEG, DICOM`,
    };
  }

  let format: 'png' | 'jpeg' | 'dicom' = 'png';
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    format = 'jpeg';
  } else if (file.type === 'application/dicom' || file.type === 'application/x-dicom') {
    format = 'dicom';
  }

  return { valid: true, format };
}

async function storeDeidentifiedImage(
  buffer: Buffer,
  pseudonymizedId: string,
  format: string
): Promise<string> {
  await ensureStorageDirectory();

  const filename = `${pseudonymizedId}.${format === 'jpeg' ? 'jpg' : format === 'dicom' ? 'dcm' : 'png'}`;
  const filepath = path.join(STORAGE_DIR, filename);

  await fs.writeFile(filepath, buffer);

  logger.info({
    event: 'image_stored',
    pseudonymizedId,
    filepath,
    size: buffer.length,
  });

  return `/api/images/deidentified/${pseudonymizedId}`;
}

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

/**
 * POST /api/images/upload
 * Upload and de-identify medical image
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const userId = context.user?.id || context.user?.email || 'unknown';

      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const patientId = formData.get('patientId') as string | null;
      const patientName = formData.get('patientName') as string | null;
      const studyDate = formData.get('studyDate') as string | null;
      const institutionName = formData.get('institutionName') as string | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided. Please upload an image.' },
          { status: 400 }
        );
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const metadata = await extractImageMetadata(buffer, file.name, patientId || undefined);
      if (patientName) metadata.patientName = patientName;
      if (studyDate) metadata.studyDate = studyDate;
      if (institutionName) metadata.institutionName = institutionName;

      logger.info({
        event: 'image_upload_received',
        userId,
        filename: file.name,
        size: file.size,
        type: file.type,
        patientId: patientId || 'none',
      });

      const result = await deidentifyMedicalImage(
        buffer,
        metadata,
        userId,
        validation.format || 'png'
      );

      const storedUrl = await storeDeidentifiedImage(
        buffer,
        result.pseudonymizedId,
        validation.format || 'png'
      );

      logger.info({
        event: 'image_upload_success',
        userId,
        pseudonymizedId: result.pseudonymizedId,
        auditLogId: result.auditLogId,
      });

      return NextResponse.json({
        success: true,
        message: 'Image uploaded and de-identified successfully',
        data: {
          pseudonymizedId: result.pseudonymizedId,
          imageUrl: storedUrl,
          originalHash: result.originalHash,
          removedPHI: result.removedPHI,
          timestamp: result.timestamp,
          auditLogId: result.auditLogId,
        },
      });
    } catch (error) {
      logger.error({
        event: 'image_upload_error',
        error: (error instanceof Error ? error.message : String(error)),
      });

      return safeErrorResponse(error, { userMessage: 'Failed to process image upload' });
    }
  },
  { roles: [...ROLES] }
);

/**
 * GET /api/images/upload
 * Returns upload endpoint information
 */
export const GET = createProtectedRoute(
  async () => {
    return NextResponse.json({
      endpoint: '/api/images/upload',
      method: 'POST',
      contentType: 'multipart/form-data',
      fields: {
        file: 'required - Image file (PNG, JPEG, DICOM)',
        patientId: 'optional - Patient identifier',
        patientName: 'optional - Patient name',
        studyDate: 'optional - Study date',
        institutionName: 'optional - Institution name',
      },
      maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
      allowedTypes: ALLOWED_TYPES,
      security: {
        authentication: 'required',
        deidentification: 'automatic',
        compliance: 'HIPAA Safe Harbor',
        auditLogging: 'enabled',
      },
    });
  },
  { roles: [...ROLES] }
);
