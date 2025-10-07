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

export const dynamic = 'force-dynamic';

// Initialize Supabase client for storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

      // Validate file type (webm, mp3, wav, m4a)
      const allowedTypes = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
      if (!allowedTypes.includes(audioFile.type)) {
        return NextResponse.json(
          { error: 'Invalid audio format. Supported: webm, mp3, wav, m4a' },
          { status: 400 }
        );
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (audioFile.size > maxSize) {
        return NextResponse.json(
          { error: 'Audio file too large. Maximum size: 100MB' },
          { status: 400 }
        );
      }

      // Convert File to Buffer
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate unique filename
      const timestamp = Date.now();
      const hash = createHash('md5').update(buffer).digest('hex').substring(0, 8);
      const extension = audioFile.name.split('.').pop() || 'webm';
      const fileName = `scribe/${session.patientId}/${sessionId}_${timestamp}_${hash}.${extension}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-recordings') // Bucket name
        .upload(fileName, buffer, {
          contentType: audioFile.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload audio file', message: uploadError.message },
          { status: 500 }
        );
      }

      // Get public URL (or signed URL for private bucket)
      const { data: urlData } = supabase.storage
        .from('medical-recordings')
        .getPublicUrl(fileName);

      // Update session with audio details
      const updatedSession = await prisma.scribeSession.update({
        where: { id: sessionId },
        data: {
          audioFileUrl: urlData.publicUrl,
          audioFileName: fileName,
          audioDuration: duration,
          audioFormat: extension,
          audioSize: audioFile.size,
          status: 'PROCESSING',
          processingStartedAt: new Date(),
        },
      });

      // TODO: Trigger transcription job (background job or webhook)
      // For now, return success and client will call finalize endpoint

      return NextResponse.json({
        success: true,
        data: {
          sessionId: updatedSession.id,
          audioUrl: updatedSession.audioFileUrl,
          status: updatedSession.status,
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
