"use strict";
/**
 * Patient Document Upload API
 *
 * Handles file upload with encryption and cloud storage
 *
 * POST /api/upload/patient-document
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const encryption_1 = require("@/lib/encryption");
const r2_client_1 = require("@/lib/storage/r2-client");
exports.dynamic = 'force-dynamic';
// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const patientId = formData.get('patientId');
        const category = formData.get('category') || 'other';
        const description = formData.get('description');
        // Validate inputs
        if (!file) {
            return server_1.NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
        }
        // Validate patient exists
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: patientId },
        });
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }
        // Validate file type
        if (!(0, encryption_1.isAllowedFileType)(file.name)) {
            return server_1.NextResponse.json({ error: 'File type not allowed. Supported: PDF, Images, Word, Excel, Text' }, { status: 400 });
        }
        // Validate file size
        if (!(0, encryption_1.isAllowedFileSize)(file.size, 50)) {
            return server_1.NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
        }
        // Read file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Generate file hash (for deduplication and integrity)
        const fileHash = (0, encryption_1.hashFile)(buffer);
        // Check if file already exists for this patient
        const existingDocument = await prisma_1.prisma.document.findFirst({
            where: {
                patientId,
                documentHash: fileHash,
            },
        });
        if (existingDocument) {
            return server_1.NextResponse.json({ error: 'This file has already been uploaded for this patient' }, { status: 409 });
        }
        // Encrypt file
        const encryptedBuffer = (0, encryption_1.encryptFile)(buffer);
        // Generate unique file ID and storage key
        const fileId = (0, encryption_1.generateFileId)();
        const extension = (0, encryption_1.getFileExtension)(file.name);
        const storageKey = (0, r2_client_1.generateStorageKey)(patientId, fileId, extension);
        // Upload to R2
        await (0, r2_client_1.uploadToR2)(storageKey, encryptedBuffer, file.type, {
            originalName: (0, encryption_1.sanitizeFilename)(file.name),
            patientId,
            category,
            fileHash,
        });
        // Map category to DocumentType enum
        const documentTypeMap = {
            lab_results: 'LAB_RESULTS',
            imaging: 'IMAGING',
            consultation_notes: 'CONSULTATION_NOTES',
            discharge_summary: 'DISCHARGE_SUMMARY',
            prescriptions: 'PRESCRIPTION',
            insurance: 'INSURANCE',
            consent_form: 'CONSENT_FORM',
            other: 'OTHER',
        };
        const documentType = documentTypeMap[category] || 'OTHER';
        // Save document record to database
        const document = await prisma_1.prisma.document.create({
            data: {
                patientId,
                fileName: (0, encryption_1.sanitizeFilename)(file.name),
                fileType: extension,
                fileSize: file.size,
                documentHash: fileHash,
                storageUrl: storageKey,
                documentType: documentType,
                uploadedBy: 'clinician', // TODO: Get from session
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: 'system', // TODO: Get from session
                action: 'CREATE',
                resource: 'Document',
                resourceId: document.id,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
                details: {
                    patientId,
                    fileName: file.name,
                    fileSize: file.size,
                    category,
                },
            },
        });
        return server_1.NextResponse.json({
            success: true,
            file: {
                id: document.id,
                name: document.fileName,
                size: document.fileSize,
                type: document.fileType,
                category,
                uploadedAt: document.createdAt,
            },
        }, { status: 201 });
    }
    catch (error) {
        console.error('Document upload error:', error);
        return server_1.NextResponse.json({
            error: 'Failed to upload document',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map