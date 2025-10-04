import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { pseudonymize } from '@vidabanq/deid';

const CreateTokenSchema = z.object({
  subjectKeys: z.array(z.string()),
});

const patientRoutes: FastifyPluginAsync = async (server) => {
  // Create patient token (pseudonymization)
  server.post('/create_token', async (request, reply) => {
    try {
      const body = CreateTokenSchema.parse(request.body);
      const saltKey = process.env.SALT_ROTATION_KEY || 'default-salt';

      // Pseudonymize
      const { tokenId, pointerHash } = pseudonymize(body.subjectKeys, saltKey);

      // Get org from auth (stub - in production, extract from JWT)
      const orgId = 'demo-org-id';

      // Create patient token
      const patientToken = await prisma.patientToken.create({
        data: {
          id: tokenId,
          orgId,
          pointerHash,
          policyVersion: 'MVP-1.2',
        },
      });

      // Create subject index
      await prisma.subjectIndex.create({
        data: {
          patientTokenId: patientToken.id,
          orgId,
        },
      });

      return reply.send({ patientTokenId: patientToken.id });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // List patients
  server.get('/', async (request, reply) => {
    const orgId = 'demo-org-id'; // From JWT in production

    const patients = await prisma.patientToken.findMany({
      where: { orgId },
      include: {
        datasets: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send({ patients });
  });

  // Get patient details
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const patient = await prisma.patientToken.findUnique({
      where: { id },
      include: {
        datasets: true,
        consents: true,
      },
    });

    if (!patient) {
      return reply.code(404).send({ error: 'Patient not found' });
    }

    return reply.send({ patient });
  });
};

export default patientRoutes;
