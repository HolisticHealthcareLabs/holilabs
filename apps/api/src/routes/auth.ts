import { FastifyPluginAsync } from 'fastify';
// import { hash, verify } from 'argon2';
// import { SignJWT } from 'jose';
// import { z } from 'zod';
// import { prisma } from '../index';

// TODO: This file uses legacy authentication schema that conflicts with production
// Production uses Supabase authentication, not passwordHash on User model
// This code needs to be refactored to work with Supabase or removed

const authRoutes: FastifyPluginAsync = async (server) => {
  // Placeholder - authentication is handled by Supabase in production
  server.get('/health', async (request, reply) => {
    return reply.send({ status: 'ok', message: 'Auth module disabled - using Supabase' });
  });
};

export default authRoutes;
