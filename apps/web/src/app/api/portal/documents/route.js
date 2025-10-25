"use strict";
/**
 * Patient Documents API
 *
 * GET /api/portal/documents
 * Fetch all documents for authenticated patient
 *
 * POST /api/portal/documents
 * Upload a new document
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const zod_1 = require("zod");
// Query parameters schema
const DocumentsQuerySchema = zod_1.z.object({
    type: zod_1.z.enum(['LAB_RESULT', 'IMAGING', 'PRESCRIPTION', 'INSURANCE', 'CONSENT', 'OTHER']).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});
// Create document schema
const CreateDocumentSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'El título debe tener al menos 3 caracteres'),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['LAB_RESULT', 'IMAGING', 'PRESCRIPTION', 'INSURANCE', 'CONSENT', 'OTHER']).default('OTHER'),
    fileUrl: zod_1.z.string().url('URL del archivo inválida'),
    mimeType: zod_1.z.string().default('application/pdf'),
    fileSize: zod_1.z.number().int().positive('El tamaño del archivo debe ser mayor a 0'),
});
async function GET(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const queryValidation = DocumentsQuerySchema.safeParse({
            type: searchParams.get('type'),
            limit: searchParams.get('limit'),
        });
        if (!queryValidation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Parámetros de consulta inválidos',
                details: queryValidation.error.errors,
            }, { status: 400 });
        }
        const { type, limit } = queryValidation.data;
        // Build filter conditions
        const where = {
            patientId: session.patientId,
        };
        if (type) {
            where.documentType = type;
        }
        // Fetch documents
        const documents = await prisma_1.prisma.document.findMany({
            where,
            // TODO: uploadedByUser relation doesn't exist in Prisma schema yet
            // include: {
            //   uploadedByUser: {
            //     select: {
            //       id: true,
            //       firstName: true,
            //       lastName: true,
            //       role: true,
            //     },
            //   },
            // },
            orderBy: {
                createdAt: 'desc', // Note: Document schema uses createdAt, not uploadedAt
            },
            take: limit,
        });
        // Group by type
        const documentsByType = documents.reduce((acc, doc) => {
            if (!acc[doc.documentType]) {
                acc[doc.documentType] = [];
            }
            acc[doc.documentType].push(doc);
            return acc;
        }, {});
        // Calculate total size
        const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
        logger_1.default.info({
            event: 'patient_documents_fetched',
            patientId: session.patientId,
            patientUserId: session.userId,
            count: documents.length,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                documents,
                summary: {
                    total: documents.length,
                    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                    byType: Object.keys(documentsByType).reduce((acc, type) => {
                        acc[type] = documentsByType[type].length;
                        return acc;
                    }, {}),
                },
                documentsByType,
            },
        }, { status: 200 });
    }
    catch (error) {
        // Check if it's an auth error
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
        logger_1.default.error({
            event: 'patient_documents_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar documentos.',
        }, { status: 500 });
    }
}
// TODO: POST handler disabled - needs schema update to match Prisma Document model
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
      patientUserId: session.userId,
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
//# sourceMappingURL=route.js.map