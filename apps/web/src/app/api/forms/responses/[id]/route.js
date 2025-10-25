"use strict";
/**
 * Form Responses API
 *
 * GET /api/forms/responses/[id] - Get form responses for a specific form instance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
async function GET(request, { params }) {
    try {
        const { id } = params;
        const formInstance = await prisma_1.prisma.formInstance.findUnique({
            where: { id },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                template: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        structure: true,
                    },
                },
            },
        });
        if (!formInstance) {
            return server_1.NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }
        // Check if form is completed
        if (formInstance.status !== 'SIGNED' && formInstance.status !== 'COMPLETED') {
            return server_1.NextResponse.json({ error: 'Form has not been completed yet' }, { status: 400 });
        }
        return server_1.NextResponse.json({
            success: true,
            form: {
                id: formInstance.id,
                status: formInstance.status,
                progressPercent: formInstance.progressPercent,
                responses: formInstance.responses,
                signatureDataUrl: formInstance.signatureDataUrl,
                completedAt: formInstance.completedAt,
                patient: formInstance.patient,
                template: formInstance.template,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error('Error fetching form responses:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch form responses' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map