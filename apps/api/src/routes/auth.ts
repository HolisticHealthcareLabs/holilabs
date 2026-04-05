import { FastifyPluginAsync } from 'fastify';

/**
 * Auth routes — Fastify API server
 *
 * Production auth is handled by NextAuth (apps/web).
 * This server only exposes a health check; login attempts are rejected
 * with a pointer to the correct auth endpoint.
 */

const authRoutes: FastifyPluginAsync = async (server) => {
  server.post('/login', async (_request, reply) => {
    return reply.code(410).send({
      error: 'Legacy auth removed',
      message: 'Use NextAuth at /api/auth/signin for authentication.',
    });
  });

  server.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', mode: 'NEXTAUTH_DELEGATED' });
  });
};

export default authRoutes;
