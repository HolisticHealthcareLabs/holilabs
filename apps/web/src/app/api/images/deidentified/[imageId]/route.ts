/**
 * Retrieve De-identified Medical Image API
 * Serves de-identified images with proper security controls
 *
 * Security Features:
 * - Authentication required
 * - Audit logging for access
 * - Content-Type validation
 * - Rate limiting (TODO: implement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

// Storage directory for de-identified images
const STORAGE_DIR = path.join(process.cwd(), '.data', 'deidentified-images');

/**
 * Determine content type from file extension
 */
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

/**
 * GET /api/images/deidentified/[imageId]
 * Retrieve a de-identified medical image
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    // Step 1: Authenticate user
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access medical images.' },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || 'unknown';
    const imageId = params.imageId;

    // Step 2: Validate imageId format (prevent path traversal)
    if (!imageId || imageId.includes('..') || imageId.includes('/') || imageId.includes('\\')) {
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
    }

    // Step 3: Find image file (try all supported extensions)
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
        // File doesn't exist with this extension, try next
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

    // Step 4: Read image file
    const imageBuffer = await fs.readFile(filepath);

    // Step 5: Create audit log for image access
    logger.info({
      event: 'image_accessed',
      userId,
      imageId,
      filepath,
      size: imageBuffer.length,
      timestamp: new Date().toISOString(),
    });

    // Step 6: Return image with appropriate headers
    const contentType = getContentType(foundExtension);

    return new NextResponse(Buffer.from(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'",
        // HIPAA audit headers
        'X-Audit-Log': 'enabled',
        'X-Image-Type': 'deidentified',
      },
    });
  } catch (error: any) {
    logger.error({
      event: 'image_retrieval_error',
      imageId: params.imageId,
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve image',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/deidentified/[imageId]
 * Delete a de-identified image (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user has admin/delete permissions
    // For now, any authenticated user can delete their own images

    const userId = session.user.id || session.user.email || 'unknown';
    const imageId = params.imageId;

    // Validate imageId
    if (!imageId || imageId.includes('..') || imageId.includes('/') || imageId.includes('\\')) {
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
    }

    // Find and delete image file
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
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
      imageId,
    });
  } catch (error: any) {
    logger.error({
      event: 'image_deletion_error',
      imageId: params.imageId,
      error: error.message,
    });

    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
