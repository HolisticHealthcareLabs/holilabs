import { FastifyPluginAsync } from 'fastify';

/**
 * Export routes — Fastify API server
 *
 * Data exports are handled by the Next.js web app (apps/web/src/app/api/exports/).
 * This server only exposes a health check; export requests are rejected
 * with a pointer to the correct endpoint.
 */

const exportRoutes: FastifyPluginAsync = async (server) => {
  server.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      message: 'Exports API served by Next.js at /api/exports',
    });
  });

  server.all('/*', async (_request, reply) => {
    return reply.code(410).send({
      error: 'Export routes moved',
      message: 'Data exports are served by the Next.js app at /api/exports/',
    });
  });
};

export default exportRoutes;
