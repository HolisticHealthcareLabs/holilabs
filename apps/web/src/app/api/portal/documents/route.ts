/**
 * Patient Documents API
 *
 * GET /api/portal/documents
 * Fetch all documents for authenticated patient
 *
 * POST /api/portal/documents
 * Upload a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { z } from 'zod';

const DocumentsQuerySchema = z.object({
  type: z.enum(['LAB_RESULT', 'IMAGING', 'PRESCRIPTION', 'INSURANCE', 'CONSENT', 'OTHER']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const CreateDocumentSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  type: z.enum(['LAB_RESULT', 'IMAGING', 'PRESCRIPTION', 'INSURANCE', 'CONSENT', 'OTHER']).default('OTHER'),
  fileUrl: z.string().url('URL del archivo inválida'),
  mimeType: z.string().default('application/pdf'),
  fileSize: z.number().int().positive('El tamaño del archivo debe ser mayor a 0'),
});

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = DocumentsQuerySchema.safeParse({
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: queryValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const { type, limit } = queryValidation.data;

    const where: any = {
      patientId: context.session.patientId,
    };

    if (type) {
      where.documentType = type;
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const documentsByType = documents.reduce(
      (acc, doc) => {
        if (!acc[doc.documentType]) {
          acc[doc.documentType] = [];
        }
        acc[doc.documentType].push(doc);
        return acc;
      },
      {} as Record<string, typeof documents>
    );

    const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

    await createAuditLog({
      action: 'READ',
      resource: 'Document',
      resourceId: context.session.patientId,
      details: {
        documentCount: documents.length,
        accessType: 'PATIENT_PORTAL_SELF_ACCESS',
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        documentTypes: Object.keys(documentsByType),
        filterType: type || 'ALL',
      },
      success: true,
    });

    logger.info({
      event: 'patient_documents_fetched',
      patientId: context.session.patientId,
      count: documents.length,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          documents,
          summary: {
            total: documents.length,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            byType: Object.keys(documentsByType).reduce(
              (acc, type) => {
                acc[type] = documentsByType[type].length;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
          documentsByType,
        },
      },
      { status: 200 }
    );
  },
  { audit: { action: 'READ', resource: 'Documents' } }
);

// @todo(document-schema): Re-enable POST handler after aligning with Prisma Document model fields
// The current implementation references fields (title, description, fileUrl, etc.) that don't exist in the schema
// Document schema has: documentHash, fileName, fileType, fileSize, storageUrl, etc.
/*
export async function POST(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { title, description, type, fileUrl, mimeType, fileSize} = validation.data;

    // Get patient to link document
    const patient = await prisma.patient.findUnique({
      where: { id: session.patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        patientId: session.patientId,
        title,
        description,
        type,
        fileUrl,
        mimeType,
        fileSize,
        uploadedByUserId: session.userId,
        uploadedAt: new Date(),
      },
      include: {
        uploadedByUser: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userEmail: session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'Document',
        resourceId: document.id,
        success: true,
        metadata: {
          type,
          fileSize,
        },
      },
    });

    logger.info({
      event: 'document_uploaded',
      patientId: session.patientId,
      documentId: document.id,
      type,
      fileSize,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Documento subido correctamente.',
        data: document,
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
      event: 'document_upload_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al subir documento.',
      },
      { status: 500 }
    );
  }
}
*/
