// @ts-nocheck
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index';

const adminRoutes: FastifyPluginAsync = async (server) => {
  server.get('/audit/events', async (request, reply) => {
    // TODO: Filter by organization when organizationId is added to AuditLog model
    const events = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return reply.send({ events });
  });
};

export default adminRoutes;
