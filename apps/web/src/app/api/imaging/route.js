"use strict";
/**
 * Imaging Studies API
 * HIPAA-compliant imaging management
 *
 * GET /api/imaging - List imaging studies for a patient
 * POST /api/imaging - Create new imaging study
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
const crypto_1 = __importDefault(require("crypto"));
exports.dynamic = 'force-dynamic';
/**
 * GET /api/imaging
 * List imaging studies for a patient
 * Query params: patientId (required), modality, status, isAbnormal
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        const modality = searchParams.get('modality');
        const status = searchParams.get('status');
        const isAbnormal = searchParams.get('isAbnormal');
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId query parameter is required' }, { status: 400 });
        }
        // Build filter
        const where = { patientId };
        if (modality) {
            where.modality = modality;
        }
        if (status) {
            where.status = status;
        }
        if (isAbnormal !== null) {
            where.isAbnormal = isAbnormal === 'true';
        }
        // Fetch studies
        const imagingStudies = await prisma_1.prisma.imagingStudy.findMany({
            where,
            orderBy: { studyDate: 'desc' },
        });
        return server_1.NextResponse.json({
            success: true,
            data: imagingStudies,
        });
    }
    catch (error) {
        console.error('Error fetching imaging studies:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch imaging studies', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * POST /api/imaging
 * Create new imaging study
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const { patientId, studyInstanceUID, accessionNumber, modality, bodyPart, description, indication, status = 'SCHEDULED', orderingDoctor, referringDoctor, performingFacility, imageCount = 0, imageUrls = [], thumbnailUrl, reportUrl, findings, impression, isAbnormal = false, scheduledDate, studyDate, reportDate, technician, radiologist, notes, } = body;
        // Validate required fields
        if (!patientId || !modality || !bodyPart || !description || !studyDate) {
            return server_1.NextResponse.json({ error: 'Missing required fields: patientId, modality, bodyPart, description, studyDate' }, { status: 400 });
        }
        // Calculate hash for blockchain integrity
        const studyData = JSON.stringify({
            patientId,
            studyInstanceUID,
            modality,
            bodyPart,
            studyDate,
        });
        const studyHash = crypto_1.default.createHash('sha256').update(studyData).digest('hex');
        // Create imaging study
        const imagingStudy = await prisma_1.prisma.imagingStudy.create({
            data: {
                patientId,
                studyInstanceUID,
                accessionNumber,
                modality,
                bodyPart,
                description,
                indication,
                status,
                orderingDoctor,
                referringDoctor,
                performingFacility,
                imageCount,
                imageUrls,
                thumbnailUrl,
                reportUrl,
                findings,
                impression,
                isAbnormal,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                studyDate: new Date(studyDate),
                reportDate: reportDate ? new Date(reportDate) : null,
                technician,
                radiologist,
                notes,
                studyHash,
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email || 'unknown',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'ImagingStudy',
                resourceId: imagingStudy.id,
                details: {
                    patientId,
                    modality,
                    bodyPart,
                    status,
                },
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: imagingStudy,
        });
    }
    catch (error) {
        console.error('Error creating imaging study:', error);
        return server_1.NextResponse.json({ error: 'Failed to create imaging study', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
});
//# sourceMappingURL=route.js.map