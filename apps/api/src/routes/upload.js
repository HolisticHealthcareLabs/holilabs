"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uploadRoutes = async (server) => {
    server.post('/upload', async (request, reply) => {
        // Stub: Handle multipart upload, de-identify, store in MinIO
        return reply.send({ message: 'Upload endpoint - implement with multipart and de-ID' });
    });
};
exports.default = uploadRoutes;
//# sourceMappingURL=upload.js.map