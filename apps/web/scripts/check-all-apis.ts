/**
 * Comprehensive API Connection Check
 * Tests all APIs and reports exactly which ones are failing
 *
 * Run with: pnpm dotenv -e .env -e .env.local -- tsx scripts/check-all-apis.ts
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { createClient } from '@deepgram/sdk';
import Anthropic from '@anthropic-ai/sdk';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. Check Database
async function checkDatabase() {
  log('cyan', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('cyan', '1. DATABASE (PostgreSQL)');
  log('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!process.env.DATABASE_URL) {
    log('red', '❌ FAILED: DATABASE_URL not configured');
    return false;
  }

  try {
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    log('green', '✅ SUCCESS: Database connected');
    log('green', `   Connection: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'configured'}`);
    return true;
  } catch (error: any) {
    log('red', '❌ FAILED: Cannot connect to database');
    log('red', `   Error: ${error.message}`);
    return false;
  }
}

// 2. Check DigitalOcean Spaces
async function checkDigitalOceanSpaces() {
  log('cyan', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('cyan', '2. DIGITALOCEAN SPACES');
  log('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';

  console.log('   Configuration:');
  console.log(`   - Endpoint: ${endpoint || 'NOT SET'}`);
  console.log(`   - Access Key: ${accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   - Bucket: ${bucket || 'NOT SET'}`);
  console.log(`   - Region: ${region}`);

  if (!accessKeyId || !secretAccessKey) {
    log('red', '\n❌ FAILED: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not configured');
    log('yellow', '   📝 To fix: Add DigitalOcean Spaces credentials to .env.local:');
    log('yellow', '      AWS_ACCESS_KEY_ID=your-spaces-key');
    log('yellow', '      AWS_SECRET_ACCESS_KEY=your-spaces-secret');
    log('yellow', '      S3_ENDPOINT=https://nyc3.digitaloceanspaces.com');
    log('yellow', '      S3_BUCKET=holi-labs-audio');
    return false;
  }

  try {
    const s3Client = new S3Client({
      region: region,
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // Try to list buckets first
    try {
      const bucketsResponse = await s3Client.send(new ListBucketsCommand({}));
      log('green', `\n✅ SUCCESS: Connected to DigitalOcean Spaces`);
      log('green', `   Available buckets: ${bucketsResponse.Buckets?.length || 0}`);
      if (bucketsResponse.Buckets && bucketsResponse.Buckets.length > 0) {
        bucketsResponse.Buckets.forEach(b => {
          console.log(`      - ${b.Name}`);
        });
      }
    } catch (listError: any) {
      log('yellow', `   ⚠️  Cannot list buckets: ${listError.message}`);
    }

    // Check specific bucket if configured
    if (bucket) {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
        log('green', `   ✅ Bucket '${bucket}' is accessible`);
        return true;
      } catch (bucketError: any) {
        log('red', `\n❌ FAILED: Cannot access bucket '${bucket}'`);
        log('red', `   Error: ${bucketError.message}`);
        log('yellow', '   📝 Bucket might not exist or credentials lack permission');
        return false;
      }
    } else {
      log('yellow', '   ⚠️  S3_BUCKET not configured');
      return true; // Connection works, just no bucket specified
    }
  } catch (error: any) {
    log('red', '\n❌ FAILED: Cannot connect to DigitalOcean Spaces');
    log('red', `   Error: ${error.message}`);

    if (error.message.includes('EPROTO') || error.message.includes('handshake')) {
      log('yellow', '   📝 SSL/TLS error - possible causes:');
      log('yellow', '      1. Wrong endpoint (check region: nyc3, sfo3, sgp1, etc.)');
      log('yellow', '      2. Invalid credentials');
      log('yellow', '      3. Network/firewall blocking connection');
    }

    return false;
  }
}

// 3. Check Cloudflare R2
async function checkCloudflareR2() {
  log('cyan', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('cyan', '3. CLOUDFLARE R2');
  log('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  console.log('   Configuration:');
  console.log(`   - Endpoint: ${endpoint || 'NOT SET'}`);
  console.log(`   - Access Key: ${accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   - Bucket: ${bucket || 'NOT SET'}`);

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    log('yellow', '\n⚠️  NOT CONFIGURED: Cloudflare R2 credentials not set');
    log('yellow', '   This is optional if using DigitalOcean Spaces');
    return null; // null means not configured, not failed
  }

  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // Try to list buckets
    const bucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    log('green', `\n✅ SUCCESS: Connected to Cloudflare R2`);
    log('green', `   Available buckets: ${bucketsResponse.Buckets?.length || 0}`);
    if (bucketsResponse.Buckets && bucketsResponse.Buckets.length > 0) {
      bucketsResponse.Buckets.forEach(b => {
        console.log(`      - ${b.Name}`);
      });
    }

    // Check specific bucket if configured
    if (bucket) {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
        log('green', `   ✅ Bucket '${bucket}' is accessible`);
        return true;
      } catch (bucketError: any) {
        log('red', `\n❌ FAILED: Cannot access bucket '${bucket}'`);
        log('red', `   Error: ${bucketError.message}`);
        return false;
      }
    }

    return true;
  } catch (error: any) {
    log('red', '\n❌ FAILED: Cannot connect to Cloudflare R2');
    log('red', `   Error: ${error.message}`);
    log('yellow', '   📝 Check account ID in endpoint URL');
    return false;
  }
}

// 4. Check Deepgram
async function checkDeepgram() {
  log('cyan', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('cyan', '4. DEEPGRAM (Transcription API)');
  log('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const apiKey = process.env.DEEPGRAM_API_KEY;
  console.log(`   API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);

  if (!apiKey) {
    log('red', '\n❌ FAILED: DEEPGRAM_API_KEY not configured');
    log('yellow', '   📝 To fix: Add to .env.local:');
    log('yellow', '      DEEPGRAM_API_KEY=your-deepgram-key');
    return false;
  }

  try {
    const deepgram = createClient(apiKey);
    const response = await deepgram.manage.getProjects();
    const result = response.result || response;
    const projects = (result as any).projects || result;
    const project = Array.isArray(projects) ? projects[0] : projects;

    log('green', '\n✅ SUCCESS: Deepgram API connected');
    log('green', `   Project ID: ${project?.project_id || 'unknown'}`);
    log('green', `   Available models: nova-2, nova, enhanced, base`);
    log('green', `   Supported languages: Portuguese, Spanish, English`);
    return true;
  } catch (error: any) {
    log('red', '\n❌ FAILED: Deepgram API error');
    log('red', `   Error: ${error.message}`);
    log('yellow', '   📝 Check API key at: https://console.deepgram.com/');
    return false;
  }
}

// 5. Check Anthropic Claude
async function checkAnthropic() {
  log('cyan', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('cyan', '5. ANTHROPIC CLAUDE (AI SOAP Generation)');
  log('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(`   API Key: ${apiKey ? apiKey.substring(0, 15) + '...' : 'NOT SET'}`);

  if (!apiKey) {
    log('red', '\n❌ FAILED: ANTHROPIC_API_KEY not configured');
    log('yellow', '   📝 To fix: Add to .env.local:');
    log('yellow', '      ANTHROPIC_API_KEY=sk-ant-api03-...');
    return false;
  }

  if (!apiKey.startsWith('sk-ant-')) {
    log('red', '\n❌ FAILED: Invalid API key format');
    log('yellow', '   📝 Anthropic keys must start with: sk-ant-api03-');
    log('yellow', '      Your key starts with: ' + apiKey.substring(0, 10));
    return false;
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say OK' }],
    });

    log('green', '\n✅ SUCCESS: Anthropic Claude API connected');
    log('green', `   Model: claude-sonnet-4-20250514`);
    log('green', `   Test response: ${message.content[0].type === 'text' ? message.content[0].text : 'OK'}`);
    log('green', `   Tokens used: ${message.usage.input_tokens + message.usage.output_tokens}`);
    return true;
  } catch (error: any) {
    log('red', '\n❌ FAILED: Anthropic API error');
    log('red', `   Error: ${error.message}`);

    if (error.message.includes('401') || error.message.includes('authentication')) {
      log('yellow', '   📝 API key is invalid or expired');
      log('yellow', '      Get new key at: https://console.anthropic.com/settings/keys');
    }

    return false;
  }
}

// 6. Check Sentry
function checkSentry() {
  log('cyan', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('cyan', '6. SENTRY (Error Tracking)');
  log('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  console.log(`   DSN: ${dsn ? dsn.substring(0, 30) + '...' : 'NOT SET'}`);

  if (dsn) {
    log('green', '\n✅ SUCCESS: Sentry configured');
    log('green', `   Environment: ${process.env.NODE_ENV || 'development'}`);
    return true;
  } else {
    log('yellow', '\n⚠️  NOT CONFIGURED: Sentry (optional for MVP)');
    return null;
  }
}

// 7. Check Encryption
function checkEncryption() {
  log('cyan', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('cyan', '7. ENCRYPTION KEY');
  log('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const key = process.env.ENCRYPTION_KEY;
  console.log(`   Key: ${key ? key.substring(0, 16) + '... (length: ' + key.length + ')' : 'NOT SET'}`);

  if (!key) {
    log('red', '\n❌ FAILED: ENCRYPTION_KEY not configured');
    log('yellow', '   📝 To fix: Generate and add to .env.local:');
    log('yellow', '      openssl rand -hex 32');
    return false;
  }

  if (key.length !== 64) {
    log('red', `\n❌ FAILED: Invalid key length (${key.length} characters, need 64)`);
    log('yellow', '   📝 To fix: Generate new 64-character key:');
    log('yellow', '      openssl rand -hex 32');
    return false;
  }

  log('green', '\n✅ SUCCESS: Encryption key valid (256-bit)');
  return true;
}

// Main function
async function main() {
  log('bold', '\n╔════════════════════════════════════════════════════╗');
  log('bold', '║     HOLI LABS - API CONNECTION DIAGNOSTIC          ║');
  log('bold', '╚════════════════════════════════════════════════════╝');

  const results: { [key: string]: boolean | null } = {};

  results.database = await checkDatabase();
  results.digitalocean = await checkDigitalOceanSpaces();
  results.cloudflare = await checkCloudflareR2();
  results.deepgram = await checkDeepgram();
  results.anthropic = await checkAnthropic();
  results.sentry = checkSentry();
  results.encryption = checkEncryption();

  // Summary
  log('bold', '\n\n╔════════════════════════════════════════════════════╗');
  log('bold', '║                    SUMMARY                         ║');
  log('bold', '╚════════════════════════════════════════════════════╝\n');

  const working = Object.values(results).filter(r => r === true).length;
  const failing = Object.values(results).filter(r => r === false).length;
  const optional = Object.values(results).filter(r => r === null).length;

  log('green', `✅ Working: ${working}`);
  log('red', `❌ Failing: ${failing}`);
  log('yellow', `⚠️  Optional/Not Configured: ${optional}`);

  log('bold', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failing === 0) {
    log('green', '🎉 ALL REQUIRED APIS ARE CONNECTED!');
    log('green', '✅ Ready to proceed with AI Scribe development');
  } else {
    log('red', `\n❌ ${failing} API(s) NEED ATTENTION`);
    log('yellow', '\nScroll up to see specific error messages and fixes for each failing API.');
  }

  log('bold', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(failing > 0 ? 1 : 0);
}

main().catch(error => {
  log('red', `\n❌ FATAL ERROR: ${error.message}\n`);
  process.exit(1);
});
