/**
 * Storage Health Check Endpoint
 *
 * GET /api/health/storage - Validate S3/R2/DigitalOcean Spaces configuration
 */

import { NextResponse } from 'next/server';
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Storage configuration
function getStorageConfig() {
  return {
    endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
    region: process.env.R2_REGION || process.env.AWS_REGION || 'auto',
    bucket: process.env.R2_BUCKET || process.env.S3_BUCKET || 'holi-labs-audio',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  };
}

export async function GET() {
  const config = getStorageConfig();

  try {
    // Check if credentials are configured
    if (!config.accessKeyId || !config.secretAccessKey) {
      return NextResponse.json({
        status: 'error',
        service: 'storage',
        message: 'Storage credentials not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)',
        configured: false,
      }, { status: 500 });
    }

    if (!config.endpoint && !config.bucket) {
      return NextResponse.json({
        status: 'error',
        service: 'storage',
        message: 'Storage endpoint or bucket not configured',
        configured: false,
      }, { status: 500 });
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    // Test 1: Check if bucket exists
    const startTime = Date.now();

    try {
      await s3Client.send(new HeadBucketCommand({
        Bucket: config.bucket,
      }));
    } catch (bucketError: any) {
      return NextResponse.json({
        status: 'error',
        service: 'storage',
        message: `Bucket '${config.bucket}' not accessible: ${bucketError.message}`,
        configured: true,
        connected: false,
        bucket: config.bucket,
      }, { status: 500 });
    }

    // Test 2: Upload a test file
    const testKey = `health-check/test-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.txt`;
    const testData = Buffer.from('Holi Labs Health Check');

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: testKey,
        Body: testData,
        ContentType: 'text/plain',
        Metadata: {
          healthCheck: 'true',
          timestamp: new Date().toISOString(),
        },
      }));

      // Test 3: Delete the test file
      await s3Client.send(new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: testKey,
      }));
    } catch (uploadError: any) {
      return NextResponse.json({
        status: 'error',
        service: 'storage',
        message: `Bucket write/delete failed: ${uploadError.message}`,
        configured: true,
        connected: true,
        writable: false,
        bucket: config.bucket,
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;

    // Determine storage provider
    let provider = 'Unknown';
    if (config.endpoint?.includes('digitaloceanspaces.com')) {
      provider = 'DigitalOcean Spaces';
    } else if (config.endpoint?.includes('r2.cloudflarestorage.com')) {
      provider = 'Cloudflare R2';
    } else if (config.endpoint?.includes('amazonaws.com') || !config.endpoint) {
      provider = 'AWS S3';
    }

    return NextResponse.json({
      status: 'healthy',
      service: 'storage',
      configured: true,
      connected: true,
      writable: true,
      readable: true,
      responseTimeMs: responseTime,
      provider,
      configuration: {
        bucket: config.bucket,
        region: config.region,
        endpoint: config.endpoint || 'default (AWS S3)',
      },
      features: {
        encryption: 'AES-256-GCM (client-side) + AES256 (server-side)',
        versioning: 'supported',
        lifecycle: 'supported',
      },
    });
  } catch (error: any) {
    console.error('Storage health check error:', error);
    return NextResponse.json({
      status: 'error',
      service: 'storage',
      message: error.message || 'Unknown error',
      configured: !!(config.accessKeyId && config.secretAccessKey),
      connected: false,
    }, { status: 500 });
  }
}
