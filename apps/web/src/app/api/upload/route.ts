/**
 * File Upload API
 *
 * POST /api/upload
 * Upload files to Cloudflare R2 storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadFile } from '@/lib/storage/file-storage';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for file uploads
    const rateLimitError = await checkRateLimit(request, 'upload');
    if (rateLimitError) return rateLimitError;

    // Authenticate user (clinician or patient)
    const clinicianSession = await getServerSession(authOptions);
    let userId: string;
    let userType: 'clinician' | 'patient';

    if (clinicianSession?.user?.id) {
      userId = clinicianSession.user.id;
      userType = 'clinician';
    } else {
      // Try patient session
      try {
        const { requirePatientSession } = await import('@/lib/auth/patient-session');
        const patientSession = await requirePatientSession();
        userId = patientSession.patientId;
        userType = 'patient';
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'No autorizado' },
          { status: 401 }
        );
      }
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Archivo demasiado grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create Express.Multer.File-like object
    const multerFile = {
      fieldname: 'file',
      originalname: file.name,
      encoding: '7bit',
      mimetype: file.type,
      buffer: buffer,
      size: buffer.length,
    } as Express.Multer.File;

    // Upload to storage
    const result = await uploadFile(multerFile, {
      userId,
      userType,
      generateThumbnail: true,
    });

    logger.info({
      event: 'file_uploaded',
      userId,
      userType,
      filename: file.name,
      fileSize: result.fileSize,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Archivo subido correctamente',
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({
      event: 'file_upload_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al subir archivo',
      },
      { status: 500 }
    );
  }
}

// Configure route segment to handle large files
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large file uploads
