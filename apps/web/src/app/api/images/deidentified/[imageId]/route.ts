/**
 * Retrieve De-identified Medical Image API
 * Serves de-identified images with proper security controls
 *
 * Security Features:
 * - Authentication required
 * - Audit logging for access
 * - Content-Type validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import logger from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

const STORAGE_DIR = path.join(process.cwd(), '.data', 'deidentified-images');

function getContentType(filename: string): string {
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
    return 'image/jpeg';
  } else if (filename.endsWith('.png')) {
    return 'image/png';
  } else if (filename.endsWith('.dcm')) {
    return 'application/dicom';
  }
  return 'application/octet-stream';
}

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

/**
 * GET /api/images/deidentified/[imageId]
 * Retrieve a de-identified medical image
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const params = await Promise.resolve(context.params ?? ({} as any));
      const imageId = params?.imageId;
      const userId = context.user?.id || context.user?.email || 'unknown';

      if (!imageId || imageId.includes('..') || imageId.includes('/') || imageId.includes('\\')) {
        return NextResponse.json(
          { error: 'Invalid image ID' },
          { status: 400 }
        );
      }

      const extensions = ['png', 'jpg', 'jpeg', 'dcm'];
      let filepath: string | null = null;
      let foundExtension: string | null = null;

      for (const ext of extensions) {
        const testPath = path.join(STORAGE_DIR, `${imageId}.${ext}`);
        try {
          await fs.access(testPath);
          filepath = testPath;
          foundExtension = ext;
          break;
        } catch {
          continue;
        }
      }

      if (!filepath || !foundExtension) {
        logger.warn({
          event: 'image_not_found',
          userId,
          imageId,
        });

        return NextResponse.json(
          { error: 'Image not found. It may have been deleted or never existed.' },
          { status: 404 }
        );
      }

      const imageBuffer = await fs.readFile(filepath);

      logger.info({
        event: 'image_accessed',
        userId,
        imageId,
        filepath,
        size: imageBuffer.length,
        timestamp: new Date().toISOString(),
      });

      const contentType = getContentType(foundExtension);

      return new NextResponse(Buffer.from(imageBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': imageBuffer.length.toString(),
          'Cache-Control': 'private, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "default-src 'none'",
          'X-Audit-Log': 'enabled',
          'X-Image-Type': 'deidentified',
        },
      });
    } catch (error) {
      const params = await Promise.resolve(context.params ?? ({} as any));
      logger.error({
        event: 'image_retrieval_error',
        imageId: params?.imageId,
        error: (error instanceof Error ? error.message : String(error)),
      });

      return safeErrorResponse(error, { userMessage: 'Failed to retrieve image' });
    }
  },
  { roles: [...ROLES] }
);

/**
 * DELETE /api/images/deidentified/[imageId]
 * Delete a de-identified image
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const params = await Promise.resolve(context.params ?? ({} as any));
      const imageId = params?.imageId;
      const userId = context.user?.id || context.user?.email || 'unknown';

      if (!imageId || imageId.includes('..') || imageId.includes('/') || imageId.includes('\\')) {
        return NextResponse.json(
          { error: 'Invalid image ID' },
          { status: 400 }
        );
      }

      const extensions = ['png', 'jpg', 'jpeg', 'dcm'];
      let deleted = false;

      for (const ext of extensions) {
        const filepath = path.join(STORAGE_DIR, `${imageId}.${ext}`);
        try {
          await fs.unlink(filepath);
          deleted = true;

          logger.info({
            event: 'image_deleted',
            userId,
            imageId,
            filepath,
          });

          break;
        } catch {
          continue;
        }
      }

      if (!deleted) {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully',
        imageId,
      });
    } catch (error) {
      const params = await Promise.resolve(context.params ?? ({} as any));
      logger.error({
        event: 'image_deletion_error',
        imageId: params?.imageId,
        error: (error instanceof Error ? error.message : String(error)),
      });

      return safeErrorResponse(error, { userMessage: 'Failed to delete image' });
    }
  },
  { roles: [...ROLES] }
);
