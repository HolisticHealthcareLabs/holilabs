"use strict";
/**
 * Pain Assessments API
 *
 * GET  /api/pain-assessments - List pain assessments for a patient
 * POST /api/pain-assessments - Create new pain assessment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
exports.dynamic = 'force-dynamic';
/**
 * GET /api/pain-assessments?patientId=xxx
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        const limit = parseInt(searchParams.get('limit') || '50');
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId is required' }, { status: 400 });
        }
        // Get pain assessments for patient
        const assessments = await prisma_1.prisma.painAssessment.findMany({
            where: { patientId },
            orderBy: { assessedAt: 'desc' },
            take: limit,
        });
        // Calculate pain trend
        const avgPainScore = assessments.length > 0
            ? assessments.reduce((sum, a) => sum + a.painScore, 0) / assessments.length
            : 0;
        return server_1.NextResponse.json({
            success: true,
            data: assessments,
            stats: {
                count: assessments.length,
                avgPainScore: Math.round(avgPainScore * 10) / 10,
                latestScore: assessments[0]?.painScore || 0,
            },
        });
    }
    catch (error) {
        console.error('Error fetching pain assessments:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch pain assessments', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * POST /api/pain-assessments
 */
const CreatePainAssessmentSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid(),
    painScore: zod_1.z.number().int().min(0).max(10),
    painType: zod_1.z.enum(['ACUTE', 'CHRONIC', 'BREAKTHROUGH', 'NEUROPATHIC', 'VISCERAL', 'SOMATIC']).optional(),
    location: zod_1.z.string().max(200).optional(),
    description: zod_1.z.string().max(2000).optional(),
    quality: zod_1.z.array(zod_1.z.string()).max(10),
    timing: zod_1.z.string().max(100).optional(),
    aggravatingFactors: zod_1.z.array(zod_1.z.string()).max(10),
    relievingFactors: zod_1.z.array(zod_1.z.string()).max(10),
    functionalImpact: zod_1.z.string().max(1000).optional(),
    sleepImpact: zod_1.z.string().max(500).optional(),
    moodImpact: zod_1.z.string().max(500).optional(),
    interventionsGiven: zod_1.z.array(zod_1.z.string()).max(20),
    responseToTreatment: zod_1.z.string().max(1000).optional(),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const validatedData = CreatePainAssessmentSchema.parse(body);
        const assessment = await prisma_1.prisma.painAssessment.create({
            data: {
                patientId: validatedData.patientId,
                painScore: validatedData.painScore,
                painType: validatedData.painType,
                location: validatedData.location,
                description: validatedData.description,
                quality: validatedData.quality,
                timing: validatedData.timing,
                aggravatingFactors: validatedData.aggravatingFactors,
                relievingFactors: validatedData.relievingFactors,
                functionalImpact: validatedData.functionalImpact,
                sleepImpact: validatedData.sleepImpact,
                moodImpact: validatedData.moodImpact,
                interventionsGiven: validatedData.interventionsGiven,
                responseToTreatment: validatedData.responseToTreatment,
                assessedAt: new Date(),
                assessedBy: context.user.id,
                notes: validatedData.notes,
            },
        });
        // Audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email || 'unknown',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'PainAssessment',
                resourceId: assessment.id,
                details: {
                    patientId: validatedData.patientId,
                    painScore: validatedData.painScore,
                },
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: assessment,
            message: 'Pain assessment recorded successfully',
        }, { status: 201 });
    }
    catch (error) {
        console.error('Error creating pain assessment:', error);
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({
                error: 'Validation failed',
                details: error.errors,
            }, { status: 400 });
        }
        return server_1.NextResponse.json({ error: 'Failed to create pain assessment', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
});
//# sourceMappingURL=route.js.map