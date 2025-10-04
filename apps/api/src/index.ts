import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';

// Routes
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import patientRoutes from './routes/patients';
import aiRoutes from './routes/ai';
import exportRoutes from './routes/exports';
import adminRoutes from './routes/admin';

const prisma = new PrismaClient();

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.email',
        '*.ssn',
        '*.cpf',
        '*.curp',
        '*.dni',
      ],
      remove: true,
    },
  },
});

async function start() {
  try {
    // Register plugins
    await server.register(cors, {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    });

    await server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    });

    await server.register(multipart, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    });

    await server.register(rateLimit, {
      max: 100,
      timeWindow: '15 minutes',
      redis: process.env.REDIS_URL,
    });

    // Health check
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register routes
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(uploadRoutes, { prefix: '/ingest' });
    await server.register(patientRoutes, { prefix: '/patients' });
    await server.register(aiRoutes, { prefix: '/ai' });
    await server.register(exportRoutes, { prefix: '/exports' });
    await server.register(adminRoutes, { prefix: '/admin' });

    // Start server
    const port = parseInt(process.env.API_PORT || '3001', 10);
    const host = process.env.API_HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`🚀 API server listening on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
});

start();

export { server, prisma };
