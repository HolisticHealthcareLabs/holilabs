import { FastifyPluginAsync } from 'fastify';
// import { z } from 'zod';
// import { prisma } from '../index';
// import { pseudonymize } from '@holi/deid';

// TODO: This file references PatientToken and SubjectIndex models that don't exist in production schema
// The production schema uses Patient model directly
// This de-identification layer needs to be refactored or removed

const patientRoutes: FastifyPluginAsync = async (server) => {
  // Placeholder - patient routes disabled until schema alignment
  server.get('/health', async (request, reply) => {
    return reply.send({ status: 'ok', message: 'Patient routes disabled - schema mismatch' });
  });
};

export default patientRoutes;
