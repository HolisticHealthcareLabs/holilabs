/**
 * Scribe Session Audio Upload API
 *
 * POST /api/scribe/sessions/:id/audio - Upload and encrypt audio recording
 * Uses S3-compatible storage (DigitalOcean Spaces / Cloudflare R2 / AWS S3)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { encryptBuffer } from '@/lib/security/encryption';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large audio files

// Storage configuration (lazy-loaded to avoid build-time errors)
function getStorageConfig() {
  return {
    endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
    region: process.env.R2_REGION || process.env.AWS_REGION || 'auto',
    bucket: process.env.R2_BUCKET || process.env.S3_BUCKET || 'holi-labs-audio',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  };
}

// Initialize S3 client (lazy-loaded)
function getS3Client(): S3Client {
  const config = getStorageConfig();

  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error('S3/R2 credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY or R2 equivalents.');
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * POST /api/scribe/sessions/:id/audio
 * Upload and encrypt audio recording
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const sessionId = context.params.id;
      const startTime = Date.now();

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

      // Validate file size (max 500MB)
      const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
      if (audioFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        );
      }

      // Validate file type
      if (!audioFile.type.startsWith('audio/')) {
        return NextResponse.json(
          { error: `Invalid file type: ${audioFile.type}. Must be audio file.` },
          { status: 400 }
        );
      }

      // Convert File to Buffer
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // SECURITY: Encrypt audio file before upload (HIPAA/LGPD requirement)
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

      // Generate unique, secure filename
      const timestamp = Date.now();
      const hash = crypto.randomBytes(16).toString('hex');
      const extension = audioFile.name.split('.').pop() || 'webm';
      const fileName = `scribe-audio/${context.user.id}/${session.patientId}/${sessionId}_${timestamp}_${hash}.${extension}.encrypted`;

      // Upload encrypted audio to S3/R2/DigitalOcean Spaces
      const s3Client = getS3Client();
      const config = getStorageConfig();

      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: fileName,
          Body: finalBuffer,
          ContentType: 'application/octet-stream', // Encrypted files are binary
          ServerSideEncryption: 'AES256', // Additional S3 server-side encryption
          Metadata: {
            sessionId: sessionId,
            clinicianId: context.user.id,
            patientId: session.patientId,
            uploadedAt: new Date().toISOString(),
            originalMimeType: audioFile.type,
            originalSize: audioFile.size.toString(),
            duration: duration.toString(),
            encrypted: 'true',
          },
        })
      );

      const uploadTime = Date.now() - startTime;

      // Generate public URL or signed URL depending on bucket configuration
      const audioUrl = config.endpoint
        ? `${config.endpoint}/${config.bucket}/${fileName}`
        : fileName; // Store just the key if using private buckets

      // Update session with audio details
      const updatedSession = await prisma.scribeSession.update({
        where: { id: sessionId },
        data: {
          audioFileUrl: audioUrl,
          audioFileName: fileName,
          audioDuration: duration,
          audioFormat: extension,
          audioSize: finalBuffer.length, // Encrypted size
          status: 'PROCESSING',
          processingStartedAt: new Date(),
        },
      });

      // Track audio upload event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.SCRIBE_AUDIO_UPLOADED,
        context.user.id,
        {
          audioSize: audioFile.size,
          encryptedSize: finalBuffer.length,
          duration,
          format: extension,
          uploadTimeMs: uploadTime,
          success: true
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          sessionId: updatedSession.id,
          status: updatedSession.status,
          audioFormat: extension,
          audioDuration: duration,
          uploadTimeMs: uploadTime,
          // Don't return audio URL to client for security
        },
      });
    } catch (error: any) {
      console.error('Error uploading audio:', error);

      // Track failure event
      await trackEvent(
        ServerAnalyticsEvents.SCRIBE_AUDIO_UPLOADED,
        context.user.id,
        {
          success: false,
          error: error.message
        }
      ).catch(() => {}); // Don't fail if tracking fails

      return NextResponse.json(
        { error: 'Failed to upload audio', message: error.message },
        { status: 500 }
      );
    }
  }
);

// Note: In App Router, bodyParser is automatically disabled for route handlers
// using request.formData(), so no additional config is needed.
