"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const adminRoutes = async (server) => {
    server.get('/audit/events', async (request, reply) => {
        const orgId = 'demo-org-id'; // From JWT
        const events = await index_1.prisma.auditEvent.findMany({
            where: { orgId },
            orderBy: { ts: 'desc' },
            take: 100,
        });
        return reply.send({ events });
    });
};
exports.default = adminRoutes;
//# sourceMappingURL=admin.js.map