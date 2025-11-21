/**
 * Scribe Session Audio Upload API
 *
 * POST /api/scribe/sessions/:id/audio - Upload audio recording
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { encryptBuffer } from '@/lib/security/encryption';
import { AudioUploadSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Initialize Supabase client for storage (lazy-loaded to avoid build-time errors)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  return createClient(url, key);
}

// Remove module-level initialization - now using lazy-loaded function

/**
 * POST /api/scribe/sessions/:id/audio
 * Upload audio recording and trigger transcription
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const sessionId = context.params.id;

      // Verify session belongs to this clinician
      const session = await prisma.scribeSession.findFirst({
        where: {
          id: sessionId,
          clinicianId: context.user.id,
        },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      if (session.status !== 'RECORDING' && session.status !== 'PAUSED') {
        return NextResponse.json(
          { error: 'Session is not in recording state' },
          { status: 400 }
        );
      }

      // Parse multipart form data
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File;
      const duration = parseInt(formData.get('duration') as string || '0');

      if (!audioFile) {
        return NextResponse.json(
          { error: 'Audio file is required' },
          { status: 400 }
        );
      }

      // Validate audio metadata with Zod schema
      let validatedMetadata;
      try {
        validatedMetadata = AudioUploadSchema.parse({
          duration,
          fileSize: audioFile.size,
          mimeType: audioFile.type,
          fileName: audioFile.name,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              message: 'Invalid audio file or metadata',
              details: error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
            { status: 400 }
          );
        }
        throw error;
      }

      // Convert File to Buffer
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // SECURITY: Encrypt audio file before upload (HIPAA requirement)
      let finalBuffer: Buffer;
      try {
        finalBuffer = encryptBuffer(buffer);
      } catch (error: any) {
        console.error('Audio encryption error:', error);
        return NextResponse.json(
          { error: 'Failed to encrypt audio file', message: error.message },
          { status: 500 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const hash = createHash('md5').update(buffer).digest('hex').substring(0, 8);
      const extension = audioFile.name.split('.').pop() || 'webm';
      const fileName = `scribe/${session.patientId}/${sessionId}_${timestamp}_${hash}.${extension}.encrypted`;

      // Initialize Supabase client
      const supabase = getSupabaseClient();

      // Upload encrypted audio to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-recordings') // Bucket name (must be PRIVATE)
        .upload(fileName, finalBuffer, {
          contentType: 'application/octet-stream', // Encrypted files are binary
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload audio file', message: uploadError.message },
          { status: 500 }
        );
      }

      // SECURITY: Generate signed URL (private bucket - expires in 24 hours)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('medical-recordings')
        .createSignedUrl(fileName, 86400); // 24 hours

      if (urlError) {
        console.error('Failed to create signed URL:', urlError);
        return NextResponse.json(
          { error: 'Failed to generate secure audio URL' },
          { status: 500 }
        );
      }

      // Update session with audio details (using validated metadata)
      const updatedSession = await prisma.scribeSession.update({
        where: { id: sessionId },
        data: {
          audioFileUrl: urlData.signedUrl,
          audioFileName: fileName,
          audioDuration: validatedMetadata.duration,
          audioFormat: extension,
          audioSize: finalBuffer.length, // Encrypted size
          status: 'PROCESSING',
          processingStartedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          sessionId: updatedSession.id,
          status: updatedSession.status,
          // Don't return audio URL to client - only server should access
        },
      });
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      return NextResponse.json(
        { error: 'Failed to upload audio', message: error.message },
        { status: 500 }
      );
    }
  }
);
