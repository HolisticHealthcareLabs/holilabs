/**
 * Patient Data Export Request API (LGPD Art. 18 / Habeas Data)
 *
 * POST /api/exports/request — request a patient data export
 * GET  /api/exports/request — list/check export status
 *
 * Creates an async export job using DeletionRequest model (type=EXPORT in metadata).
 * Differential privacy noise applied to aggregate fields before export.
 *
 * @compliance LGPD Art. 18 (II) — right of access to data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const { patientId, format, sections, reason } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Export reason is required (LGPD Art. 18 compliance)' },
        { status: 400 }
      );
    }

    // CYRUS CVI-002: Verify caller has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, patientId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const exportFormat = format || 'json';
    const validFormats = ['json', 'csv', 'fhir'];
    if (!validFormats.includes(exportFormat)) {
      return NextResponse.json(
        { error: `Invalid format. Supported: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    const allSections = [
      'demographics', 'encounters', 'prescriptions',
      'labResults', 'healthMetrics', 'consents', 'auditTrail',
    ];
    const requestedSections = Array.isArray(sections) && sections.length > 0
      ? sections.filter((s: string) => allSections.includes(s))
      : allSections;

    // Reuse DeletionRequest model with type=EXPORT in metadata
    const confirmationDeadline = new Date();
    confirmationDeadline.setDate(confirmationDeadline.getDate() + 30);

    const exportRequest = await prisma.deletionRequest.create({
      data: {
        patientId,
        reason,
        status: 'PENDING_CONFIRMATION',
        confirmationDeadline,
        legalBasis: 'LGPD_ARTICLE_18',
        metadata: {
          type: 'EXPORT',
          format: exportFormat,
          sections: requestedSections,
          requestedBy: context.user!.id,
        },
      },
    });

    await createAuditLog({
      action: 'READ',
      resource: 'PatientExport',
      resourceId: exportRequest.id,
      details: {
        patientId,
        format: exportFormat,
        sections: requestedSections,
        reason,
      },
      success: true,
    });

    logger.info({
      event: 'export_request_created',
      exportId: exportRequest.id,
      patientId,
      format: exportFormat,
      sections: requestedSections,
    });

    return NextResponse.json({
      exportId: exportRequest.id,
      status: 'PENDING',
      format: exportFormat,
      sections: requestedSections,
      message: 'Export request queued. Poll GET /api/exports/request?id={exportId} for status.',
    }, { status: 202 });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'] }
);

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);
    const exportId = searchParams.get('id');

    if (!exportId) {
      // List export requests where metadata.type = 'EXPORT'
      const exports = await prisma.deletionRequest.findMany({
        where: {
          metadata: { path: ['type'], equals: 'EXPORT' },
          ...(context.user!.role !== 'ADMIN'
            ? { metadata: { path: ['requestedBy'], equals: context.user!.id } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          patientId: true,
          status: true,
          metadata: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ exports });
    }

    const exportRequest = await prisma.deletionRequest.findUnique({
      where: { id: exportId },
      select: {
        id: true,
        patientId: true,
        status: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!exportRequest) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    // CYRUS: Only the requester or ADMIN can view export status
    const meta = exportRequest.metadata as Record<string, unknown> | null;
    if (meta?.requestedBy !== context.user!.id && context.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      exportId: exportRequest.id,
      status: exportRequest.status,
      patientId: exportRequest.patientId,
      createdAt: exportRequest.createdAt,
      format: meta?.format,
      sections: meta?.sections,
    });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true }
);
