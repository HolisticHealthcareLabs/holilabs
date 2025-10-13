/**
 * Document Upload API
 * Handles file uploads with validation, hash generation, and storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const uploadSchema = z.object({
  documentType: z.enum([
    'LAB_RESULT',
    'IMAGING',
    'PRESCRIPTION',
    'INSURANCE',
    'CONSENT',
    'OTHER',
  ]),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated patient
    const session = await requirePatientSession();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate document type
    const validatedData = uploadSchema.parse({ documentType });

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large. Maximum size is 10MB',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX',
        },
        { status: 400 }
      );
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate SHA-256 hash of file content
    const documentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Check for duplicate (same hash)
    const existingDoc = await prisma.document.findFirst({
      where: {
        documentHash,
        patientId: session.patientId,
      },
    });

    if (existingDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'This document has already been uploaded',
          documentId: existingDoc.id,
        },
        { status: 409 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', session.patientId);
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const uniqueFileName = `${timestamp}-${randomString}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Save file to disk
    await writeFile(filePath, buffer);

    // Create relative path for storage URL
    const storageUrl = `/uploads/documents/${session.patientId}/${uniqueFileName}`;

    // Get file type extension
    const fileType = fileExtension.replace('.', '').toLowerCase();

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        patientId: session.patientId,
        documentHash,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        storageUrl,
        documentType: validatedData.documentType,
        isDeidentified: false,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'DOCUMENT_UPLOADED',
        resourceType: 'DOCUMENT',
        resourceId: document.id,
        details: {
          fileName: file.name,
          fileSize: file.size,
          documentType: validatedData.documentType,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Create notification for patient
    await prisma.notification.create({
      data: {
        recipientId: session.patientId,
        recipientType: 'PATIENT',
        type: 'NEW_DOCUMENT',
        title: 'Documento subido exitosamente',
        message: `Tu documento "${file.name}" ha sido subido correctamente`,
        priority: 'NORMAL',
        actionUrl: `/portal/dashboard/documents`,
        actionLabel: 'Ver documento',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        document: {
          id: document.id,
          fileName: document.fileName,
          fileType: document.fileType,
          fileSize: document.fileSize,
          documentType: document.documentType,
          documentHash: document.documentHash,
          createdAt: document.createdAt,
        },
      },
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Document upload error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid document type',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload document',
      },
      { status: 500 }
    );
  }
}
