/**
 * System Health Check Endpoint
 *
 * GET /api/health/system - Comprehensive system health validation
 * Tests all critical services: Database, Storage, Deepgram, Anthropic, Sentry
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'error';
  configured: boolean;
  message?: string;
  details?: any;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  services: {
    database: ServiceHealth;
    storage: ServiceHealth;
    deepgram: ServiceHealth;
    anthropic: ServiceHealth;
    sentry: ServiceHealth;
    encryption: ServiceHealth;
    presidio: ServiceHealth;
  };
  summary: {
    healthy: number;
    degraded: number;
    error: number;
    total: number;
  };
}

async function checkUrl(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, status: 0, body: e?.message || 'request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const startTime = Date.now();
  const health: SystemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'healthy', configured: false },
      storage: { status: 'healthy', configured: false },
      deepgram: { status: 'healthy', configured: false },
      anthropic: { status: 'healthy', configured: false },
      sentry: { status: 'healthy', configured: false },
      encryption: { status: 'healthy', configured: false },
      presidio: { status: 'healthy', configured: false },
    },
    summary: {
      healthy: 0,
      degraded: 0,
      error: 0,
      total: 7,
    },
  };

  // 1. Check Database (PostgreSQL)
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: 'healthy',
      configured: true,
      details: {
        provider: 'postgresql',
        connected: true,
      },
    };
  } catch (error: any) {
    health.services.database = {
      status: 'error',
      configured: !!process.env.DATABASE_URL,
      message: `Database connection failed: ${error.message}`,
    };
  }

  // 2. Check Storage (S3/R2/DigitalOcean Spaces)
  const storageConfig = {
    endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
    bucket: process.env.R2_BUCKET || process.env.S3_BUCKET,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  };

  const storageConfigured = !!(storageConfig.accessKeyId && storageConfig.secretAccessKey && storageConfig.bucket);

  if (storageConfigured) {
    health.services.storage = {
      status: 'healthy',
      configured: true,
      details: {
        provider: storageConfig.endpoint?.includes('digitaloceanspaces.com') ? 'DigitalOcean Spaces' :
                  storageConfig.endpoint?.includes('r2.cloudflarestorage.com') ? 'Cloudflare R2' : 'AWS S3',
        bucket: storageConfig.bucket,
      },
    };
  } else {
    health.services.storage = {
      status: 'error',
      configured: false,
      message: 'Storage credentials not configured',
    };
  }

  // 3. Check Deepgram
  if (process.env.DEEPGRAM_API_KEY) {
    health.services.deepgram = {
      status: 'healthy',
      configured: true,
      details: {
        models: ['nova-2'],
        languages: ['pt', 'es', 'en'],
      },
    };
  } else {
    health.services.deepgram = {
      status: 'error',
      configured: false,
      message: 'DEEPGRAM_API_KEY not configured',
    };
  }

  // 4. Check Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    health.services.anthropic = {
      status: 'healthy',
      configured: true,
      details: {
        model: 'claude-sonnet-4-20250514',
      },
    };
  } else {
    health.services.anthropic = {
      status: 'error',
      configured: false,
      message: 'ANTHROPIC_API_KEY not configured',
    };
  }

  // 5. Check Sentry
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    health.services.sentry = {
      status: 'healthy',
      configured: true,
      details: {
        environment: process.env.NODE_ENV,
        enabled: true,
      },
    };
  } else {
    health.services.sentry = {
      status: 'degraded',
      configured: false,
      message: 'Sentry not configured (error tracking disabled)',
    };
  }

  // 6. Check Encryption
  if (process.env.ENCRYPTION_KEY) {
    const keyLength = process.env.ENCRYPTION_KEY.length;
    if (keyLength === 64) {
      health.services.encryption = {
        status: 'healthy',
        configured: true,
        details: {
          algorithm: 'AES-256-GCM',
          keyLength: '256-bit',
        },
      };
    } else {
      health.services.encryption = {
        status: 'error',
        configured: false,
        message: `ENCRYPTION_KEY invalid length: ${keyLength} (expected 64 hex characters)`,
      };
    }
  } else {
    health.services.encryption = {
      status: 'error',
      configured: false,
      message: 'ENCRYPTION_KEY not configured',
    };
  }

  // 7. Check Presidio (PII/PHI de-identification)
  try {
    const analyzerBase = process.env.PRESIDIO_ANALYZER_URL || 'http://localhost:5001';
    const anonymizerBase = process.env.PRESIDIO_ANONYMIZER_URL || 'http://localhost:5002';
    const timeoutMs = Number(process.env.PRESIDIO_TIMEOUT_MS || 8000);

    const [analyzer, anonymizer] = await Promise.all([
      checkUrl(`${analyzerBase}/health`, timeoutMs),
      checkUrl(`${anonymizerBase}/health`, timeoutMs),
    ]);

    const ok = analyzer.ok && anonymizer.ok;
    health.services.presidio = {
      status: ok ? 'healthy' : 'error',
      configured: true,
      details: {
        analyzer: { baseUrl: analyzerBase, ...analyzer },
        anonymizer: { baseUrl: anonymizerBase, ...anonymizer },
      },
      ...(ok ? null : { message: 'Presidio not reachable' }),
    };
  } catch (e: any) {
    health.services.presidio = {
      status: 'error',
      configured: false,
      message: e?.message || 'Presidio check failed',
    };
  }

  // Calculate summary
  Object.values(health.services).forEach((service) => {
    if (service.status === 'healthy') {
      health.summary.healthy++;
    } else if (service.status === 'degraded') {
      health.summary.degraded++;
    } else {
      health.summary.error++;
    }
  });

  // Determine overall status
  if (health.summary.error > 0) {
    health.status = 'error';
  } else if (health.summary.degraded > 0) {
    health.status = 'degraded';
  }

  const responseTime = Date.now() - startTime;

  // Add performance metrics
  const response = {
    ...health,
    performance: {
      responseTimeMs: responseTime,
      serverTime: new Date().toISOString(),
    },
    version: {
      app: '0.1.0',
      node: process.version,
      environment: process.env.NODE_ENV,
    },
  };

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 : 500;

  return NextResponse.json(response, { status: statusCode });
}
