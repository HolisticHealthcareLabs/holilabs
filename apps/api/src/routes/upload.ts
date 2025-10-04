import { FastifyPluginAsync } from 'fastify';

const uploadRoutes: FastifyPluginAsync = async (server) => {
  server.post('/upload', async (request, reply) => {
    // Stub: Handle multipart upload, de-identify, store in MinIO
    return reply.send({ message: 'Upload endpoint - implement with multipart and de-ID' });
  });
};

export default uploadRoutes;
