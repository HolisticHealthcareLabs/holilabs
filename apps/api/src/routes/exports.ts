import { FastifyPluginAsync } from 'fastify';

const exportRoutes: FastifyPluginAsync = async (server) => {
  server.post('/request', async (request, reply) => {
    // Stub: DP export request with epsilon accounting
    return reply.send({ message: 'Export request endpoint - implement with DP accountant' });
  });
};

export default exportRoutes;
