"use strict";
/**
 * Public Form Access API
 *
 * GET /api/forms/public/[token] - Patient accesses form
 * POST /api/forms/public/[token] - Save progress (auto-save)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
async function GET(request, { params }) {
    try {
        const { token } = params;
        // Find form instance by access token
        const formInstance = await prisma_1.prisma.formInstance.findUnique({
            where: { accessToken: token },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                template: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        structure: true,
                        estimatedMinutes: true,
                    },
                },
            },
        });
        if (!formInstance) {
            return server_1.NextResponse.json({ error: 'Form not found or expired' }, { status: 404 });
        }
        // Check if form is expired
        if (new Date() > new Date(formInstance.expiresAt)) {
            return server_1.NextResponse.json({ error: 'This form has expired' }, { status: 410 });
        }
        // Check if form is already completed
        if (formInstance.status === 'SIGNED' || formInstance.status === 'COMPLETED') {
            return server_1.NextResponse.json({ error: 'This form has already been completed' }, { status: 410 });
        }
        // Check if form is revoked
        if (formInstance.status === 'REVOKED') {
            return server_1.NextResponse.json({ error: 'This form has been revoked' }, { status: 410 });
        }
        // Update status to VIEWED if it's the first time
        if (formInstance.status === 'PENDING') {
            await prisma_1.prisma.formInstance.update({
                where: { id: formInstance.id },
                data: {
                    status: 'VIEWED',
                    viewedAt: new Date(),
                },
            });
            // Create audit log
            await prisma_1.prisma.formAuditLog.create({
                data: {
                    formInstanceId: formInstance.id,
                    event: 'VIEWED',
                    userType: 'patient',
                    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown',
                    metadata: {},
                },
            });
        }
        return server_1.NextResponse.json({
            success: true,
            form: {
                id: formInstance.id,
                template: formInstance.template,
                patient: formInstance.patient,
                status: formInstance.status,
                responses: formInstance.responses,
                expiresAt: formInstance.expiresAt,
                currentStepIndex: formInstance.currentStepIndex,
                progressPercent: formInstance.progressPercent,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error('Error fetching public form:', error);
        return server_1.NextResponse.json({ error: 'Failed to load form' }, { status: 500 });
    }
}
async function POST(request, { params }) {
    try {
        const { token } = params;
        const body = await request.json();
        const { responses, progress } = body;
        // Find form instance
        const formInstance = await prisma_1.prisma.formInstance.findUnique({
            where: { accessToken: token },
        });
        if (!formInstance) {
            return server_1.NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }
        // Check if expired
        if (new Date() > new Date(formInstance.expiresAt)) {
            return server_1.NextResponse.json({ error: 'Form has expired' }, { status: 410 });
        }
        // Update form instance with progress
        await prisma_1.prisma.formInstance.update({
            where: { id: formInstance.id },
            data: {
                responses,
                progressPercent: progress,
                status: progress > 0 ? 'IN_PROGRESS' : formInstance.status,
            },
        });
        // Create audit log for progress update
        await prisma_1.prisma.formAuditLog.create({
            data: {
                formInstanceId: formInstance.id,
                event: 'PROGRESS_SAVED',
                userType: 'patient',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
                metadata: { progress },
            },
        });
        return server_1.NextResponse.json({ success: true, message: 'Progress saved' }, { status: 200 });
    }
    catch (error) {
        console.error('Error saving form progress:', error);
        return server_1.NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map