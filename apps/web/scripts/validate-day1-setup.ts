/**
 * Day 1 Setup Validation Script
 *
 * Validates that all critical services are configured and accessible:
 * 1. Database (PostgreSQL)
 * 2. Storage (S3/R2/DigitalOcean Spaces)
 * 3. Deepgram (Transcription)
 * 4. Anthropic Claude (SOAP Generation)
 * 5. Sentry (Error Tracking)
 * 6. Encryption (AES-256-GCM)
 *
 * Run: tsx scripts/validate-day1-setup.ts
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@deepgram/sdk';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface ServiceResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

const results: ServiceResult[] = [];

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(result: ServiceResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
  const color = result.status === 'pass' ? 'green' : result.status === 'warn' ? 'yellow' : 'red';
  log(color, `${icon} ${result.name}: ${result.message}`);
  if (result.details) {
    console.log('   ', JSON.stringify(result.details, null, 2));
  }
}

// 1. Test Database
async function testDatabase(): Promise<ServiceResult> {
  try {
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    return {
      name: 'Database (PostgreSQL)',
      status: 'pass',
      message: 'Connected successfully',
      details: { provider: 'postgresql' },
    };
  } catch (error: any) {
    return {
      name: 'Database (PostgreSQL)',
      status: 'fail',
      message: `Connection failed: ${error.message}`,
    };
  }
}

// 2. Test Storage
async function testStorage(): Promise<ServiceResult> {
  const config = {
    endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
    region: process.env.R2_REGION || process.env.AWS_REGION || 'auto',
    bucket: process.env.R2_BUCKET || process.env.S3_BUCKET || 'holi-labs-audio',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  };

  if (!config.accessKeyId || !config.secretAccessKey) {
    return {
      name: 'Storage (S3/R2/DigitalOcean Spaces)',
      status: 'fail',
      message: 'Credentials not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)',
    };
  }

  try {
    const s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    // Test bucket access
    await s3Client.send(new HeadBucketCommand({ Bucket: config.bucket }));

    // Test write/delete
    const testKey = `health-check/test-${Date.now()}.txt`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: testKey,
      Body: Buffer.from('Holi Labs Health Check'),
    }));

    await s3Client.send(new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: testKey,
    }));

    const provider = config.endpoint?.includes('digitaloceanspaces.com') ? 'DigitalOcean Spaces' :
                      config.endpoint?.includes('r2.cloudflarestorage.com') ? 'Cloudflare R2' : 'AWS S3';

    return {
      name: 'Storage (S3/R2/DigitalOcean Spaces)',
      status: 'pass',
      message: 'Connected, readable, and writable',
      details: { provider, bucket: config.bucket },
    };
  } catch (error: any) {
    return {
      name: 'Storage (S3/R2/DigitalOcean Spaces)',
      status: 'fail',
      message: `Connection or access failed: ${error.message}`,
    };
  }
}

// 3. Test Deepgram
async function testDeepgram(): Promise<ServiceResult> {
  if (!process.env.DEEPGRAM_API_KEY) {
    return {
      name: 'Deepgram (Transcription)',
      status: 'fail',
      message: 'DEEPGRAM_API_KEY not configured',
    };
  }

  try {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const response = await deepgram.manage.getProjects();
    const result = response.result || response;
    const projects = (result as any).projects || result;
    const project = Array.isArray(projects) ? projects[0] : projects;

    return {
      name: 'Deepgram (Transcription)',
      status: 'pass',
      message: 'API key valid, project accessible',
      details: {
        projectId: project?.project_id || 'unknown',
        models: ['nova-2'],
        languages: ['pt', 'es', 'en'],
      },
    };
  } catch (error: any) {
    return {
      name: 'Deepgram (Transcription)',
      status: 'fail',
      message: `API key invalid or network error: ${error.message}`,
    };
  }
}

// 4. Test Anthropic
async function testAnthropic(): Promise<ServiceResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      name: 'Anthropic Claude (SOAP Generation)',
      status: 'fail',
      message: 'ANTHROPIC_API_KEY not configured',
    };
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "OK"' }],
    });

    return {
      name: 'Anthropic Claude (SOAP Generation)',
      status: 'pass',
      message: 'API key valid, model accessible',
      details: {
        model: 'claude-sonnet-4-20250514',
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      },
    };
  } catch (error: any) {
    return {
      name: 'Anthropic Claude (SOAP Generation)',
      status: 'fail',
      message: `API key invalid or network error: ${error.message}`,
    };
  }
}

// 5. Test Sentry
function testSentry(): ServiceResult {
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return {
      name: 'Sentry (Error Tracking)',
      status: 'pass',
      message: 'Configured and enabled',
      details: { environment: process.env.NODE_ENV },
    };
  } else {
    return {
      name: 'Sentry (Error Tracking)',
      status: 'warn',
      message: 'Not configured (error tracking disabled) - Optional for MVP',
    };
  }
}

// 6. Test Encryption
function testEncryption(): ServiceResult {
  if (!process.env.ENCRYPTION_KEY) {
    return {
      name: 'Encryption (AES-256-GCM)',
      status: 'fail',
      message: 'ENCRYPTION_KEY not configured',
    };
  }

  const keyLength = process.env.ENCRYPTION_KEY.length;
  if (keyLength !== 64) {
    return {
      name: 'Encryption (AES-256-GCM)',
      status: 'fail',
      message: `Invalid key length: ${keyLength} (expected 64 hex characters)`,
    };
  }

  // Test encryption/decryption
  try {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const testData = 'Holi Labs Health Check';
    let encrypted = cipher.update(testData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (decrypted === testData) {
      return {
        name: 'Encryption (AES-256-GCM)',
        status: 'pass',
        message: 'Encryption key valid, encrypt/decrypt works',
        details: { algorithm: 'AES-256-GCM', keyLength: '256-bit' },
      };
    } else {
      return {
        name: 'Encryption (AES-256-GCM)',
        status: 'fail',
        message: 'Encryption/decryption test failed',
      };
    }
  } catch (error: any) {
    return {
      name: 'Encryption (AES-256-GCM)',
      status: 'fail',
      message: `Encryption test failed: ${error.message}`,
    };
  }
}

// Main validation function
async function main() {
  log('cyan', '\n========================================');
  log('cyan', '   Day 1 Setup Validation');
  log('cyan', '   Holi Labs AI Scribe MVP');
  log('cyan', '========================================\n');

  log('blue', '🔍 Testing critical services...\n');

  // Run all tests
  results.push(await testDatabase());
  results.push(await testStorage());
  results.push(await testDeepgram());
  results.push(await testAnthropic());
  results.push(testSentry());
  results.push(testEncryption());

  // Display results
  log('blue', '\n📊 Validation Results:\n');
  results.forEach(logResult);

  // Summary
  const passCount = results.filter(r => r.status === 'pass').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  log('blue', '\n========================================');
  log('blue', `   Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  log('blue', '========================================\n');

  if (failCount === 0 && warnCount <= 1) {
    log('green', '✅ Day 1 Setup Complete! All critical services configured.\n');
    log('green', '🚀 Ready for Day 2-3: Implement missing API routes\n');
    process.exit(0);
  } else if (failCount === 0) {
    log('yellow', '⚠️  Day 1 Setup mostly complete with some warnings.\n');
    log('yellow', '   Review warnings above and fix if needed.\n');
    process.exit(0);
  } else {
    log('red', '❌ Day 1 Setup Incomplete! Fix failed services above.\n');
    process.exit(1);
  }
}

main().catch((error) => {
  log('red', `\n❌ Fatal error: ${error.message}\n`);
  process.exit(1);
});
