/**
 * Anthropic Health Check Endpoint
 *
 * GET /api/health/anthropic - Validate Anthropic Claude API configuration
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        status: 'error',
        service: 'anthropic',
        message: 'ANTHROPIC_API_KEY not configured',
        configured: false,
      }, { status: 500 });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Test API connection with minimal message
    const startTime = Date.now();

    let testMessage: any;
    try {
      testMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Say "OK"',
          },
        ],
      });
    } catch (apiError: any) {
      return NextResponse.json({
        status: 'error',
        service: 'anthropic',
        message: `API key invalid or network error: ${apiError.message}`,
        configured: true,
        connected: false,
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      service: 'anthropic',
      configured: true,
      connected: true,
      responseTimeMs: responseTime,
      models: {
        primary: 'claude-sonnet-4-20250514',
        available: [
          'claude-sonnet-4-20250514',
          'claude-3-5-sonnet-20241022',
          'claude-opus-4-20250514',
        ],
      },
      testResponse: {
        id: testMessage.id,
        model: testMessage.model,
        tokensUsed: testMessage.usage.input_tokens + testMessage.usage.output_tokens,
      },
      features: {
        streaming: true,
        jsonMode: true,
        longContext: true,
        maxTokens: 200000,
      },
    });
  } catch (error: any) {
    console.error('Anthropic health check error:', error);
    return NextResponse.json({
      status: 'error',
      service: 'anthropic',
      message: error.message || 'Unknown error',
      configured: !!process.env.ANTHROPIC_API_KEY,
      connected: false,
    }, { status: 500 });
  }
}
