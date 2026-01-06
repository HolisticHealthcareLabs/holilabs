/**
 * Patient Document Upload API
 *
 * Handles file upload with encryption and cloud storage
 *
 * POST /api/upload/patient-document
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  encryptFile,
  hashFile,
  generateFileId,
  sanitizeFilename,
  getFileExtension,
  isAllowedFileType,
  isAllowedFileSize,
} from '@/lib/encryption';
import { uploadToR2, generateStorageKey } from '@/lib/storage/r2-client';
import { getServerSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;
    const category = formData.get('category') as string || 'other';
    const description = formData.get('description') as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Validate patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Validate file type
    if (!isAllowedFileType(file.name)) {
      return NextResponse.json(
        { error: 'File type not allowed. Supported: PDF, Images, Word, Excel, Text' },
        { status: 400 }
      );
    }

    // Validate file size
    if (!isAllowedFileSize(file.size, 50)) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate file hash (for deduplication and integrity)
    const fileHash = hashFile(buffer);

    // Check if file already exists for this patient
    const existingDocument = await prisma.document.findFirst({
      where: {
        patientId,
        documentHash: fileHash,
      },
    });

    if (existingDocument) {
      return NextResponse.json(
        { error: 'This file has already been uploaded for this patient' },
        { status: 409 }
      );
    }

    // Encrypt file
    const encryptedBuffer = encryptFile(buffer);

    // Generate unique file ID and storage key
    const fileId = generateFileId();
    const extension = getFileExtension(file.name);
    const storageKey = generateStorageKey(patientId, fileId, extension);

    // Upload to R2
    await uploadToR2(storageKey, encryptedBuffer, file.type, {
      originalName: sanitizeFilename(file.name),
      patientId,
      category,
      fileHash,
    });

    // Map category to DocumentType enum
    const documentTypeMap: Record<string, string> = {
      lab_results: 'LAB_RESULTS',
      imaging: 'IMAGING',
      consultation_notes: 'CONSULTATION_NOTES',
      discharge_summary: 'DISCHARGE_SUMMARY',
      prescriptions: 'PRESCRIPTION',
      insurance: 'INSURANCE',
      consent_form: 'CONSENT_FORM',
      other: 'OTHER',
    };

    const documentType = documentTypeMap[category] || 'OTHER';

    // Save document record to database
    const document = await prisma.document.create({
      data: {
        patientId,
        fileName: sanitizeFilename(file.name),
        fileType: extension,
        fileSize: file.size,
        documentHash: fileHash,
        storageUrl: storageKey,
        documentType: documentType as any,
        uploadedBy: session.user.role || 'clinician',
      },
    });

    // HIPAA Audit Log: Document uploaded for patient
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'CREATE',
      resource: 'Document',
      resourceId: document.id,
      details: {
        patientId,
        fileName: file.name,
        fileSize: file.size,
        fileSizeFormatted: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        category,
        documentType,
        encrypted: true,
        storageLocation: 'R2',
      },
      success: true,
      request,
    });

    return NextResponse.json(
      {
        success: true,
        file: {
          id: document.id,
          name: document.fileName,
          size: document.fileSize,
          type: document.fileType,
          category,
          uploadedAt: document.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
