import { FastifyPluginAsync } from 'fastify';
// import { hash, verify } from 'argon2';
// import { SignJWT } from 'jose';
// import { z } from 'zod';
// import { prisma } from '../index';

// TODO: This file uses legacy authentication schema that conflicts with production
// Production uses Supabase authentication, not passwordHash on User model
// This code needs to be refactored to work with Supabase or removed

const authRoutes: FastifyPluginAsync = async (server) => {
  // MVP: Simple hardcoded auth for "Ghost" demo
  server.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;

    // Hardcoded credentials for MVP
    if (email === 'admin@holilabs.io' && password === 'admin') {
      return reply.send({
        token: 'holi-admin-token-' + Date.now(),
        user: { name: 'Admin User', email }
      });
    }

    // Also allow the demo clinician
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
