"use strict";
/**
 * Sent Forms API
 *
 * GET /api/forms/sent - List all sent form instances
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const where = status && status !== 'all' ? { status: status } : {};
        const forms = await prisma_1.prisma.formInstance.findMany({
            where,
            orderBy: { sentAt: 'desc' },
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
                        category: true,
                    },
                },
            },
        });
        return server_1.NextResponse.json({ success: true, forms }, { status: 200 });
    }
    catch (error) {
        console.error('Error fetching sent forms:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch sent forms' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map