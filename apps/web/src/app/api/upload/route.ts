/**
 * File Upload API
 *
 * POST /api/upload
 * Upload files to Cloudflare R2 storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { uploadEncryptedFile } from '@/lib/storage/cloud-storage';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const POST = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      // Rate limiting for file uploads
      const rateLimitError = await checkRateLimit(request, 'upload');
      if (rateLimitError) return rateLimitError;

      const userId = context.user!.id;

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

    // Upload to R2 cloud storage (encrypted, HIPAA compliant)
    const result = await uploadEncryptedFile(file as any, {
      userId,
      patientId: formData.get('patientId') as string || undefined,
      category: (formData.get('category') as string) || 'general',
    } as any);

    logger.info({
      event: 'file_uploaded',
      userId,
      userType: 'clinician',
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
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al subir archivo',
      },
      { status: 500 }
    );
  }
},
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);

// Configure route segment to handle large files
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large file uploads
