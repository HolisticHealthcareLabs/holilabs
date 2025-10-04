import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index';

const adminRoutes: FastifyPluginAsync = async (server) => {
  server.get('/audit/events', async (request, reply) => {
    const orgId = 'demo-org-id'; // From JWT

    const events = await prisma.auditEvent.findMany({
      where: { orgId },
      orderBy: { ts: 'desc' },
      take: 100,
    });

    return reply.send({ events });
  });
};

export default adminRoutes;
