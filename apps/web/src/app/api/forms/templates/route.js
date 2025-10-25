"use strict";
/**
 * Form Templates API
 *
 * GET /api/forms/templates - List all form templates
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
        const category = searchParams.get('category');
        const where = category && category !== 'all' ? { category: category, isActive: true } : { isActive: true };
        const templates = await prisma_1.prisma.formTemplate.findMany({
            where,
            orderBy: [{ isBuiltIn: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                estimatedMinutes: true,
                usageCount: true,
                isBuiltIn: true,
                tags: true,
                createdAt: true,
            },
        });
        return server_1.NextResponse.json({ success: true, templates }, { status: 200 });
    }
    catch (error) {
        console.error('Error fetching form templates:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch form templates' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map