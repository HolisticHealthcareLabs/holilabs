"use strict";
/**
 * Lab Results API
 * HIPAA-compliant lab result management
 *
 * GET /api/lab-results - List lab results for a patient
 * POST /api/lab-results - Create new lab result
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
 * GET /api/lab-results
 * List lab results for a patient
 * Query params: patientId (required), status, isAbnormal, isCritical
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        const status = searchParams.get('status');
        const isAbnormal = searchParams.get('isAbnormal');
        const isCritical = searchParams.get('isCritical');
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId query parameter is required' }, { status: 400 });
        }
        // Build filter
        const where = { patientId };
        if (status) {
            where.status = status;
        }
        if (isAbnormal !== null) {
            where.isAbnormal = isAbnormal === 'true';
        }
        if (isCritical !== null) {
            where.isCritical = isCritical === 'true';
        }
        // Fetch results
        const labResults = await prisma_1.prisma.labResult.findMany({
            where,
            orderBy: { resultDate: 'desc' },
        });
        return server_1.NextResponse.json({
            success: true,
            data: labResults,
        });
    }
    catch (error) {
        console.error('Error fetching lab results:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch lab results', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * POST /api/lab-results
 * Create new lab result
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const { patientId, testName, testCode, category, orderingDoctor, performingLab, value, unit, referenceRange, status = 'PRELIMINARY', interpretation, isAbnormal = false, isCritical = false, orderedDate, collectedDate, resultDate, notes, attachmentUrl, } = body;
        // Validate required fields
        if (!patientId || !testName || !resultDate) {
            return server_1.NextResponse.json({ error: 'Missing required fields: patientId, testName, resultDate' }, { status: 400 });
        }
        // Calculate hash for blockchain integrity
        const resultData = JSON.stringify({
            patientId,
            testName,
            testCode,
            value,
            unit,
            resultDate,
        });
        const resultHash = crypto_1.default.createHash('sha256').update(resultData).digest('hex');
        // Create lab result
        const labResult = await prisma_1.prisma.labResult.create({
            data: {
                patientId,
                testName,
                testCode,
                category,
                orderingDoctor,
                performingLab,
                value,
                unit,
                referenceRange,
                status,
                interpretation,
                isAbnormal,
                isCritical,
                orderedDate: orderedDate ? new Date(orderedDate) : null,
                collectedDate: collectedDate ? new Date(collectedDate) : null,
                resultDate: new Date(resultDate),
                notes,
                attachmentUrl,
                resultHash,
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email || 'unknown',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'LabResult',
                resourceId: labResult.id,
                details: {
                    patientId,
                    testName,
                    status,
                },
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: labResult,
        });
    }
    catch (error) {
        console.error('Error creating lab result:', error);
        return server_1.NextResponse.json({ error: 'Failed to create lab result', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
});
//# sourceMappingURL=route.js.map