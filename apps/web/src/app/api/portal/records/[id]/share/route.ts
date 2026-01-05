/**
 * Medical Record Sharing API
 *
 * POST /api/portal/records/[id]/share
 * Create a secure, time-limited share link for a medical record
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import crypto from 'crypto';

// Share request schema
const ShareRequestSchema = z.object({
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  recipientName: z.string().optional(),
  purpose: z.string().optional(),
  expiresInHours: z.number().int().min(1).max(720).default(72), // Default 3 days, max 30 days
  maxAccesses: z.number().int().min(1).max(100).optional(),
  allowDownload: z.boolean().default(true),
  requirePassword: z.boolean().default(false),
  password: z.string().min(6).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    const recordId = params.id;

    // Verify record exists and belongs to patient
    const record = await prisma.sOAPNote.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        patientId: true,
        chiefComplaint: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: 'Registro no encontrado.',
        },
        { status: 404 }
      );
    }

    if (record.patientId !== session.patientId) {
      logger.warn({
        event: 'unauthorized_share_attempt',
        patientUserId: session.userId,
        requestedPatientId: record.patientId,
        recordId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado para compartir este registro.',
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ShareRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetros inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      recipientEmail,
      recipientPhone,
      recipientName,
      purpose,
      expiresInHours,
      maxAccesses,
      allowDownload,
      requirePassword,
      password,
    } = validation.data;

    // Generate share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Hash the token for storage (for security)
    const shareTokenHash = crypto
      .createHash('sha256')
      .update(shareToken)
      .digest('hex');

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Hash password if provided
    let passwordHash: string | null = null;
    if (requirePassword && password) {
      passwordHash = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
    }

    // Create share record
    const share = await prisma.documentShare.create({
      data: {
        patientId: session.patientId,
        documentType: 'SOAP_NOTE',
        documentId: recordId,
        documentIds: [recordId],
        shareToken,
        shareTokenHash,
        recipientEmail,
        recipientPhone,
        recipientName,
        purpose,
        expiresAt,
        maxAccesses,
        allowDownload,
        requirePassword,
        passwordHash,
        isActive: true,
      },
    });

    // Build share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/${shareToken}`;

    // HIPAA Audit Log: Patient created share link for medical record
    await createAuditLog({
      userId: session.patientId,
      userEmail: session.email || 'patient@portal.access',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'SHARE',
      resource: 'SOAPNote',
      resourceId: recordId,
      details: {
        patientId: session.patientId,
        recordId,
        shareId: share.id,
        recipientEmail: share.recipientEmail,
        recipientName: share.recipientName,
        purpose: share.purpose,
        expiresAt: share.expiresAt.toISOString(),
        expiresInHours,
        maxAccesses: share.maxAccesses,
        allowDownload: share.allowDownload,
        requirePassword: share.requirePassword,
        accessType: 'PATIENT_RECORD_SHARE_CREATE',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          shareId: share.id,
          shareUrl,
          shareToken,
          expiresAt: share.expiresAt,
          maxAccesses: share.maxAccesses,
          recipientEmail: share.recipientEmail,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'medical_record_share_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      recordId: params.id,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear enlace de compartir.',
      },
      { status: 500 }
    );
  }
}

// GET - List all active shares for a record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    const recordId = params.id;

    // Verify record belongs to patient
    const record = await prisma.sOAPNote.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        patientId: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: 'Registro no encontrado.',
        },
        { status: 404 }
      );
    }

    if (record.patientId !== session.patientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado.',
        },
        { status: 403 }
      );
    }

    // Get all active shares for this record
    const shares = await prisma.documentShare.findMany({
      where: {
        documentId: recordId,
        documentType: 'SOAP_NOTE',
        patientId: session.patientId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        recipientEmail: true,
        recipientName: true,
        purpose: true,
        expiresAt: true,
        accessCount: true,
        maxAccesses: true,
        lastAccessedAt: true,
        createdAt: true,
        shareToken: true,
      },
    });

    // HIPAA Audit Log: Patient listed active shares for medical record
    await createAuditLog({
      userId: session.patientId,
      userEmail: session.email || 'patient@portal.access',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'READ',
      resource: 'DocumentShare',
      resourceId: recordId,
      details: {
        patientId: session.patientId,
        recordId,
        sharesCount: shares.length,
        accessType: 'PATIENT_RECORD_SHARE_LIST',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: shares,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'list_shares_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      recordId: params.id,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al listar enlaces de compartir.',
      },
      { status: 500 }
    );
  }
}
