"use strict";
/**
 * Medical Record Sharing API
 *
 * POST /api/portal/records/[id]/share
 * Create a secure, time-limited share link for a medical record
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
// Share request schema
const ShareRequestSchema = zod_1.z.object({
    recipientEmail: zod_1.z.string().email().optional(),
    recipientPhone: zod_1.z.string().optional(),
    recipientName: zod_1.z.string().optional(),
    purpose: zod_1.z.string().optional(),
    expiresInHours: zod_1.z.number().int().min(1).max(720).default(72), // Default 3 days, max 30 days
    maxAccesses: zod_1.z.number().int().min(1).max(100).optional(),
    allowDownload: zod_1.z.boolean().default(true),
    requirePassword: zod_1.z.boolean().default(false),
    password: zod_1.z.string().min(6).optional(),
});
async function POST(request, { params }) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        const recordId = params.id;
        // Verify record exists and belongs to patient
        const record = await prisma_1.prisma.sOAPNote.findUnique({
            where: { id: recordId },
            select: {
                id: true,
                patientId: true,
                chiefComplaint: true,
            },
        });
        if (!record) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Registro no encontrado.',
            }, { status: 404 });
        }
        if (record.patientId !== session.patientId) {
            logger_1.default.warn({
                event: 'unauthorized_share_attempt',
                patientUserId: session.userId,
                requestedPatientId: record.patientId,
                recordId,
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado para compartir este registro.',
            }, { status: 403 });
        }
        // Parse and validate request body
        const body = await request.json();
        const validation = ShareRequestSchema.safeParse(body);
        if (!validation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Parámetros inválidos',
                details: validation.error.errors,
            }, { status: 400 });
        }
        const { recipientEmail, recipientPhone, recipientName, purpose, expiresInHours, maxAccesses, allowDownload, requirePassword, password, } = validation.data;
        // Generate share token
        const shareToken = crypto_1.default.randomBytes(32).toString('hex');
        // Hash the token for storage (for security)
        const shareTokenHash = crypto_1.default
            .createHash('sha256')
            .update(shareToken)
            .digest('hex');
        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresInHours);
        // Hash password if provided
        let passwordHash = null;
        if (requirePassword && password) {
            passwordHash = crypto_1.default
                .createHash('sha256')
                .update(password)
                .digest('hex');
        }
        // Create share record
        const share = await prisma_1.prisma.documentShare.create({
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
        // Log share creation for HIPAA compliance
        logger_1.default.info({
            event: 'medical_record_shared',
            patientId: session.patientId,
            patientUserId: session.userId,
            recordId,
            shareId: share.id,
            recipientEmail,
            expiresAt,
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                shareId: share.id,
                shareUrl,
                shareToken,
                expiresAt: share.expiresAt,
                maxAccesses: share.maxAccesses,
                recipientEmail: share.recipientEmail,
            },
        }, { status: 201 });
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
            event: 'medical_record_share_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            recordId: params.id,
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al crear enlace de compartir.',
        }, { status: 500 });
    }
}
// GET - List all active shares for a record
async function GET(request, { params }) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        const recordId = params.id;
        // Verify record belongs to patient
        const record = await prisma_1.prisma.sOAPNote.findUnique({
            where: { id: recordId },
            select: {
                id: true,
                patientId: true,
            },
        });
        if (!record) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Registro no encontrado.',
            }, { status: 404 });
        }
        if (record.patientId !== session.patientId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado.',
            }, { status: 403 });
        }
        // Get all active shares for this record
        const shares = await prisma_1.prisma.documentShare.findMany({
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
        return server_1.NextResponse.json({
            success: true,
            data: shares,
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'list_shares_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            recordId: params.id,
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al listar enlaces de compartir.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map