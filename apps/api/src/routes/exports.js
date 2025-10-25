"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exportRoutes = async (server) => {
    server.post('/request', async (request, reply) => {
        // Stub: DP export request with epsilon accounting
        return reply.send({ message: 'Export request endpoint - implement with DP accountant' });
    });
};
exports.default = exportRoutes;
//# sourceMappingURL=exports.js.map