"use strict";
/**
 * Audit Log API
 *
 * POST /api/audit - Create audit log entry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
// Force dynamic rendering - prevents build-time evaluation
exports.dynamic = 'force-dynamic';
/**
 * POST /api/audit
 * Create audit log entry for compliance
 */
async function POST(request) {
    try {
        const body = await request.json();
        const auditLog = await prisma_1.prisma.auditLog.create({
            data: {
                userEmail: body.userEmail || 'system',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: body.action,
                resource: body.resource,
                resourceId: body.resourceId || 'N/A',
                details: body.details,
                success: body.success !== false,
            },
        });
        return server_1.NextResponse.json({ success: true, data: auditLog }, { status: 201 });
    }
    catch (error) {
        console.error('Error creating audit log:', error);
        return server_1.NextResponse.json({ error: 'Failed to create audit log', details: error.message }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map