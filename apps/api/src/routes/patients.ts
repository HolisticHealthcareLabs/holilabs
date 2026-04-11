import { FastifyPluginAsync } from 'fastify';

/**
 * Patient routes — Fastify API server
 *
 * Patient CRUD is handled by the Next.js web app (apps/web/src/app/api/patients/).
 * This server only exposes a health check; patient queries are rejected
 * with a pointer to the correct endpoint.
 */

const patientRoutes: FastifyPluginAsync = async (server) => {
  server.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      message: 'Patient API served by Next.js at /api/patients',
    });
  });

  server.all('/*', async (_request, reply) => {
    return reply.code(410).send({
      error: 'Patient routes moved',
      message: 'Patient API is served by the Next.js app at /api/patients.',
    });
  });
};

export default patientRoutes;
