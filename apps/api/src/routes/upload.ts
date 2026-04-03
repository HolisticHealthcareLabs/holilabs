import { FastifyPluginAsync } from 'fastify';

/**
 * Upload routes — Fastify API server
 *
 * File uploads are handled by the Next.js web app (apps/web/src/app/api/upload/).
 * This server only exposes a health check; upload requests are rejected
 * with a pointer to the correct endpoint.
 */

const uploadRoutes: FastifyPluginAsync = async (server) => {
  server.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      message: 'Upload API served by Next.js at /api/upload',
    });
  });

  server.all('/*', async (_request, reply) => {
    return reply.code(410).send({
      error: 'Upload routes moved',
      message: 'File uploads are served by the Next.js app at /api/upload/',
    });
  });
};

export default uploadRoutes;
