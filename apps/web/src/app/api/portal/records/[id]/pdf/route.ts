export const dynamic = "force-dynamic";
/**
 * Patient Medical Record PDF Export API
 *
 * GET /api/portal/records/[id]/pdf
 * Generate and download SOAP note as PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { renderToStream } from '@react-pdf/renderer';
import { SOAPNotePDF } from '@/components/pdf/SOAPNotePDF';
import React from 'react';

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const recordId = context.params.id;

    // Fetch record with full details
    const record = await prisma.sOAPNote.findUnique({
      where: {
        id: recordId,
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
            audioFileName: true,
            audioDuration: true,
            createdAt: true,
            appointment: {
              select: {
                id: true,
                title: true,
                type: true,
                startTime: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado.' },
        { status: 404 }
      );
    }

    // Verify record belongs to authenticated patient
    if (record.patientId !== context.session.patientId) {
      logger.warn({
        event: 'unauthorized_pdf_export_attempt',
        patientId: context.session.userId,
        requestedPatientId: record.patientId,
        recordId,
      });

      return NextResponse.json(
        { success: false, error: 'No autorizado para exportar este registro.' },
        { status: 403 }
      );
    }

    // HIPAA Audit Log: Patient exported medical record as PDF
    await createAuditLog({
      action: 'EXPORT',
      resource: 'SOAPNote',
      resourceId: recordId,
      details: {
        patientId: context.session.patientId,
        recordId,
        clinicianId: record.clinicianId,
        exportFormat: 'PDF',
        fileName: `registro-medico-${record.patient.mrn}-${new Date(record.createdAt).toISOString().split('T')[0]}.pdf`,
        accessType: 'PATIENT_RECORD_PDF_EXPORT',
      },
      success: true,
    });

    // Generate PDF
    // @ts-ignore - SOAPNotePDF returns Document component which is valid for renderToStream
    const pdfStream = await renderToStream(
      React.createElement(SOAPNotePDF, { record: record as any }) as any
    );

    // Create filename with patient name and date
    const date = new Date(record.createdAt).toISOString().split('T')[0];
    const filename = `registro-medico-${record.patient.mrn}-${date}.pdf`;

    // Convert stream to buffer for Next.js response
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'RecordPDF' },
  }
);
