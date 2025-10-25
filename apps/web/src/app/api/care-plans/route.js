"use strict";
/**
 * Care Plans API
 *
 * GET  /api/care-plans - List care plans for a patient
 * POST /api/care-plans - Create new care plan
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
exports.dynamic = 'force-dynamic';
/**
 * GET /api/care-plans?patientId=xxx
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId is required' }, { status: 400 });
        }
        // Get all care plans for patient
        const carePlans = await prisma_1.prisma.carePlan.findMany({
            where: { patientId },
            orderBy: [
                { status: 'asc' }, // ACTIVE first
                { createdAt: 'desc' },
            ],
        });
        return server_1.NextResponse.json({
            success: true,
            data: carePlans,
        });
    }
    catch (error) {
        console.error('Error fetching care plans:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch care plans', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * POST /api/care-plans
 */
const CreateCarePlanSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(2000).optional(),
    category: zod_1.z.enum([
        'PAIN_MANAGEMENT',
        'SYMPTOM_CONTROL',
        'PSYCHOSOCIAL_SUPPORT',
        'SPIRITUAL_CARE',
        'FAMILY_SUPPORT',
        'QUALITY_OF_LIFE',
        'END_OF_LIFE_PLANNING',
        'MOBILITY',
        'NUTRITION',
        'WOUND_CARE',
    ]),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    goals: zod_1.z.array(zod_1.z.string()).min(1).max(10),
    targetDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    assignedTeam: zod_1.z.array(zod_1.z.string().cuid()).max(20),
});
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const validatedData = CreateCarePlanSchema.parse(body);
        const carePlan = await prisma_1.prisma.carePlan.create({
            data: {
                patientId: validatedData.patientId,
                title: validatedData.title,
                description: validatedData.description,
                category: validatedData.category,
                priority: validatedData.priority,
                goals: validatedData.goals,
                targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
                status: 'ACTIVE',
                assignedTeam: validatedData.assignedTeam,
                progressNotes: [],
                createdBy: context.user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        // Audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email || 'unknown',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'CarePlan',
                resourceId: carePlan.id,
                details: {
                    patientId: validatedData.patientId,
                    category: validatedData.category,
                    title: validatedData.title,
                },
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: carePlan,
            message: 'Care plan created successfully',
        }, { status: 201 });
    }
    catch (error) {
        console.error('Error creating care plan:', error);
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({
                error: 'Validation failed',
                details: error.errors,
            }, { status: 400 });
        }
        return server_1.NextResponse.json({ error: 'Failed to create care plan', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
});
//# sourceMappingURL=route.js.map