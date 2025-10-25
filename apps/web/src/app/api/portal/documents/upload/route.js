"use strict";
/**
 * Document Upload API
 * Handles file uploads with validation, hash generation, and storage
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Allowed file types
const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const uploadSchema = zod_1.z.object({
    documentType: zod_1.z.enum([
        'LAB_RESULTS',
        'IMAGING',
        'CONSULTATION_NOTES',
        'DISCHARGE_SUMMARY',
        'PRESCRIPTION',
        'INSURANCE',
        'CONSENT_FORM',
        'OTHER',
    ]),
});
async function POST(request) {
    try {
        // Get authenticated patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file');
        const documentType = formData.get('documentType');
        // Validate inputs
        if (!file) {
            return server_1.NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }
        // Validate document type
        const validatedData = uploadSchema.parse({ documentType });
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return server_1.NextResponse.json({
                success: false,
                error: 'File too large. Maximum size is 10MB',
            }, { status: 400 });
        }
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX',
            }, { status: 400 });
        }
        // Read file buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        // Generate SHA-256 hash of file content
        const documentHash = crypto_1.default.createHash('sha256').update(buffer).digest('hex');
        // Check for duplicate (same hash)
        const existingDoc = await prisma_1.prisma.document.findFirst({
            where: {
                documentHash,
                patientId: session.patientId,
            },
        });
        if (existingDoc) {
            return server_1.NextResponse.json({
                success: false,
                error: 'This document has already been uploaded',
                documentId: existingDoc.id,
            }, { status: 409 });
        }
        // Create uploads directory if it doesn't exist
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'documents', session.patientId);
        await (0, promises_1.mkdir)(uploadsDir, { recursive: true });
        // Generate unique filename
        const fileExtension = path_1.default.extname(file.name);
        const timestamp = Date.now();
        const randomString = crypto_1.default.randomBytes(8).toString('hex');
        const uniqueFileName = `${timestamp}-${randomString}${fileExtension}`;
        const filePath = path_1.default.join(uploadsDir, uniqueFileName);
        // Save file to disk
        await (0, promises_1.writeFile)(filePath, buffer);
        // Create relative path for storage URL
        const storageUrl = `/uploads/documents/${session.patientId}/${uniqueFileName}`;
        // Get file type extension
        const fileType = fileExtension.replace('.', '').toLowerCase();
        // Create document record in database
        const document = await prisma_1.prisma.document.create({
            data: {
                patientId: session.patientId,
                documentHash,
                fileName: file.name,
                fileType,
                fileSize: file.size,
                storageUrl,
                documentType: validatedData.documentType,
                isDeidentified: false,
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: session.userId,
                action: 'DOCUMENT_UPLOADED',
                resource: 'DOCUMENT',
                resourceId: document.id,
                details: {
                    fileName: file.name,
                    fileSize: file.size,
                    documentType: validatedData.documentType,
                },
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
            },
        });
        // Create notification for patient
        await prisma_1.prisma.notification.create({
            data: {
                recipientId: session.patientId,
                recipientType: 'PATIENT',
                type: 'NEW_DOCUMENT',
                title: 'Documento subido exitosamente',
                message: `Tu documento "${file.name}" ha sido subido correctamente`,
                priority: 'NORMAL',
                actionUrl: `/portal/dashboard/documents`,
                actionLabel: 'Ver documento',
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                document: {
                    id: document.id,
                    fileName: document.fileName,
                    fileType: document.fileType,
                    fileSize: document.fileSize,
                    documentType: document.documentType,
                    documentHash: document.documentHash,
                    createdAt: document.createdAt,
                },
            },
            message: 'Document uploaded successfully',
        });
    }
    catch (error) {
        console.error('Document upload error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid document type',
                details: error.errors,
            }, { status: 400 });
        }
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to upload document',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map