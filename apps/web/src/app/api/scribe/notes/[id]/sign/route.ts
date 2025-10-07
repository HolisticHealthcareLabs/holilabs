/**
 * SOAP Note Signature API
 *
 * POST /api/scribe/notes/:id/sign - Sign and finalize SOAP note
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/scribe/notes/:id/sign
 * Sign SOAP note (makes it immutable)
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const noteId = context.params.id;
      const body = await request.json();
      const { signatureMethod, pin } = body;

      if (!signatureMethod || !pin) {
        return NextResponse.json(
          { error: 'Signature method and PIN are required' },
          { status: 400 }
        );
      }

      // Verify note belongs to this clinician
      const note = await prisma.sOAPNote.findFirst({
        where: {
          id: noteId,
          clinicianId: context.user.id,
        },
      });

      if (!note) {
        return NextResponse.json(
          { error: 'SOAP note not found or access denied' },
          { status: 404 }
        );
      }

      // Can't re-sign signed notes
      if (note.status === 'SIGNED') {
        return NextResponse.json(
          { error: 'Note is already signed' },
          { status: 400 }
        );
      }

      // Validate PIN (in production, verify against stored hash)
      if (pin.length < 4) {
        return NextResponse.json(
          { error: 'Invalid PIN' },
          { status: 400 }
        );
      }

      // Hash the PIN for storage (never store plain text)
      const pinHash = createHash('sha256').update(pin).digest('hex');

      // Update note with signature
      const signedNote = await prisma.sOAPNote.update({
        where: { id: noteId },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          signedBy: context.user.id,
          signatureMethod,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          action: 'SIGN',
          resource: 'SOAPNote',
          resourceId: noteId,
          details: {
            signatureMethod,
            noteHash: note.noteHash,
          },
          dataHash: note.noteHash,
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: signedNote.id,
          status: signedNote.status,
          signedAt: signedNote.signedAt,
          signedBy: signedNote.signedBy,
        },
        message: 'SOAP note signed successfully',
      });
    } catch (error: any) {
      console.error('Error signing SOAP note:', error);
      return NextResponse.json(
        { error: 'Failed to sign SOAP note', message: error.message },
        { status: 500 }
      );
    }
  }
);
