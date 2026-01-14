/**
 * Deepgram Health Check Endpoint
 *
 * GET /api/health/deepgram - Validate Deepgram API configuration
 */

import { NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json({
        status: 'error',
        service: 'deepgram',
        message: 'DEEPGRAM_API_KEY not configured',
        configured: false,
      }, { status: 500 });
    }

    // Initialize Deepgram client
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // Key fingerprint (dev only) to help reconcile env mismatches without revealing the key
    const keyFingerprint =
      process.env.NODE_ENV === 'development'
        ? createHash('sha256').update(process.env.DEEPGRAM_API_KEY).digest('hex').slice(0, 8)
        : undefined;

    // Test API connection by getting account balance/projects
    const startTime = Date.now();

    let projectInfo: any;
    try {
      const response = await deepgram.manage.getProjects();
      const result = response.result || response;
      projectInfo = (result as any).projects || result;
    } catch (apiError: any) {
      return NextResponse.json({
        status: 'error',
        service: 'deepgram',
        message: `API key invalid or network error: ${apiError.message}`,
        configured: true,
        connected: false,
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;

    // Get first project details
    const project = Array.isArray(projectInfo) ? projectInfo[0] : projectInfo;

    return NextResponse.json({
      status: 'healthy',
      service: 'deepgram',
      configured: true,
      connected: true,
      responseTimeMs: responseTime,
      ...(keyFingerprint ? { keyFingerprint } : {}),
      project: {
        id: project?.project_id || 'unknown',
        name: project?.name || 'unknown',
      },
      models: ['nova-2', 'nova', 'enhanced', 'base'],
      languages: ['pt', 'es', 'en'],
      features: {
        realtime: true,
        prerecorded: true,
        diarization: true,
        punctuation: true,
        smartFormat: true,
      },
    });
  } catch (error: any) {
    console.error('Deepgram health check error:', error);
    return NextResponse.json({
      status: 'error',
      service: 'deepgram',
      message: error.message || 'Unknown error',
      configured: !!process.env.DEEPGRAM_API_KEY,
      connected: false,
    }, { status: 500 });
  }
}
