import { FastifyPluginAsync } from 'fastify';

const aiRoutes: FastifyPluginAsync = async (server) => {
  server.post('/care/infer', async (request, reply) => {
    // Stub: AI inference with input sanitization and output scrubbing
    return reply.send({ message: 'AI inference endpoint - implement with model integration' });
  });
};

export default aiRoutes;
