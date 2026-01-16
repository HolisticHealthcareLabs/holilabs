/**
 * CDSS V3 - Document Parse API
 *
 * POST /api/documents/parse - Upload and queue document for sandboxed parsing
 *
 * This endpoint:
 * 1. Receives file upload
 * 2. Saves to shared volume for sandboxed parser
 * 3. Enqueues BullMQ job for async processing
 * 4. Returns job ID for polling
 *
 * Frontend should poll /api/jobs/[jobId]/status for progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createDocumentService } from '@/lib/services/document.service';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import {
  sanitizeFilename,
  isAllowedFileType,
  isAllowedFileSize,
} from '@/lib/encryption';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Shared volume for sandboxed parser
const SHARED_VOLUME = process.env.PARSER_SHARED_VOLUME || '/data/parser-jobs';

// Max file size for parsing (50MB)
const MAX_FILE_SIZE_MB = 50;

// Allowed MIME types for parsing
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * POST /api/documents/parse
 *
 * Upload a document and queue it for sandboxed parsing.
 * Returns job ID for status polling.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const patientId = formData.get('patientId') as string | null;
    const encounterId = formData.get('encounterId') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Validate patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Validate file type
    if (!isAllowedFileType(file.name)) {
      return NextResponse.json(
        {
          success: false,
          error: 'File type not allowed. Supported: PDF, Images (PNG/JPG/TIFF), Word documents',
        },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `MIME type ${file.type} not supported for parsing`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (!isAllowedFileSize(file.size, MAX_FILE_SIZE_MB)) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`,
        },
        { status: 400 }
      );
    }

    // Generate unique job directory
    const jobDirId = uuid();
    const jobDir = path.join(SHARED_VOLUME, jobDirId);
    const sanitizedName = sanitizeFilename(file.name);
    const filePath = path.join(jobDir, sanitizedName);

    // Ensure shared volume directory exists
    await fs.mkdir(jobDir, { recursive: true });

    // Write file to shared volume
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    logger.info({
      event: 'document_saved_for_parsing',
      patientId,
      originalName: file.name,
      sanitizedName,
      filePath,
      fileSizeBytes: file.size,
      mimeType: file.type,
    });

    // Enqueue parsing job
    const documentService = createDocumentService();
    const { jobId, bullmqJobId } = await documentService.enqueueParseJob({
      patientId,
      filePath,
      originalName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      encounterId: encounterId || undefined,
      uploadedBy: session.user.id,
    });

    // HIPAA Audit Log
    await createAuditLog({
      action: 'CREATE',
      resource: 'DocumentParseJob',
      resourceId: jobId,
      details: {
        patientId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        encounterId: encounterId || null,
        bullmqJobId,
      },
      success: true,
    });

    logger.info({
      event: 'document_parse_job_created',
      jobId,
      bullmqJobId,
      patientId,
      encounterId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          jobId,
          message: 'Document queued for parsing. Poll /api/jobs/{jobId}/status for progress.',
        },
      },
      { status: 202 }
    );
  } catch (error) {
    logger.error({
      event: 'document_parse_upload_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload document for parsing',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
