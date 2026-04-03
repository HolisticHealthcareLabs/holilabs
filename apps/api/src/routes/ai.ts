import { FastifyPluginAsync } from 'fastify';

/**
 * AI routes — Fastify API server
 *
 * AI inference is handled by the Next.js web app (apps/web/src/app/api/ai/).
 * This server only exposes a health check; inference requests are rejected
 * with a pointer to the correct endpoint.
 */

const aiRoutes: FastifyPluginAsync = async (server) => {
  server.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      message: 'AI API served by Next.js at /api/ai',
    });
  });

  server.all('/*', async (_request, reply) => {
    return reply.code(410).send({
      error: 'AI routes moved',
      message: 'AI inference is served by the Next.js app at /api/ai/',
    });
  });
};

export default aiRoutes;
