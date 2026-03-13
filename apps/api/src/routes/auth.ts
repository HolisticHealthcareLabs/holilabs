import { FastifyPluginAsync } from 'fastify';
// import { hash, verify } from 'argon2';
// import { SignJWT } from 'jose';
// import { z } from 'zod';
// import { prisma } from '../index';

// TODO: This file uses legacy authentication schema that conflicts with production
// Production uses Supabase authentication, not passwordHash on User model
// This code needs to be refactored to work with Supabase or removed

const authRoutes: FastifyPluginAsync = async (server) => {
  server.post('/login', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(501).send({ error: 'Legacy auth disabled in production. Use NextAuth.' });
    }

    const { email, password } = request.body as any;

    if (email === 'admin@holilabs.io' && password === 'admin') {
      return reply.send({
        token: 'holi-admin-token-' + Date.now(),
        user: { name: 'Admin User', email }
      });
    }

    if (email === 'demo-clinician@holilabs.xyz' && password === 'Demo123!@#') {
      return reply.send({
        token: 'holi-demo-token-' + Date.now(),
        user: { name: 'Dr. Demo', email }
      });
    }

    return reply.code(401).send({ error: 'Invalid credentials' });
  });

  server.get('/health', async (request, reply) => {
    return reply.send({ status: 'ok', mode: 'MVP_SIMPLE_AUTH' });
  });
};

export default authRoutes;
