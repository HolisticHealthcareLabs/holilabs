/**
 * Public Shared Medical Record API
 *
 * GET /api/shared/[shareToken]
 * Access a shared medical record via secure token (no authentication required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { z } from 'zod';

// Password verification schema
const PasswordSchema = z.object({
  password: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    const shareToken = params.shareToken;

    // Hash the provided token for lookup
    const shareTokenHash = crypto
      .createHash('sha256')
      .update(shareToken)
      .digest('hex');

    // Find the share record
    const share = await prisma.documentShare.findUnique({
      where: {
        shareTokenHash,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            mrn: true,
          },
        },
      },
    });

    // Check if share exists
    if (!share) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enlace de compartir no válido o expirado.',
        },
        { status: 404 }
      );
    }

    // Check if share is active
    if (!share.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este enlace ha sido revocado.',
        },
        { status: 403 }
      );
    }

    // Check if expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este enlace ha expirado.',
        },
        { status: 403 }
      );
    }

    // Check access limit
    if (share.maxAccesses && share.accessCount >= share.maxAccesses) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este enlace ha alcanzado el límite de accesos.',
        },
        { status: 403 }
      );
    }

    // Check if password is required (password verification done separately via POST)
    if (share.requirePassword) {
      const searchParams = request.nextUrl.searchParams;
      const providedPassword = searchParams.get('password');

      if (!providedPassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'Se requiere contraseña.',
            requiresPassword: true,
          },
          { status: 401 }
        );
      }

      // Verify password
      const passwordHash = crypto
        .createHash('sha256')
        .update(providedPassword)
        .digest('hex');

      if (passwordHash !== share.passwordHash) {
        logger.warn({
          event: 'shared_record_wrong_password',
          shareId: share.id,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Contraseña incorrecta.',
            requiresPassword: true,
          },
          { status: 401 }
        );
      }
    }

    // Fetch the medical record
    const record = await prisma.sOAPNote.findUnique({
      where: {
        id: share.documentId,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            mrn: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true,
            npi: true,
          },
        },
        session: {
          select: {
            id: true,
            audioDuration: true,
            createdAt: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: 'Registro médico no encontrado.',
        },
        { status: 404 }
      );
    }

    // Get client IP for tracking
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';

    // Update access tracking
    await prisma.documentShare.update({
      where: {
        id: share.id,
      },
      data: {
        accessCount: { increment: 1 },
        accessedAt: share.accessedAt || new Date(),
        lastAccessedAt: new Date(),
        accessIpAddresses: {
          push: clientIp,
        },
      },
    });

    // Log access for HIPAA compliance
    logger.info({
      event: 'shared_record_accessed',
      shareId: share.id,
      recordId: record.id,
      patientId: record.patientId,
      ip: clientIp,
      recipientEmail: share.recipientEmail,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          record,
          share: {
            recipientName: share.recipientName,
            purpose: share.purpose,
            expiresAt: share.expiresAt,
            allowDownload: share.allowDownload,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'shared_record_access_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      shareToken: params.shareToken,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al acceder al registro compartido.',
      },
      { status: 500 }
    );
  }
}
